/**
 * Auto-Rollback — Phase 8.
 *
 * Snapshots prompt/config versions and rolls back when regression detected.
 */

import { randomUUID } from 'node:crypto';

export interface Snapshot {
  id: string;
  label: string;
  data: Record<string, unknown>;
  createdAt: number;
}

export function createRollbackManager() {
  const history: Snapshot[] = [];

  return {
    /** Save a snapshot of current config/prompt state */
    save(label: string, data: Record<string, unknown>): Snapshot {
      const snap: Snapshot = { id: randomUUID(), label, data: { ...data }, createdAt: Date.now() };
      history.push(snap);
      return snap;
    },

    /** Get all snapshots (oldest first) */
    list(): Snapshot[] { return [...history]; },

    /** Get the latest snapshot */
    latest(): Snapshot | null { return history[history.length - 1] ?? null; },

    /** Rollback to a specific snapshot id */
    rollback(id: string): Snapshot {
      const snap = history.find(s => s.id === id);
      if (!snap) throw new Error(`snapshot ${id} not found`);
      // Re-save as new entry to mark the rollback
      const rolled: Snapshot = { id: randomUUID(), label: `rollback→${snap.label}`, data: { ...snap.data }, createdAt: Date.now() };
      history.push(rolled);
      return rolled;
    },

    /** Rollback to previous snapshot */
    rollbackLast(): Snapshot {
      if (history.length < 2) throw new Error('no previous snapshot to roll back to');
      const prev = history[history.length - 2]!;
      return this.rollback(prev.id);
    },

    /** Clear all snapshots */
    clear(): void { history.length = 0; },

    size(): number { return history.length; },
  };
}

export type RollbackManager = ReturnType<typeof createRollbackManager>;
