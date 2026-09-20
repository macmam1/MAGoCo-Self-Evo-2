/**
 * Capability definitions (the `def` layer).
 *
 * A capability is a contract — a stable, versioned interface that the rest of
 * the system programs against. Consumers only ever see the `def`, never the
 * `provider`, so implementations can be swapped with zero ripple.
 *
 * This file is one of the three "stable surfaces" of the whole framework
 * (see MASTER_PLAN.md §1.5). Changing it is a breaking change.
 */

/**
 * A capability contract. Identified by a dotted, namespaced id.
 * Example: `magoco.agent.loop`, `magoco.llm.complete`, `magoco.persist.store`
 */
export interface CapabilityDef<TConfig = unknown, TInstance = unknown> {
  /** Globally unique, dotted id. e.g. `magoco.llm.complete` */
  readonly id: string;

  /** Human-readable name shown in UI and docs. */
  readonly name: string;

  /** What this capability provides. */
  readonly description: string;

  /** Semver — breaking changes to the contract bump major. */
  readonly version: string;

  /**
   * Optional JSON Schema describing the config a provider of this capability
   * must accept. Used for validation at registration time.
   */
  readonly configSchema?: object;

  /** Runtime constructor for the provider instance. */
  create(config: TConfig, ctx: CapabilityContext): TInstance;
}

/**
 * Shared runtime services handed to every provider at construction.
 * Stable — new optional fields only.
 */
export interface CapabilityContext {
  /** Emit an event onto the global bus. */
  emit: (event: CapabilityEvent) => void;

  /** Read-only access to the session log tail. */
  readonly sessionId: string;

  /** Framework logger. */
  readonly log: CapabilityLogger;

  /** The merged configuration for the capability being served. */
  readonly config: Record<string, unknown>;
}

/** A structured log entry. */
export interface CapabilityLogger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
}

/** Event shape emitted through the context bus. */
export interface CapabilityEvent {
  /** The capability id that emitted this event. */
  readonly capability: string;

  /** Event type, scoped to the capability. e.g. `run.started` */
  readonly type: string;

  readonly payload: unknown;
}

/** Sentinel for "no provider registered". */
export class CapabilityNotRegisteredError extends Error {
  constructor(readonly capabilityId: string) {
    super(`No provider registered for capability: ${capabilityId}`);
    this.name = 'CapabilityNotRegisteredError';
  }
}

/** Thrown when two providers claim the same capability. */
export class DuplicateProviderError extends Error {
  constructor(readonly capabilityId: string, readonly existing: string) {
    super(`Capability ${capabilityId} already provided by ${existing}`);
    this.name = 'DuplicateProviderError';
  }
}
