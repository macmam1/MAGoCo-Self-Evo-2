/**
 * Milestone & Progress Tracking — Phase 6.
 *
 * Tracks milestones (grouped subtasks) and overall project progress.
 */

import { randomUUID } from 'node:crypto';

export type MilestoneStatus = 'pending' | 'in-progress' | 'done' | 'blocked';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  subtaskIds: string[];
  status: MilestoneStatus;
  createdAt: number;
  completedAt?: number;
}

export interface ProgressReport {
  total: number;
  done: number;
  inProgress: number;
  pending: number;
  blocked: number;
  percent: number;
}

export function createMilestoneTracker() {
  const milestones = new Map<string, Milestone>();

  return {
    add(title: string, description: string, subtaskIds: string[] = []): Milestone {
      const m: Milestone = {
        id: randomUUID(), title, description, subtaskIds,
        status: 'pending', createdAt: Date.now(),
      };
      milestones.set(m.id, m);
      return m;
    },

    get(id: string): Milestone | null {
      return milestones.get(id) ?? null;
    },

    list(): Milestone[] {
      return [...milestones.values()];
    },

    update(id: string, status: MilestoneStatus): void {
      const m = milestones.get(id);
      if (!m) throw new Error(`milestone ${id} not found`);
      m.status = status;
      if (status === 'done') m.completedAt = Date.now();
    },

    remove(id: string): void {
      milestones.delete(id);
    },

    progress(): ProgressReport {
      const all = [...milestones.values()];
      const total = all.length;
      if (total === 0) return { total: 0, done: 0, inProgress: 0, pending: 0, blocked: 0, percent: 0 };
      const done = all.filter(m => m.status === 'done').length;
      const inProgress = all.filter(m => m.status === 'in-progress').length;
      const pending = all.filter(m => m.status === 'pending').length;
      const blocked = all.filter(m => m.status === 'blocked').length;
      return { total, done, inProgress, pending, blocked, percent: Math.round((done / total) * 100) };
    },
  };
}

export type MilestoneTracker = ReturnType<typeof createMilestoneTracker>;
