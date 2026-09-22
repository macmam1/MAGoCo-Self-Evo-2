/**
 * Workflow DAG Engine — Phase 5.
 *
 * Core types: Node, Edge, Graph, ExecutionContext.
 * Supports: action, condition (branch), parallel, loop, hitl-gate nodes.
 */

export type NodeKind = 'action' | 'condition' | 'parallel' | 'loop' | 'hitl-gate';

export type TriggerKind = 'manual' | 'webhook' | 'schedule' | 'event';

export interface NodeDef {
  id: string;
  kind: NodeKind;
  label: string;
  /** Arbitrary config passed to the executor */
  config?: Record<string, unknown>;
}

export interface EdgeDef {
  from: string;
  to: string;
  /** For condition nodes: 'true' | 'false' | undefined (unconditional) */
  label?: string;
}

export interface WorkflowDef {
  id: string;
  name: string;
  trigger: TriggerKind;
  nodes: NodeDef[];
  edges: EdgeDef[];
}

export type NodeStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped' | 'waiting-hitl';

export interface NodeRun {
  nodeId: string;
  status: NodeStatus;
  startedAt?: number;
  finishedAt?: number;
  output?: unknown;
  error?: string;
}

export interface WorkflowRun {
  runId: string;
  workflowId: string;
  startedAt: number;
  finishedAt?: number;
  status: 'running' | 'done' | 'failed' | 'waiting-hitl';
  nodes: Map<string, NodeRun>;
}

/** Called for each node during execution. Returns output or throws. */
export type NodeExecutor = (node: NodeDef, ctx: ExecutionContext) => Promise<unknown>;

export interface ExecutionContext {
  run: WorkflowRun;
  /** Results from previous nodes, keyed by nodeId */
  results: Map<string, unknown>;
  /** Called when a hitl-gate node needs human approval */
  onHitl?: (node: NodeDef) => Promise<'approved' | 'denied'>;
}
