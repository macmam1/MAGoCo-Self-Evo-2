/**
 * Workflow DAG Engine tests — Phase 5.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { executeWorkflow, topoSort } from '../src/engine.js';
import type { WorkflowDef, NodeDef, NodeExecutor } from '../src/types.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeWf(nodes: NodeDef[], edges: WorkflowDef['edges'] = []): WorkflowDef {
  return { id: 'wf-test', name: 'Test', trigger: 'manual', nodes, edges };
}

const noop: NodeExecutor = async () => undefined;

// ── topoSort ─────────────────────────────────────────────────────────────────

test('T-W1 topoSort single node', () => {
  const wf = makeWf([{ id: 'a', kind: 'action', label: 'A' }]);
  assert.deepEqual(topoSort(wf), ['a']);
});

test('T-W2 topoSort linear chain', () => {
  const wf = makeWf(
    [{ id: 'a', kind: 'action', label: 'A' }, { id: 'b', kind: 'action', label: 'B' }],
    [{ from: 'a', to: 'b' }],
  );
  assert.deepEqual(topoSort(wf), ['a', 'b']);
});

test('T-W3 topoSort throws on cycle', () => {
  const wf = makeWf(
    [{ id: 'a', kind: 'action', label: 'A' }, { id: 'b', kind: 'action', label: 'B' }],
    [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }],
  );
  assert.throws(() => topoSort(wf), /cycle/);
});

// ── executeWorkflow ───────────────────────────────────────────────────────────

test('T-W4 empty workflow completes with status done', async () => {
  const run = await executeWorkflow(makeWf([]), noop);
  assert.equal(run.status, 'done');
});

test('T-W5 single action node runs and completes', async () => {
  const wf = makeWf([{ id: 'n1', kind: 'action', label: 'Step 1' }]);
  const run = await executeWorkflow(wf, async () => 42);
  assert.equal(run.status, 'done');
  assert.equal(run.nodes.get('n1')?.status, 'done');
  assert.equal(run.nodes.get('n1')?.output, 42);
});

test('T-W6 failed node stops execution with status failed', async () => {
  const wf = makeWf(
    [{ id: 'a', kind: 'action', label: 'A' }, { id: 'b', kind: 'action', label: 'B' }],
    [{ from: 'a', to: 'b' }],
  );
  const run = await executeWorkflow(wf, async (node) => {
    if (node.id === 'a') throw new Error('boom');
    return 'ok';
  });
  assert.equal(run.status, 'failed');
  assert.equal(run.nodes.get('a')?.status, 'failed');
  assert.match(run.nodes.get('a')?.error ?? '', /boom/);
});

test('T-W7 condition true routes to true branch', async () => {
  const wf = makeWf(
    [
      { id: 'cond', kind: 'condition', label: 'Check' },
      { id: 'yes', kind: 'action', label: 'Yes' },
      { id: 'no', kind: 'action', label: 'No' },
    ],
    [
      { from: 'cond', to: 'yes', label: 'true' },
      { from: 'cond', to: 'no', label: 'false' },
    ],
  );
  const run = await executeWorkflow(wf, async (node) => {
    if (node.id === 'cond') return true;
    return 'ran';
  });
  assert.equal(run.nodes.get('yes')?.status, 'done');
  assert.equal(run.nodes.get('no')?.status, 'skipped');
});

test('T-W8 condition false routes to false branch', async () => {
  const wf = makeWf(
    [
      { id: 'cond', kind: 'condition', label: 'Check' },
      { id: 'yes', kind: 'action', label: 'Yes' },
      { id: 'no', kind: 'action', label: 'No' },
    ],
    [
      { from: 'cond', to: 'yes', label: 'true' },
      { from: 'cond', to: 'no', label: 'false' },
    ],
  );
  const run = await executeWorkflow(wf, async (node) => {
    if (node.id === 'cond') return false;
    return 'ran';
  });
  assert.equal(run.nodes.get('yes')?.status, 'skipped');
  assert.equal(run.nodes.get('no')?.status, 'done');
});

test('T-W9 HITL gate approved continues workflow', async () => {
  const wf = makeWf(
    [
      { id: 'gate', kind: 'hitl-gate', label: 'Approve?' },
      { id: 'after', kind: 'action', label: 'After' },
    ],
    [{ from: 'gate', to: 'after' }],
  );
  const run = await executeWorkflow(wf, noop, { onHitl: async () => 'approved' });
  assert.equal(run.status, 'done');
  assert.equal(run.nodes.get('gate')?.status, 'done');
  assert.equal(run.nodes.get('after')?.status, 'done');
});

test('T-W10 HITL gate denied stops workflow', async () => {
  const wf = makeWf(
    [
      { id: 'gate', kind: 'hitl-gate', label: 'Approve?' },
      { id: 'after', kind: 'action', label: 'After' },
    ],
    [{ from: 'gate', to: 'after' }],
  );
  const run = await executeWorkflow(wf, noop, { onHitl: async () => 'denied' });
  assert.equal(run.status, 'failed');
  assert.equal(run.nodes.get('gate')?.status, 'failed');
});

test('T-W11 results from previous nodes available in context', async () => {
  const wf = makeWf(
    [
      { id: 'a', kind: 'action', label: 'A' },
      { id: 'b', kind: 'action', label: 'B' },
    ],
    [{ from: 'a', to: 'b' }],
  );
  let seenResult: unknown;
  const run = await executeWorkflow(wf, async (node, ctx) => {
    if (node.id === 'b') seenResult = ctx.results.get('a');
    return node.id;
  });
  assert.equal(run.status, 'done');
  assert.equal(seenResult, 'a');
});

test('T-W12 run has runId and timing fields', async () => {
  const wf = makeWf([{ id: 'x', kind: 'action', label: 'X' }]);
  const run = await executeWorkflow(wf, noop);
  assert.ok(typeof run.runId === 'string' && run.runId.length > 0);
  assert.ok(typeof run.startedAt === 'number');
  assert.ok(typeof run.finishedAt === 'number');
  assert.ok(run.finishedAt! >= run.startedAt);
});
