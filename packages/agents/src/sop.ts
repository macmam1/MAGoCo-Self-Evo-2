/**
 * SOP-based Planning & Iterative Refinement — Phase 6.
 *
 * A Standard Operating Procedure (SOP) is a reusable step-by-step plan
 * template. The planner instantiates SOPs for tasks and supports iterative
 * refinement (feedback → revised plan).
 */

import { randomUUID } from 'node:crypto';

export interface SOPStep {
  id: string;
  order: number;
  action: string;
  expectedOutput: string;
  required: boolean;
}

export interface SOP {
  id: string;
  name: string;
  description: string;
  steps: SOPStep[];
  version: number;
}

export interface PlanInstance {
  id: string;
  sopId: string;
  taskTitle: string;
  steps: Array<SOPStep & { status: 'pending' | 'done' | 'skipped'; actualOutput?: string }>;
  iteration: number;
  feedback: string[];
  createdAt: number;
}

/** SOP registry */
export function createSOPRegistry() {
  const store = new Map<string, SOP>();

  return {
    register(sop: SOP): void { store.set(sop.id, sop); },
    get(id: string): SOP | undefined { return store.get(id); },
    list(): SOP[] { return [...store.values()]; },
    remove(id: string): void { store.delete(id); },
  };
}

/** Instantiate a SOP for a specific task */
export function instantiateSOP(sop: SOP, taskTitle: string): PlanInstance {
  return {
    id: randomUUID(),
    sopId: sop.id,
    taskTitle,
    steps: sop.steps.map(s => ({ ...s, status: 'pending' })),
    iteration: 1,
    feedback: [],
    createdAt: Date.now(),
  };
}

/** Apply feedback and produce a refined plan (next iteration) */
export function refinePlan(plan: PlanInstance, feedback: string): PlanInstance {
  return {
    ...plan,
    id: randomUUID(),
    iteration: plan.iteration + 1,
    feedback: [...plan.feedback, feedback],
    // Reset pending steps for re-execution
    steps: plan.steps.map(s => {
      if (s.status === 'done') return s;
      const reset: SOPStep & { status: 'pending' | 'done' | 'skipped'; actualOutput?: string } = {
        id: s.id, order: s.order, action: s.action,
        expectedOutput: s.expectedOutput, required: s.required,
        status: 'pending',
      };
      return reset;
    }),
    createdAt: Date.now(),
  };
}

/** Built-in SOPs */
export const BUILTIN_SOPS: SOP[] = [
  {
    id: 'sop-feature', name: 'Feature Development', version: 1,
    description: 'Standard flow for building a new feature',
    steps: [
      { id: 's1', order: 1, action: 'Define requirements and acceptance criteria', expectedOutput: 'Requirements doc', required: true },
      { id: 's2', order: 2, action: 'Design technical approach', expectedOutput: 'Architecture doc', required: true },
      { id: 's3', order: 3, action: 'Implement the feature', expectedOutput: 'Working code', required: true },
      { id: 's4', order: 4, action: 'Write tests', expectedOutput: 'Test suite', required: true },
      { id: 's5', order: 5, action: 'Code review', expectedOutput: 'Review approval', required: false },
      { id: 's6', order: 6, action: 'Deploy to staging', expectedOutput: 'Staging deployment', required: false },
    ],
  },
  {
    id: 'sop-bug', name: 'Bug Fix', version: 1,
    description: 'Standard flow for fixing a bug',
    steps: [
      { id: 'b1', order: 1, action: 'Reproduce the bug', expectedOutput: 'Reproduction steps', required: true },
      { id: 'b2', order: 2, action: 'Identify root cause', expectedOutput: 'Root cause analysis', required: true },
      { id: 'b3', order: 3, action: 'Implement fix', expectedOutput: 'Fixed code', required: true },
      { id: 'b4', order: 4, action: 'Verify fix with tests', expectedOutput: 'Test results', required: true },
    ],
  },
];
