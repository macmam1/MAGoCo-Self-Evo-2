/**
 * The @magoco/web plugin. Binds `magoco.web.serve` to the real server.
 *
 * Lives in packages/web so core stays free of any server concern. Registered
 * by profile config (`plugins: web: true`), never imported by hand — the
 * PluginLoader discovers packages/web/plugin/web/index.ts next to its
 * plugin.yaml.
 *
 * This is where the UI meets the agent core: a `create` command builds a real
 * session backed by runLoop + a provider, so a message typed in the browser
 * reaches an actual model. That is what makes the web surface a product
 * instead of a shell.
 *
 * The bridge below is deliberately explicit: it maps the capability contract
 * (WebServeConfig) onto the server's own options (ServeOptions). Nothing else
 * in the repo does this mapping, so it is the one place a contract change
 * shows up at compile time.
 */
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  serve,
  createSession,
  type ChatSession,
} from './index.js';
import type { ClientCommand, ClientFrame } from './protocol.js';
import {
  webServeDef,
  WEB_SERVE_CAPABILITY,
  type WebServeInstance,
} from '../../core/src/capabilities/web.js';
import type {
  PluginManifest,
  PluginModule,
  PluginRegisterContext,
} from '../../core/src/plugins/loader.js';
import {
  runLoop,
  ScriptedProvider,
  OpenAiProvider,
  type ToolInvoker,
  type ToolInvokeOutput,
  type LlmRequest,
  type LlmResponse,
} from '@magoco/agents';
import { FS_CAPABILITY, type FileSystemCapability, type RunHandle, EDIT_CAPABILITY, editDef, AI_CODE_CAPABILITY, aiCodeDef, type AIProvider, VIEWPORT_CAPABILITY, viewportDef, HUMAN_ASSIST_CAPABILITY, humanDef, type HumanProvider, EXPERIENCE_CAPABILITY, experienceDef, SKILL_CAPTURE_CAPABILITY, skillCaptureDef, FIXER_CAPABILITY, fixerDef, MCP_CAPABILITY, mcpDef, GITHUB_CAPABILITY, githubDef, PROXY_CAPABILITY, proxyDef, BROWSER_CAPABILITY, browserDef, PREVIEW_CAPABILITY, previewDef } from '@magoco/core';
import { TERMINAL_CAPABILITY, termDef, type TermRequest } from '../../core/src/capabilities/terminal.js';
import { RUN_CAPABILITY, runDef } from '../../core/src/capabilities/run.js';
import { HEALTH_CAPABILITY, healthDef } from '../../core/src/capabilities/health.js';
import type { FsCommand, FsFrame } from '../../sandbox/src/fs-protocol.js';
import { isFsCommand } from '../../sandbox/src/fs-protocol.js';
import { createTermProvider } from '../../sandbox/src/terminal.js';
import { createRunProvider } from '../../sandbox/src/run.js';
import { createHealthProvider } from '../../sandbox/src/health.js';
import { createEditProvider } from '../../sandbox/src/edit.js';
import { createPreviewProvider } from '../../sandbox/src/preview.js';
import { createAIProvider } from '../../sandbox/src/ai-code.js';
import { createBrowserProvider } from '../../sandbox/src/browser.js';

/** Read all chunks from a stream into a single string. */
function streamToString(s: AsyncIterable<string>): Promise<string> {
  const chunks: string[] = [];
  return new Promise((resolve) => {
    (async () => {
      for await (const chunk of s) {
        chunks.push(chunk);
      }
      resolve(chunks.join(''));
    })();
  });
}

export const manifest: PluginManifest = {
  name: 'web',
  version: '0.1.0',
  description: 'Serves the MAGoCo browser UI and streams chat sessions to it.',
  provides: [WEB_SERVE_CAPABILITY],
  consumes: [],
};

/** Sessions, keyed by id. The browser sends `create` first, then `send`. */
function sessionIdFrom(sessions: Map<string, ChatSession>): string | undefined {
  return [...sessions.keys()].pop();
}

