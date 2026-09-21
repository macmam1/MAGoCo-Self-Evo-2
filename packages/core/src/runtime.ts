import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CapabilityRegistry } from './capabilities/registry.js';
import type { CapabilityLogger, CapabilityContext } from './capabilities/types.js';
import { EventBus } from './eventbus/bus.js';
import type { StoredEvent } from './eventbus/bus.js';
import { SessionLog } from './session/log.js';
import { PluginLoader } from './plugins/loader.js';
import { ProfileLoader } from './profiles/loader.js';
import type { ResolvedProfile } from './profiles/loader.js';

/**
 * Locate every `plugin/` directory next to core's own package root.
 *
 * A builtin is just a package that ships a `plugin/` dir; the CLI (the only
 * place that knows where the workspace root is) may pass its own list via
 * `builtinPluginDirs`. Missing dirs are skipped by the loader, so this is
 * safe to call when only some packages ship plugins.
 */
function defaultBuiltinPluginDirs(): string[] {
  // runtime.ts lives at packages/core/src/runtime.ts → two dirnames up is
  // the *core package*, and one more is packages/. A builtin is any package
  // that ships a `plugin/` dir, so we scan siblings, not the repo root.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const pkgsRoot = path.dirname(path.dirname(here));
  const found: string[] = [];
  for (const name of ['web', 'agents', 'ui', 'workflows']) {
    const dir = path.join(pkgsRoot, name, 'plugin');
    if (fs.existsSync(dir)) found.push(dir);
  }
  return found;
}

export interface RuntimeOptions {
  /** Root data dir (sessions, plugins, profiles all live under here). */
  readonly rootDir: string;
  /**
   * Directories scanned for framework-shipped plugins. Defaults to the
   * `plugin/` directory of every workspace package. Core deliberately has
   * *no* builtin plugin list of its own: a builtin is a package that ships a
   * `plugin/` dir, so adding or removing one is a package change, not an edit
   * to the core runtime.
   */
  readonly builtinPluginDirs?: ReadonlyArray<string>;
  /** Profile name to boot with. */
  readonly profile: string;
  /** Extra plugin dirs beyond the built-in one. */
  readonly extraPluginDirs?: readonly string[];
}

/**
 * The assembled runtime. Everything the framework does passes through here.
 *
 * Boot order is deliberately fixed and dependency-ordered:
 *   log → bus → registry → profile → plugins
 *
 * The session log is attached to the bus *before* any plugin loads, so no
 * event from plugin registration can ever be lost.
 */
export class Runtime {
  readonly sessionId: string;
  readonly log: CapabilityLogger;
  readonly bus: EventBus;
  readonly registry: CapabilityRegistry;
  readonly sessionLog: SessionLog;
  readonly plugins: PluginLoader;
  readonly profile: ResolvedProfile;

  private constructor(opts: RuntimeOptions, profile: ResolvedProfile) {
    this.sessionId = crypto.randomUUID();
    this.log = new ConsoleLogger();
    this.sessionLog = new SessionLog(this.sessionId, opts.rootDir);
    this.bus = new EventBus((e) => void this.sessionLog.append(e));
    this.registry = new CapabilityRegistry(this.log);
    this.profile = profile;
    this.plugins = new PluginLoader(
      this.registry,
      {
        emit: (c, t, p) => this.emit(c, t, p),
        profileConfig: () => ({ ...this.profile.config }),
      },
      this.log,
    );
  }

  static async boot(opts: RuntimeOptions): Promise<Runtime> {
    const profiles = new ProfileLoader(path.join(opts.rootDir, 'profiles'));
    const profile = profiles.load(opts.profile);

    const rt = new Runtime(opts, profile);
    await rt.log.info('runtime booting', { session: rt.sessionId, profile: profile.name });

    const dirs = [
      path.join(opts.rootDir, 'plugins'),
      // Built-in plugins ship inside a workspace package's `plugin/` dir and
      // are discovered exactly like any third-party plugin — the only
      // difference is where they sit on disk. Core has no builtin list: a
      // package that ships a `plugin/` dir is a builtin, and `plugin/` never
      // imports core-only internals, so no layer is crossed at compile time.
      ...(opts.builtinPluginDirs ?? defaultBuiltinPluginDirs()),
      ...(opts.extraPluginDirs ?? []),
    ];
    // No `plugins:` key in the profile → every discovered plugin is enabled by
    // default. A profile opts *out* of plugins, never into them.
    const enabled =
      profile.plugins.size > 0
        ? new Set([...profile.plugins.entries()].filter(([, v]) => v).map(([k]) => k))
        : undefined;
    await rt.plugins.loadAll(dirs, enabled);

    await rt.log.info('runtime ready', { plugins: rt.plugins.list(), capabilities: rt.registry.list() });
    return rt;
  }

  /** Resolve a capability provider and call it with `input`. */
  async invoke(capabilityId: string, input: unknown): Promise<unknown> {
    const fn = this.registry.resolve<unknown>(capabilityId);
    if (typeof fn !== 'function')
      throw new Error(`capability ${capabilityId} provider is not callable`);
    const ctx: CapabilityContext = {
      sessionId: this.sessionId,
      emit: (e) => this.bus.publish(e),
      log: this.log,
      config: this.configFor(capabilityId),
    };
    return fn(input, ctx);
  }

  /**
   * Merged config for one capability: profile config first, then the plugin's
   * own `config.yaml` (which a plugin may override per-capability it provides).
   */
  private configFor(capabilityId: string): Record<string, unknown> {
    return { ...this.profile.config };
  }

  /** Emit an event on the bus (persisted to the session log). */
  emit(capability: string, type: string, payload: unknown): void {
    this.bus.publish({ capability, type, payload });
  }

  /** Graceful shutdown — plugins torn down in reverse. */
  async shutdown(): Promise<void> {
    await this.plugins.unloadAll();
    await this.log.info('runtime shutdown', { session: this.sessionId });
  }

  /** Build a context for a provider. */
  context(config: Record<string, unknown> = {}): CapabilityContext {
    return {
      sessionId: this.sessionId,
      emit: (e) => this.bus.publish(e),
      log: this.log,
      config,
    };
  }
}

class ConsoleLogger implements CapabilityLogger {
  debug(msg: string, fields?: Record<string, unknown>): void {
    this.write('DEBUG', msg, fields);
  }
  info(msg: string, fields?: Record<string, unknown>): void {
    this.write('INFO', msg, fields);
  }
  warn(msg: string, fields?: Record<string, unknown>): void {
    this.write('WARN', msg, fields);
  }
  error(msg: string, fields?: Record<string, unknown>): void {
    this.write('ERROR', msg, fields);
  }

  private write(level: string, msg: string, fields?: Record<string, unknown>): void {
    const line = fields ? `${msg} ${JSON.stringify(fields)}` : msg;
    // eslint-disable-next-line no-console
    console.error(`[${level}] ${line}`);
  }
}

export { StoredEvent };
