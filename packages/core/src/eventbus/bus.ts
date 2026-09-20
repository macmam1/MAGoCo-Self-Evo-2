import type { CapabilityEvent } from '../capabilities/types.js';

type EventHandler = (event: CapabilityEvent) => void;

/**
 * A minimal, typed pub/sub bus.
 *
 * Modules never call each other directly — they emit and subscribe
 * (MASTER_PLAN.md §1.5, mechanism 2). Adding a new consumer is a new file,
 * zero changes to existing modules.
 *
 * Every event published here is also appended to the session log, which makes
 * the whole conversation with the model replayable from disk alone.
 */
export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly wildcard = new Set<EventHandler>();
  private seq = 0;

  constructor(private readonly sink?: (e: StoredEvent) => void) {}

  /** Emit an event to all subscribers. */
  publish(event: CapabilityEvent): void {
    const stored: StoredEvent = { ...event, seq: ++this.seq, ts: Date.now() };
    this.sink?.(stored);

    // Exact match first, then capability-level wildcard, then global.
    for (const key of [`${event.capability}:${event.type}`, `${event.capability}:*`]) {
      const scoped = this.handlers.get(key);
      if (scoped) for (const h of scoped) h(event);
    }
    for (const h of this.wildcard) h(event);
  }

  /**
   * Subscribe to `capability.type`. Either part may be `*` to match anything
   * in that scope. Returns an unsubscribe function.
   */
  subscribe(capability: string, type: string, handler: EventHandler): () => void {
    if (capability === '*') {
      this.wildcard.add(handler);
      return () => this.wildcard.delete(handler);
    }
    const key = `${capability}:${type}`;
    let set = this.handlers.get(key);
    if (!set) {
      set = new Set();
      this.handlers.set(key, set);
    }
    set.add(handler);
    return () => set?.delete(handler);
  }
}

/** An event as durably stored — carries sequence and timestamp. */
export interface StoredEvent extends CapabilityEvent {
  readonly seq: number;
  readonly ts: number;
}