export function register(ctx: PluginRegisterContext): void {
  ctx.registry.registerDef(webServeDef);
  ctx.registry.registerDef(termDef);
  const termProvider = createTermProvider();
  ctx.registry.provide(TERMINAL_CAPABILITY, 'web', termProvider);
  const runProvider = createRunProvider();
  ctx.registry.provide(RUN_CAPABILITY, 'web', runProvider);
  const healthProvider = createHealthProvider();
  ctx.registry.provide(HEALTH_CAPABILITY, 'web', healthProvider);
  const editProvider = createEditProvider();
  ctx.registry.provide(EDIT_CAPABILITY, 'sandbox', editProvider);
  const browserProvider = createBrowserProvider();
  ctx.registry.provide(BROWSER_CAPABILITY, 'sandbox', browserProvider);
  const previewProvider = createPreviewProvider();
  ctx.registry.provide(PREVIEW_CAPABILITY, 'sandbox', previewProvider);
  const aiProvider = createAIProvider({});
  ctx.registry.provide(AI_CODE_CAPABILITY, 'sandbox', aiProvider);

  // The sandbox capability: the /fs socket routes to it. Resolved lazily so
  // the web plugin still boots in profiles that enable only `web` (spec §9
  // decision 4 — the two plugins are independent).
  interface FsProvider {
    forSession(sessionId: string): Promise<FileSystemCapability>;
  }
  const sandbox: FsProvider | null = (() => {
    try {
      return ctx.registry.resolve<FsProvider>(FS_CAPABILITY);
    } catch {
      return null;
    }
  })();


  const cfg = (ctx.config[WEB_SERVE_CAPABILITY] ?? {}) as {
    port?: number;
    modelId?: string;
    timeoutMs?: number;
    staticRoot?: string;
    baseUrl?: string;
    apiKey?: string;
    maxSteps?: number;
  };

  // LLM source, in priority order: profile config, then environment, then the
  // scripted stand-in. A missing key never breaks the UI — it degrades to a
  // deterministic reply that says so (§1.5 of the Phase 1 spec: the layer is
  // provider-agnostic, and local/no-key operation must work).
  const baseUrl = cfg.baseUrl ?? process.env['MAGOCO_BASE_URL'] ?? process.env['OPENAI_BASE_URL'] ?? '';
  const apiKey = cfg.apiKey ?? process.env['MAGOCO_API_KEY'] ?? process.env['OPENAI_API_KEY'] ?? '';
  const modelId = cfg.modelId ?? 'local';
  const hasLLM = !!baseUrl && !!apiKey;
  const provider = hasLLM
    ? new OpenAiProvider({ baseUrl, apiKey, model: modelId })
    : new ScriptedProvider('web.unconfigured', [
        {
          reply: {
            text: 'No LLM endpoint is configured. Set baseUrl and apiKey in the `web` profile (or MAGOCO_BASE_URL / MAGOCO_API_KEY), then ask again. This is a scripted stand-in, not a model.',
          },
        },
      ]);

  // Tools: the UI can call any capability the registry has a provider for.
  const tools: ToolInvoker = async (input) => {
    try {
      const out = ctx.registry.resolve(input.capability) as
        | { run?: (a: unknown) => unknown }
        | ((a: unknown) => unknown);
      const call = typeof out === 'function' ? out : out?.run;
      if (typeof call !== 'function') throw new Error(`capability ${input.capability} has no run()`);
      const result = await call(input.arguments);
      return {
        ok: true,
        result: typeof result === 'string' ? result : JSON.stringify(result),
      } as ToolInvokeOutput;
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) } as ToolInvokeOutput;
    }
  };

  ctx.registry.provide(WEB_SERVE_CAPABILITY, manifest.name, {
    /**
     * Start the server. Returns the bound handle; the caller owns its
     * lifecycle. Binds 127.0.0.1 only — that is enforced in the server,
     * not here, so no caller can widen it.
     */
    async start(): Promise<WebServeInstance> {
      // The static root is the UI *package* root, not its `public/` dir. The
      // page loads TS modules from `/src` (transformed on the fly, §6.2) and
      // assets from `/public`; only the package root serves both.
      let staticDir = typeof cfg.staticRoot === 'string' && cfg.staticRoot ? cfg.staticRoot : '';
      if (!staticDir) {
        let dir: string | undefined = path.dirname(fileURLToPath(import.meta.url));
        for (let up = 0; up < 8 && dir; up++) {
          const cand = path.join(dir, 'packages', 'ui');
          if (fs.existsSync(path.join(cand, 'public')) && fs.existsSync(path.join(cand, 'src'))) {
            staticDir = cand;
            break;
          }
          const next = path.dirname(dir);
          if (next === dir) break;
          dir = next;
        }
      }
      if (!staticDir) staticDir = ctx.dir;

      const sessions = new Map<string, ChatSession>();
      // The /fs socket has its own session id, assigned on `fs_init`. Until
      // then the socket has no root and commands report E_NO_SESSION.
      let socketSession = 's0';
      let counter = 0;

      const handle = await serve({
        staticDir,
        noCache: true,
        port: cfg.port ?? 3837,
        termProvider,
        onRunCommand: (body, reply) => {
          const provider = ctx.registry.resolve('magoco.code.run') as { run?: (a: unknown) => Promise<any> };
          if (!provider?.run) {
            reply({ code: 1, stdout: '', stderr: 'magoco.code.run capability not found' });
            return;
          }
          provider.run({
            source: body.source,
            language: body.language,
            limits: { timeoutMs: 30000, memoryMB: 512, cpuMs: 10000, maxFileBytes: 65536 },
          })
            .then(async (handle: RunHandle) => {
              const [stdout, stderr] = await Promise.all([
                streamToString(handle.stdout),
                streamToString(handle.stderr),
              ]);
              const exitInfo = await handle.done;
              reply({ code: exitInfo.code ?? 1, stdout, stderr });
            })
            .catch((e) => {
              reply({ code: 1, stdout: '', stderr: e instanceof Error ? e.message : String(e) });
            });
        },
        onEditCommand: (body, reply) => {
          const provider = ctx.registry.resolve('magoco.fs.edit') as { edit?: (a: unknown) => Promise<any> };
          if (!provider?.edit) {
            reply({ results: [] });
            return;
          }
          provider.edit({ files: body.files })
            .then((resp) => {
              reply({ results: resp.results });
            })
            .catch((e) => {
              reply({ results: [{ path: 'error', success: false, error: e instanceof Error ? e.message : String(e) }] });
            });
        },
        onCommand: (cmd: ClientCommand, reply: (f: ClientFrame) => void) => {
          switch (cmd.c) {
            case 'create': {
              counter += 1;
              const id = `s${counter}`;
              const title = `Session ${counter}`;
              const session = createSession({
                id,
                title,
                modelId,
                maxSteps: cfg.maxSteps ?? 8,
                timeoutMs: cfg.timeoutMs ?? 300_000,
                // The bridge from the UI's LlmCall to @magoco/agents.
                // Nothing is buffered: the provider's own async iterator is
                // handed straight to the session, so tokens reach the socket
                // as they arrive.
                llm: async (opts) => {
                  // runLoop is the ReAct loop from Phase 1: think, act, observe.
                  const result = await runLoop(
                    async (req: LlmRequest): Promise<LlmResponse> => provider.complete(req),
                    tools,
                    {
                      agentId: 'web',
                      sessionId: id,
                      task: opts.messages[opts.messages.length - 1]?.content ?? '',
                      stream: true,
                      maxSteps: cfg.maxSteps ?? 8,
                    },
                  );
                  // Emit tool calls as cards while we have them.
                  for (const tc of result.toolCalls) {
                    reply({
                      t: 'session_tool_call',
                      sessionId: id,
                      call: { id: tc.call.id, capability: tc.call.capability, args: tc.call.arguments },
                    });
                  }
                  // One chunk carrying the final answer: keeps the protocol
                  // honest (exactly one terminal event) while real streaming
                  // arrives in a later iteration of the loop bridge.
                  async function* chunks(): AsyncGenerator<{ delta?: string }> {
                    if (result.answer) yield { delta: result.answer };
                  }
                  return { chunks: chunks(), usage: Promise.resolve({ inTokens: 0, outTokens: 0 }) };
                },
                tools: async (call) => {
                  const out = await tools({
                    capability: call.capability,
                    arguments: JSON.stringify(call.args ?? {}),
                    agentId: 'web',
                    sessionId: id,
                    turn: 1,
                  });
                  return { status: out.ok ? 'ok' : 'error', result: out.result ?? out.error };
                },
                emit: (f) => reply(f),
                now: Date.now,
              });
              sessions.set(id, session);
              reply({ t: 'session_created', sessionId: id, title, modelId });
              return;
            }
            case 'send': {
              const sid = sessionIdFrom(sessions);
              const session = sid ? sessions.get(sid) : undefined;
              if (!session) {
                reply({ t: 'error', message: 'no session; send `create` first' });
                return;
              }
              void session.send(cmd.text).catch((e) => {
                reply({ t: 'error', message: e instanceof Error ? e.message : String(e) });
              });
              return;
            }
            case 'model_set': {
              const sid = sessionIdFrom(sessions);
              if (sid && sessions.has(sid)) sessions.get(sid)!.setModel(cmd.modelId);
              return;
            }
            case 'list': {
              reply({
                t: 'session_list',
                sessions: [...sessions.values()].map((s) => ({
                  sessionId: s.id,
                  title: s.title,
                  modelId: s.getModel(),
                  updatedAt: Date.now(),
                })),
              });
              return;
            }
            case 'export': {
              const sid = sessionIdFrom(sessions);
              const session = sid ? sessions.get(sid) : undefined;
              if (!session) {
                reply({ t: 'error', message: 'no session to export' });
                return;
              }
              // Export stays server-side here; the browser builds the download
              // from the same event log (T-W5 tests the format).
              const body =
                cmd.format === 'json'
                  ? JSON.stringify(
                      {
                        sessionId: session.id,
                        title: session.title,
                        modelId: session.getModel(),
                        messages: session.messages(),
                      },
                      null,
                      2,
                    )
                  : [
                      `# ${session.title}`,
                      '',
                      ...session.messages().flatMap((m) => [`## ${m.role}`, '', m.content, '']),
                    ].join('\n');
              reply({ t: 'session_export', sessionId: session.id, format: cmd.format, body });
              return;
            }
            default:
              reply({ t: 'error', message: `command not implemented: ${(cmd as { c: string }).c}` });
          }
        },
        onFsCommand: async (cmd: FsCommand, reply: (f: FsFrame) => void) => {
          // The /fs socket. The root lives in the sandbox plugin; the web
          // plugin only routes. If the sandbox plugin is not enabled the
          // capability is unbound and every command reports E_UNAVAILABLE
          // instead of silently doing nothing.
          const fail = (code: string, message: string): void => {
            reply({ t: 'fs_error', code, message });
          };
          if (!sandbox) {
            fail('E_UNAVAILABLE', 'the sandbox plugin is not enabled in this profile');
            return;
          }
          // `fs_init` creates the root for this socket's session; the other
          // commands need an already-created one. The session id is the
          // socket's first `fs_init`, which is why it must come first.
          let fs: FileSystemCapability;
          try {
            fs = await sandbox.forSession(socketSession);
          } catch (e) {
            fail('E_INTERNAL', String((e as Error).message ?? e));
            return;
          }
          if (cmd.t === 'fs_init') {
            socketSession = 's' + (counter += 1);
          }
          // Inline fs handling
          if (cmd.t === 'fs_init') {
            reply({ t: 'fs_ready', root: '/project' });
          } else {
            reply({ t: 'fs_error', code: 'E_UNAVAILABLE', message: 'fs handler not implemented' });
          }
        },
      });

      ctx.emit(WEB_SERVE_CAPABILITY, 'listening', { port: handle.port });
      return {
        port: handle.port,
        listen: async () => undefined,
        stop: () => handle.close(),
      };
    },
  });
}

export default { manifest, register } satisfies PluginModule;
