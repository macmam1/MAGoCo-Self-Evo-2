/**
 * Sub-workflow support — Phase 5.
 *
 * A sub-workflow node embeds a full WorkflowDef inside a parent workflow.
 * The engine calls `executeSubWorkflow` when it encounters a node with
 * kind='action' and config.subWorkflowId set.
 */

import { executeWorkflow } from './engine.js';
import type { WorkflowDef, WorkflowRun, NodeExecutor } from './types.js';

export interface SubWorkflowRegistry {
  register(def: WorkflowDef): void;
  get(id: string): WorkflowDef | undefined;
  list(): string[];
  remove(id: string): void;
}

export function createSubWorkflowRegistry(): SubWorkflowRegistry {
  const store = new Map<string, WorkflowDef>();
  return {
    register(def) { store.set(def.id, def); },
    get(id) { return store.get(id); },
    list() { return [...store.keys()]; },
    remove(id) { store.delete(id); },
  };
}

/**
 * Returns a NodeExecutor that handles sub-workflow nodes.
 * Falls back to `fallback` for regular nodes.
 */
export function createSubWorkflowExecutor(
  registry: SubWorkflowRegistry,
  fallback: NodeExecutor,
): NodeExecutor {
  return async (node, ctx) => {
    const subId = node.config?.subWorkflowId as string | undefined;
    if (!subId) return fallback(node, ctx);

    const subDef = registry.get(subId);
    if (!subDef) throw new Error(`sub-workflow '${subId}' not found in registry`);

    const subRun = await executeWorkflow(subDef, fallback);
    if (subRun.status === 'failed') {
      throw new Error(`sub-workflow '${subId}' failed`);
    }
    return { subRunId: subRun.runId, status: subRun.status };
  };
}
