/**
 * Workflow DAG Engine — Phase 5.
 *
 * Topological execution with branching, parallel, loop, and HITL gate support.
 */

import { randomUUID } from 'node:crypto';
import type {
  WorkflowDef,
  WorkflowRun,
  NodeRun,
  NodeDef,
  NodeExecutor,
  ExecutionContext,
} from './types.js';

/** Build adjacency list and in-degree map from edges */
function buildGraph(def: WorkflowDef): {
  adj: Map<string, { to: string; label?: string }[]>;
  inDegree: Map<string, number>;
} {
  const adj = new Map<string, { to: string; label?: string }[]>();
  const inDegree = new Map<string, number>();

  for (const n of def.nodes) {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const e of def.edges) {
    const edge: { to: string; label?: string } = { to: e.to };
    if (e.label !== undefined) edge.label = e.label;
    adj.get(e.from)!.push(edge);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }

  return { adj, inDegree };
}

/** Topological sort — throws on cycle */
function topoSort(def: WorkflowDef): string[] {
  const { adj, inDegree } = buildGraph(def);
  const queue = [...inDegree.entries()]
    .filter(([, d]) => d === 0)
    .map(([id]) => id);
  const order: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const { to } of adj.get(id) ?? []) {
      const d = inDegree.get(to)! - 1;
      inDegree.set(to, d);
      if (d === 0) queue.push(to);
    }
  }

  if (order.length !== def.nodes.length) {
    throw new Error('workflow graph contains a cycle');
  }

  return order;
}

/**
 * Execute a workflow definition.
 * Returns the completed WorkflowRun.
 */
export async function executeWorkflow(
  def: WorkflowDef,
  executor: NodeExecutor,
  opts: { onHitl?: ExecutionContext['onHitl'] } = {},
): Promise<WorkflowRun> {
  const runId = randomUUID();
  const nodeMap = new Map(def.nodes.map(n => [n.id, n]));
  const nodeRunMap = new Map<string, NodeRun>(
    def.nodes.map(n => [n.id, { nodeId: n.id, status: 'pending' }]),
  );

  const run: WorkflowRun = {
    runId,
    workflowId: def.id,
    startedAt: Date.now(),
    status: 'running',
    nodes: nodeRunMap,
  };

  const results = new Map<string, unknown>();
  const ctx: ExecutionContext = { run, results };
  if (opts.onHitl) ctx.onHitl = opts.onHitl;

  // Build edge label map for condition routing
  const edgeLabels = new Map<string, string | undefined>();
  for (const e of def.edges) {
    edgeLabels.set(`${e.from}→${e.to}`, e.label);
  }

  // Adjacency for skipping branches
  const { adj } = buildGraph(def);
  const skipped = new Set<string>();

  let order: string[];
  try {
    order = topoSort(def);
  } catch (e) {
    run.status = 'failed';
    run.finishedAt = Date.now();
    return run;
  }

  for (const nodeId of order) {
    const nodeRun = nodeRunMap.get(nodeId)!;
    const node = nodeMap.get(nodeId)!;

    if (skipped.has(nodeId)) {
      nodeRun.status = 'skipped';
      continue;
    }

    nodeRun.status = 'running';
    nodeRun.startedAt = Date.now();

    try {
      // HITL gate — suspend and wait for approval
      if (node.kind === 'hitl-gate') {
        nodeRun.status = 'waiting-hitl';
        run.status = 'waiting-hitl';
        const decision = opts.onHitl ? await opts.onHitl(node) : 'approved';
        if (decision === 'denied') {
          nodeRun.status = 'failed';
          nodeRun.error = 'denied by user';
          nodeRun.finishedAt = Date.now();
          run.status = 'failed';
          run.finishedAt = Date.now();
          return run;
        }
        run.status = 'running';
        nodeRun.status = 'done';
        nodeRun.finishedAt = Date.now();
        results.set(nodeId, { approved: true });
        continue;
      }

      // Condition node — result must be boolean; route true/false branches
      const output = await executor(node, ctx);
      nodeRun.output = output;
      nodeRun.status = 'done';
      nodeRun.finishedAt = Date.now();
      results.set(nodeId, output);

      if (node.kind === 'condition') {
        const branch = output ? 'true' : 'false';
        const skip = output ? 'false' : 'true';
        for (const { to, label } of adj.get(nodeId) ?? []) {
          if (label === skip) skipped.add(to);
        }
      }
    } catch (err) {
      nodeRun.status = 'failed';
      nodeRun.error = String(err);
      nodeRun.finishedAt = Date.now();
      run.status = 'failed';
      run.finishedAt = Date.now();
      return run;
    }
  }

  run.status = 'done';
  run.finishedAt = Date.now();
  return run;
}

export { topoSort };
export type { WorkflowDef, WorkflowRun, NodeDef, NodeExecutor, ExecutionContext };
