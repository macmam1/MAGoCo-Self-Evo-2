import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
/**
 * The built-in `web` plugin, as discovered and loaded by PluginLoader.
 *
 * Core owns the capability def (the stable contract); this module registers
 * it and binds the provider to the real server from @magoco/web. Core
 * therefore never imports a socket, and @magoco/web never owns the contract.
 */
import { webServeDef, WEB_SERVE_CAPABILITY } from '../../../capabilities/web.js';
import type {
  PluginManifest,
  PluginModule,
  PluginRegisterContext,
} from '../../loader.js';
import { serve } from '@magoco/web';

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
      const handle = await serve({
        staticDir,
        noCache: true,
        port: cfg.port ?? 3837,
        onCommand: (cmd, reply) => {
          switch (cmd.c) {
            case 'create':
              reply({ t: 'hello', sessionId: null, version: 1 });
              return;
            case 'send':
              reply({ t: 'error', message: 'no session wired yet' });
              return;
            default:
              reply({ t: 'error', message: `command not implemented: ${cmd.c}` });
          }
        },
      });
      return handle;
    },
  });
}

export default { manifest, register } satisfies PluginModule;
