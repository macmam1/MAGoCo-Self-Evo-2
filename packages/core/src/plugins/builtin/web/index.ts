import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
/**
 * The built-in `web` plugin, as discovered and loaded by PluginLoader.
 *
 * Core owns the capability def (the stable contract); this module registers
 * it and binds the provider to the real server from @magoco/web. Core
 * therefore never imports a socket, and @magoco/web never owns the contract.
 *
 * This is also where the UI meets the agent core: a `create` command builds a
 * real session backed by runLoop + LlmRouter, so a message typed in the
 * browser reaches an actual model. That is what makes Phase 2 a product
 * instead of a shell.
 */
import { webServeDef, WEB_SERVE_CAPABILITY } from '../../../capabilities/web.js';
import type {
  PluginManifest,
  PluginModule,
  PluginRegisterContext,
} from '../../loader.js';
import { serve, createSession, type ChatSession } from '@magoco/web';
import { runLoop, ScriptedProvider, OpenAiProvider } from '@magoco/agents';
import type { ToolInvoker, ToolInvokeOutput, LlmRequest, LlmResponse } from '@magoco/agents';

export const manifest: PluginManifest = {
  name: 'web',
  version: '0.1.0',
  description: 'Serves the MAGoCo browser UI and streams chat sessions to it.',
  provides: [WEB_SERVE_CAPABILITY],
  consumes: [],
};

export function register(ctx: PluginRegisterContext): void {
  ctx.registry.registerDef(webServeDef);

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
  const hasLLM = baseUrl && apiKey;
  const provider = hasLLM
    ? new OpenAiProvider({ baseUrl, apiKey, model: modelId })
    : new ScriptedProvider('web.unconfigured', [{ reply: { text: 'No LLM endpoint is configured. Set baseUrl and apiKey in the `web` profile (or MAGOCO_BASE_URL / MAGOCO_API_KEY), then ask again. This is a scripted stand-in, not a model.' } }]);

  // Tools: the UI can call any capability the registry has a provider for.
  const tools: ToolInvoker = async (input) => {
    // The registry holds providers keyed by capability id; a tool call names
    // the capability it wants. Unknown names and bad args become a structured
    // error the model can correct, never a crash.
    try {
      const out = ctx.registry.resolve(input.capability);
      const fn = (out as { run?: (a: unknown) => unknown } | ((a: unknown) => unknown)) as
        | { run?: (a: unknown) => unknown }
        | ((a: unknown) => unknown);
      const call = typeof fn === 'function' ? fn : fn.run;
      if (typeof call !== 'function') throw new Error(`capability ${input.capability} has no run()`);
      const result = await call(input.arguments);
      return { ok: true, result: typeof result === 'string' ? result : JSON.stringify(result) } as ToolInvokeOutput;
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
    async start(): Promise<unknown> {
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

      // Sessions, keyed by id. The browser sends `create` first, then `send`.
      const sessions = new Map<string, ChatSession>();
      let counter = 0;

      const handle = await serve({
        staticDir,
        noCache: true,
        port: cfg.port ?? 3837,
        onCommand: (cmd, reply) => {
          switch (cmd.c) {
            case 'create': {
              counter += 1;
              const id = `s${counter}`;
              const title = `Session ${counter}`;
              let tokenSeq = 0;
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
                  // We drive it here and stream the assembled answer back.
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
                    reply({ t: 'session_tool_call', sessionId: id, call: { id: tc.call.id, capability: tc.call.capability, args: tc.call.arguments } });
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
                  const out = await tools({ capability: call.capability, arguments: JSON.stringify(call.args ?? {}), agentId: 'web', sessionId: id, turn: 1 });
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
              // Export stays server-side here; the browser builds the
              // download from the same event log (T-W5 tests the format).
              const body = cmd.format === 'json'
                ? JSON.stringify({ sessionId: session.id, title: session.title, modelId: session.getModel(), messages: session.messages() }, null, 2)
                : [`# ${session.title}`, '', ...session.messages().flatMap((m) => [`## ${m.role}`, '', m.content, ''])].join('\n');
              reply({ t: 'session_export', sessionId: session.id, format: cmd.format, body });
              return;
            }
            default:
              reply({ t: 'error', message: `command not implemented: ${(cmd as { c: string }).c}` });
          }
        },
      });
      return handle;
    },
  });
}

/** The UI talks to one session at a time; the first one is the current one. */
function sessionIdFrom(sessions: Map<string, ChatSession>): string | undefined {
  return [...sessions.keys()].pop();
}

export default { manifest, register } satisfies PluginModule;
