import type {
  CapabilityDef,
  CapabilityContext,
  CapabilityLogger,
  CapabilityEvent,
} from './types.js';
import { CapabilityNotRegisteredError, DuplicateProviderError } from './types.js';

/**
 * The capability registry — the heart of the modularity contract.
 *
 * Three participants per capability (see MASTER_PLAN.md §1.5):
 *   def      — the contract, registered once at boot
 *   provider — a concrete implementation, registered by a plugin
 *   consumer — anything that calls `resolve()` and uses the contract
 *
 * Consumers never import a provider directly. They resolve the `def`.
 */
export class CapabilityRegistry {
  private readonly defs = new Map<string, CapabilityDef>();
  private readonly providers = new Map<string, { plugin: string; instance: unknown }>();
  private readonly logger: CapabilityLogger;

  constructor(logger?: CapabilityLogger) {
    this.logger = logger ?? new NoopLogger();
  }

  /**
   * Register a capability definition. Called by the core or by a plugin's
   * `register()` step. Idempotent for an identical def.
   */
  registerDef(def: CapabilityDef): void {
    const existing = this.defs.get(def.id);
    if (existing && existing !== def) {
      throw new DuplicateProviderError(def.id, `def@${existing.version}`);
    }
    this.defs.set(def.id, def);
    this.logger.debug('capability def registered', { id: def.id, version: def.version });
  }

  /**
   * A plugin declares that it implements `capabilityId`.
   * Throws if another plugin already does — one capability, one provider.
   */
  provide(capabilityId: string, plugin: string, instance: unknown): void {
    const def = this.defs.get(capabilityId);
    if (!def) {
      throw new CapabilityNotRegisteredError(capabilityId);
    }
    const existing = this.providers.get(capabilityId);
    if (existing && existing.plugin !== plugin) {
      throw new DuplicateProviderError(capabilityId, existing.plugin);
    }
    this.providers.set(capabilityId, { plugin, instance });
    this.logger.debug('provider bound', { capability: capabilityId, plugin });
  }

  /** Remove a plugin's provider (used on plugin unload). */
  revoke(plugin: string, capabilityId?: string): void {
    if (capabilityId) {
      const p = this.providers.get(capabilityId);
      if (p && p.plugin === plugin) this.providers.delete(capabilityId);
      return;
    }
    for (const [id, p] of this.providers) {
      if (p.plugin === plugin) this.providers.delete(id);
    }
  }

  /**
   * Resolve a capability. Consumers program against the returned type only.
   * Throws synchronously if no provider is bound — fail loud, not silently.
   */
  resolve<T = unknown>(capabilityId: string): T {
    const entry = this.providers.get(capabilityId);
    if (!entry) throw new CapabilityNotRegisteredError(capabilityId);
    return entry.instance as T;
  }

  /** True if a provider is currently bound. */
  has(capabilityId: string): boolean {
    return this.providers.has(capabilityId);
  }

  /** List everything bound right now — used by the CLI `status` command. */
  list(): Array<{ capability: string; plugin: string }> {
    return [...this.providers.entries()].map(([capability, p]) => ({
      capability,
      plugin: p.plugin,
    }));
  }
}

class NoopLogger implements CapabilityLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

/** Convenience: build a context for a plugin instance. */
export function createContext(
  sessionId: string,
  emit: (e: CapabilityEvent) => void,
  log: CapabilityLogger,
  config: Record<string, unknown> = {},
): CapabilityContext {
  return { sessionId, emit, log, config };
}
