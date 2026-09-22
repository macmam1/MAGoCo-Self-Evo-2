/**
 * Reflection Engine — Phase 8 (Self-evolution).
 *
 * After each task run, captures success/failure signals,
 * lesson learned, and stores them for pattern mining.
 */

import { randomUUID } from 'node:crypto';

export type ReflectionOutcome = 'success' | 'failure' | 'partial';

export interface Reflection {
  id: string;
  taskId: string;
  agentId: string;
  outcome: ReflectionOutcome;
  /** What went well */
  strengths: string[];
  /** What went wrong */
  weaknesses: string[];
  /** Lessons learned */
  lessons: string[];
  /** Tool calls made */
  toolsCalled: string[];
  /** Number of steps taken */
  steps: number;
  /** Token cost if tracked */
  tokenCost?: number;
  createdAt: number;
}

export interface ReflectionStore {
  save(r: Reflection): void;
  getByTask(taskId: string): Reflection[];
  getByAgent(agentId: string): Reflection[];
  getAll(): Reflection[];
  clear(): void;
}

export function createReflectionStore(): ReflectionStore {
  const store: Reflection[] = [];
  return {
    save(r) { store.push(r); },
    getByTask(taskId) { return store.filter(r => r.taskId === taskId); },
    getByAgent(agentId) { return store.filter(r => r.agentId === agentId); },
    getAll() { return [...store]; },
    clear() { store.length = 0; },
  };
}

/** Build a reflection from a run result */
export function reflect(opts: {
  taskId: string;
  agentId: string;
  outcome: ReflectionOutcome;
  strengths?: string[];
  weaknesses?: string[];
  lessons?: string[];
  toolsCalled?: string[];
  steps?: number;
  tokenCost?: number;
}): Reflection {
  return {
    id: randomUUID(),
    taskId: opts.taskId,
    agentId: opts.agentId,
    outcome: opts.outcome,
    strengths: opts.strengths ?? [],
    weaknesses: opts.weaknesses ?? [],
    lessons: opts.lessons ?? [],
    toolsCalled: opts.toolsCalled ?? [],
    steps: opts.steps ?? 0,
    ...(opts.tokenCost !== undefined ? { tokenCost: opts.tokenCost } : {}),
    createdAt: Date.now(),
  };
}
