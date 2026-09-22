/**
 * Task Decomposition & Team Building — Phase 6.
 *
 * Breaks a high-level task into subtasks and assigns each to an agent role.
 * If no suitable role exists, a new one is created dynamically.
 */

import { randomUUID } from 'node:crypto';
import type { AgentRole, RoleKind } from './pipeline.js';
import { createRole } from './pipeline.js';

export interface SubTask {
  id: string;
  title: string;
  description: string;
  assignedRole: RoleKind | 'custom';
  customRole?: AgentRole;
  dependencies: string[]; // subtask ids this one depends on
  status: 'pending' | 'running' | 'done' | 'failed';
  output?: string;
}

export interface DecomposedTask {
  id: string;
  title: string;
  subtasks: SubTask[];
  createdAt: number;
}

/** Pluggable decomposer — rule-based or LLM-backed */
export interface TaskDecomposer {
  decompose(title: string, description: string): Promise<SubTask[]>;
}

/** Rule-based decomposer: maps keywords to roles */
export function createRuleBasedDecomposer(): TaskDecomposer {
  return {
    async decompose(title: string, description: string): Promise<SubTask[]> {
      const text = (title + ' ' + description).toLowerCase();
      const subtasks: SubTask[] = [];

      // Always start with PM
      subtasks.push({
        id: randomUUID(), title: 'Define requirements', description,
        assignedRole: 'pm', dependencies: [], status: 'pending',
      });

      const pmId = subtasks[0]!.id;

      // Architect if design/architecture needed
      if (/design|architect|system|struct|schema|api|database/i.test(text)) {
        const id = randomUUID();
        subtasks.push({
          id, title: 'Design architecture', description,
          assignedRole: 'architect', dependencies: [pmId], status: 'pending',
        });
      }

      // Coder always
      const archId = subtasks.find(s => s.assignedRole === 'architect')?.id;
      const coderId = randomUUID();
      subtasks.push({
        id: coderId, title: 'Implement', description,
        assignedRole: 'coder',
        dependencies: archId ? [archId] : [pmId],
        status: 'pending',
      });

      // QA always
      subtasks.push({
        id: randomUUID(), title: 'Test and verify', description,
        assignedRole: 'qa', dependencies: [coderId], status: 'pending',
      });

      return subtasks;
    },
  };
}

/** Decompose a task into subtasks */
export async function decomposeTask(
  title: string,
  description: string,
  decomposer: TaskDecomposer = createRuleBasedDecomposer(),
): Promise<DecomposedTask> {
  const subtasks = await decomposer.decompose(title, description);
  return { id: randomUUID(), title, subtasks, createdAt: Date.now() };
}

/** Execute subtasks in dependency order */
export async function executeDecomposed(
  task: DecomposedTask,
  executor: (subtask: SubTask, results: Map<string, string>) => Promise<string>,
): Promise<DecomposedTask> {
  const results = new Map<string, string>();
  const remaining = [...task.subtasks];

  while (remaining.length > 0) {
    // Find subtasks whose deps are all done
    const ready = remaining.filter(s =>
      s.dependencies.every(dep => results.has(dep))
    );

    if (ready.length === 0) {
      // Cycle or unresolvable dep
      for (const s of remaining) { s.status = 'failed'; }
      break;
    }

    // Run ready subtasks in parallel
    await Promise.all(ready.map(async (s) => {
      s.status = 'running';
      try {
        s.output = await executor(s, results);
        s.status = 'done';
        results.set(s.id, s.output);
      } catch (err) {
        s.status = 'failed';
        s.output = String(err);
      }
      remaining.splice(remaining.indexOf(s), 1);
    }));
  }

  return task;
}
