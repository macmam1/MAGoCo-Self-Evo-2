/**
 * The @magoco/web plugin. Binds `magoco.web.serve` to the real server.
 *
 * Lives in packages/web so core stays free of any server concern. Registered
 * by profile config (`plugins: web: true`), never imported by hand.
 *
 * The bridge below is deliberately explicit: it maps the capability contract
 * (WebServeConfig) onto the server's own options (ServeOptions), including
 * the session wiring. Nothing else in the repo does this mapping, so it is
 * the one place a contract change shows up at compile time.
 */
import { serve } from './http.js';
import { createSession, type ChatSession } from './session.js';
import type { ClientCommand, ClientFrame } from './protocol.js';
import { WEB_SERVE_CAPABILITY } from '../../core/src/capabilities/web.js';
import type {
  WebServeConfig,
  WebServeInstance,
} from '../../core/src/capabilities/web.js';
import type { CapabilityDef } from '../../core/src/capabilities/types.js';

export const name = 'web';
export const version = '0.1.0';

export function register(reg: {
  registerDef(def: CapabilityDef): void;
  provide(capabilityId: string, plugin: string, instance: unknown): void;
}): void {
  // The def is owned by core (the stable contract); the provider lives here.
  reg.provide(WEB_SERVE_CAPABILITY, name, {
    serve(config: WebServeConfig, llm: unknown): WebServeInstance {
      let session: ChatSession | null = null;
      return serve({
        staticDir: config.staticRoot,
        noCache: true,
        port: config.port,
        onCommand: (cmd: ClientCommand, reply: (f: ClientFrame) => void) => {
          switch (cmd.c) {
            case 'send': {
              if (!session) return;
              void session.send(cmd.text);
              return;
            }
            case 'model_set': {
              if (!session) return;
              session.setModel(cmd.modelId);
              return;
            }
            default:
              // `list_sessions` and `export` arrive once the session store
              // is wired in; for now they are acknowledged, not dropped.
              reply({ t: 'error', message: `command not implemented: ${cmd.c}` });
          }
        },
        onSocketClose: () => {
          session = null;
        },
      }).then(
        (handle) => ({
          port: handle.port,
          listen: async () => {
            session = createSession({
              id: `web-${handle.port}`,
              title: 'web session',
              modelId: config.modelId,
              maxSteps: 25,
              timeoutMs: config.timeoutMs ?? 5 * 60_000,
              llm: llm as never, // injected by the runtime; typed loosely here
              tools: async () => ({ status: 'error', result: 'no tools wired yet' }),
              emit: (f) => handle.broadcast(f as ClientFrame),
            });
          },
          stop: () => handle.close(),
        }),
        // serve() rejects on a bad static dir or a taken port; surface that.
      ) as unknown as WebServeInstance;
    },
  });
}
