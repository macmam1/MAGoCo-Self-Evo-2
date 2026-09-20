import * as crypto from 'node:crypto';
import * as path from 'node:path';
import { CapabilityRegistry } from './capabilities/registry.js';
import type { CapabilityLogger, CapabilityContext } from './capabilities/types.js';
import { EventBus } from './eventbus/bus.js';
import type { StoredEvent } from './eventbus/bus.js';
import { SessionLog } from './session/log.js';
import { PluginLoader } from './plugins/loader.js';
import { ProfileLoader } from './profiles/loader.js';
import type { ResolvedProfile } from './profiles/loader.js';

export interface RuntimeOptions {
  /** Root data dir (sessions, plugins, profiles all live under here). */
  readonly rootDir: string;
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
    this.plugins = new PluginLoader(this.registry, { emit: (c, t, p) => this.emit(c, t, p) }, this.log);
  }

  static async boot(opts: RuntimeOptions): Promise<Runtime> {
    const profiles = new ProfileLoader(path.join(opts.rootDir, 'profiles'));
    const profile = profiles.load(opts.profile);

    const rt = new Runtime(opts, profile);
    await rt.log.info('runtime booting', { session: rt.sessionId, profile: profile.name });

    const dirs = [
      path.join(opts.rootDir, 'plugins'),
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
