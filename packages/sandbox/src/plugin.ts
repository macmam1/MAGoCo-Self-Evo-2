/**
 * The @magoco/sandbox plugin.
 *
 * Registers `magoco.fs` (and, in later PRs, `magoco.code.run` and
 * `magoco.term.*`). Lives in packages/sandbox so core never imports a server
 * or a child-process concern — the same separation the web plugin uses.
 *
 * Discovered by the runtime via `packages/sandbox/plugin/sandbox/`, the same
 * `packages/<name>/plugin/<name>/` convention as packages/web.
 */

import {
  CODE_CAPABILITY,
  codeDef,
  FS_CAPABILITY,
  fsDef,
  type FileSystemCapability,
  type PluginManifest,
  type PluginRegisterContext,
  type CodeProvider,
  type RunLimits,
} from '../../core/src/index.js';
import { createFs, type FsConfig } from './fs.js';
import { runCode } from './runner.js';
import { resolveLimits as resolveRunLimits } from '../../core/src/index.js';

export const manifest: PluginManifest = {
  name: 'sandbox',
  version: '0.1.0',
  description:
    'Project filesystem, code execution and terminal — the magoco.fs / ' +
    'magoco.code / magoco.term capabilities.',
  provides: [FS_CAPABILITY, CODE_CAPABILITY],
  consumes: [],
};

/**
 * A session may ask the plugin to hand it a filesystem root. The plugin is the
 * only thing that creates one; the web server resolves the capability and gets
 * a handle, never the constructor.
 */
export interface SandboxHandles {
  /** Filesystems by session id. Created lazily on first `fs_init`. */
  fs: Map<string, FileSystemCapability>;
}

/** Per-run limits from the profile; a run may tighten them further. */
export type LimitsResolver = () => Partial<RunLimits>;

export function register(ctx: PluginRegisterContext): void {
  ctx.registry.registerDef(fsDef);

  const cfg = (ctx.config[FS_CAPABILITY] ?? {}) as Partial<FsConfig>;
  const fsCfg: FsConfig = {
    baseDir: cfg.baseDir,
    maxRootBytes: cfg.maxRootBytes,
  } as FsConfig;

  ctx.registry.provide(FS_CAPABILITY, manifest.name, {
    /** Create or return the filesystem for a session. */
    async forSession(sessionId: string): Promise<FileSystemCapability> {
      const existing = handles.fs.get(sessionId);
      if (existing) return existing;
      const fs = await createFs(sessionId, fsCfg);
      handles.fs.set(sessionId, fs);
      ctx.emit(FS_CAPABILITY, 'root.created', { sessionId, root: fs.root });
      return fs;
    },
    /** Drop a session's filesystem on close. Idempotent. */
    async closeSession(sessionId: string): Promise<void> {
      const fs = handles.fs.get(sessionId);
      if (!fs) return;
      handles.fs.delete(sessionId);
      await fs.close();
      ctx.emit(FS_CAPABILITY, 'root.closed', { sessionId });
    },
  });

  const handles: SandboxHandles = { fs: new Map() };

  // ---- magoco.code.run -------------------------------------------------
  // The sandbox is the only provider of execution (spec §7.1). A run happens
  // inside one session's filesystem root, so it can never touch another
  // session's files. The provider is a factory: the caller (the web plugin,
  // resolving per session) gets a fresh provider bound to one sessionId.
  ctx.registry.registerDef(codeDef);
  const codeCfg = (ctx.config[CODE_CAPABILITY] ?? {}) as Partial<RunLimits>;
  ctx.registry.provide(CODE_CAPABILITY, manifest.name, {
    /** Bind execution to a session. Called by whoever owns the session. */
    forSession(sessionId: string): CodeProvider {
      return {
        async run(request) {
          const fs = handles.fs.get(sessionId);
          if (!fs) {
            throw new Error(
              'magoco.code.run needs a session filesystem first — send fs_init',
            );
          }
          return runCode(
            fs.root,
            request,
            resolveRunLimits(codeCfg, request.limits),
          );
        },
      };
    },
  });
}

export default register;
