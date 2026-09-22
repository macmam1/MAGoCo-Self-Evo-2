/**
 * Workflow Trigger System — Phase 5.
 *
 * Supports three trigger kinds:
 *  - manual  : fire on demand
 *  - webhook : fire when an HTTP POST arrives at /api/workflow/:id/trigger
 *  - event   : fire when a named event is emitted on the event bus
 *  - schedule: fire on a cron-like interval (ms-based in this impl)
 */

import { randomUUID } from 'node:crypto';
import type { WorkflowDef, TriggerKind } from './types.js';

export interface TriggerConfig {
  /** For 'webhook': optional secret to validate X-Webhook-Secret header */
  secret?: string;
  /** For 'event': the event name to listen for */
  eventName?: string;
  /** For 'schedule': interval in milliseconds */
  intervalMs?: number;
}

export interface TriggerHandle {
  readonly triggerId: string;
  readonly workflowId: string;
  readonly kind: TriggerKind;
  /** Stop the trigger (clear interval / remove listener) */
  stop(): void;
}

type FireFn = (workflowId: string, payload?: unknown) => void;

/**
 * Register a trigger for a workflow.
 * `fire` is called when the trigger condition is met.
 */
export function registerTrigger(
  def: WorkflowDef,
  config: TriggerConfig,
  fire: FireFn,
): TriggerHandle {
  const triggerId = randomUUID();

  switch (def.trigger) {
    case 'manual': {
      // Manual triggers never auto-fire — just return a handle
      return {
        triggerId,
        workflowId: def.id,
        kind: 'manual',
        stop() { /* no-op */ },
      };
    }

    case 'schedule': {
      const ms = config.intervalMs ?? 60_000;
      const timer = setInterval(() => fire(def.id), ms);
      // Allow Node to exit even if trigger is still registered
      if (typeof timer.unref === 'function') timer.unref();
      return {
        triggerId,
        workflowId: def.id,
        kind: 'schedule',
        stop() { clearInterval(timer); },
      };
    }

    case 'webhook': {
      // The actual HTTP routing is handled by the web server;
      // this handle just records the registration and provides stop().
      const handle: TriggerHandle = {
        triggerId,
        workflowId: def.id,
        kind: 'webhook',
        stop() {
          webhookRegistry.delete(def.id);
        },
      };
      const entry: { secret?: string; fire: FireFn } = { fire };
      if (config.secret !== undefined) entry.secret = config.secret;
      webhookRegistry.set(def.id, entry);
      return handle;
    }

    case 'event': {
      const name = config.eventName ?? def.id;
      const listener = (payload: unknown) => fire(def.id, payload);
      eventListeners.set(triggerId, { name, listener });
      return {
        triggerId,
        workflowId: def.id,
        kind: 'event',
        stop() {
          eventListeners.delete(triggerId);
        },
      };
    }

    default:
      throw new Error(`unknown trigger kind: ${(def as any).trigger}`);
  }
}

// ── Webhook registry (shared, keyed by workflowId) ────────────────────────

const webhookRegistry = new Map<string, { secret?: string; fire: FireFn }>();

/** Called by the HTTP server when POST /api/workflow/:id/trigger arrives. */
export function handleWebhook(
  workflowId: string,
  secret: string | undefined,
  payload: unknown,
): boolean {
  const entry = webhookRegistry.get(workflowId);
  if (!entry) return false;
  if (entry.secret && entry.secret !== secret) return false;
  entry.fire(workflowId, payload);
  return true;
}

// ── Event bus (in-process, keyed by triggerId) ────────────────────────────

const eventListeners = new Map<string, { name: string; listener: (p: unknown) => void }>();

/** Emit a named event — fires all matching event triggers. */
export function emitEvent(name: string, payload?: unknown): number {
  let fired = 0;
  for (const { name: n, listener } of eventListeners.values()) {
    if (n === name) { listener(payload); fired++; }
  }
  return fired;
}
