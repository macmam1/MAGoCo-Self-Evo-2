/**
 * Workflow Runner — Phase 5.
 *
 * Connects the trigger system to the DAG engine.
 * Manages registered workflows and their active runs.
 */

import { randomUUID } from 'node:crypto';
import { executeWorkflow } from './engine.js';
import { registerTrigger } from './triggers.js';
import type { WorkflowDef, WorkflowRun, NodeExecutor } from './types.js';
import type { TriggerConfig, TriggerHandle } from './triggers.js';

export interface RunnerOptions {
  executor: NodeExecutor;
  onHitl?: (node: import('./types.js').NodeDef) => Promise<'approved' | 'denied'>;
  /** Called when a run completes (done or failed) */
  onRunComplete?: (run: WorkflowRun) => void;
}

export interface WorkflowEntry {
  def: WorkflowDef;
  triggerHandle: TriggerHandle;
  runs: WorkflowRun[];
}

export function createWorkflowRunner(opts: RunnerOptions) {
  const workflows = new Map<string, WorkflowEntry>();
  const activeRuns = new Map<string, WorkflowRun>();

  async function fire(workflowId: string, _payload?: unknown) {
    const entry = workflows.get(workflowId);
    if (!entry) return;

    const run = await executeWorkflow(entry.def, opts.executor, {
      onHitl: opts.onHitl,
    });

    entry.runs.push(run);
    activeRuns.delete(run.runId);
    opts.onRunComplete?.(run);
    return run;
  }

  return {
    /**
     * Register a workflow with the runner.
     * Automatically sets up the trigger.
     */
    register(def: WorkflowDef, triggerConfig: TriggerConfig = {}): void {
      if (workflows.has(def.id)) throw new Error(`workflow '${def.id}' already registered`);
      const triggerHandle = registerTrigger(def, triggerConfig, fire);
      workflows.set(def.id, { def, triggerHandle, runs: [] });
    },

    /** Manually fire a workflow by id, regardless of its trigger kind. */
    async fire(workflowId: string, payload?: unknown): Promise<WorkflowRun> {
      const entry = workflows.get(workflowId);
      if (!entry) throw new Error(`workflow '${workflowId}' not registered`);
      const run = await fire(workflowId, payload);
      return run!;
    },

    /** Unregister a workflow and stop its trigger. */
    unregister(workflowId: string): void {
      const entry = workflows.get(workflowId);
      if (!entry) return;
      entry.triggerHandle.stop();
      workflows.delete(workflowId);
    },

    /** List registered workflow ids. */
    list(): string[] {
      return [...workflows.keys()];
    },

    /** Get all runs for a workflow. */
    getRuns(workflowId: string): WorkflowRun[] {
      return workflows.get(workflowId)?.runs ?? [];
    },

    /** Get the last run for a workflow. */
    lastRun(workflowId: string): WorkflowRun | null {
      const runs = workflows.get(workflowId)?.runs ?? [];
      return runs[runs.length - 1] ?? null;
    },

    /** Stop all triggers and clear the registry. */
    destroy(): void {
      for (const entry of workflows.values()) entry.triggerHandle.stop();
      workflows.clear();
      activeRuns.clear();
    },
  };
}

export type WorkflowRunner = ReturnType<typeof createWorkflowRunner>;
