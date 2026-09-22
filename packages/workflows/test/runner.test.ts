/**
 * Workflow Runner tests — Phase 5.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWorkflowRunner } from '../src/runner.js';
import type { WorkflowDef, NodeExecutor } from '../src/types.js';

function wf(id: string): WorkflowDef {
  return {
    id,
    name: id,
    trigger: 'manual',
    nodes: [{ id: 'n1', kind: 'action', label: 'Step' }],
    edges: [],
  };
}

const noop: NodeExecutor = async () => undefined;

test('T-R1 list is empty initially', () => {
  const r = createWorkflowRunner({ executor: noop });
  assert.deepEqual(r.list(), []);
  r.destroy();
});

test('T-R2 register adds workflow to list', () => {
  const r = createWorkflowRunner({ executor: noop });
  r.register(wf('w1'));
  assert.ok(r.list().includes('w1'));
  r.destroy();
});

test('T-R3 register throws on duplicate id', () => {
  const r = createWorkflowRunner({ executor: noop });
  r.register(wf('dup'));
  assert.throws(() => r.register(wf('dup')), /already registered/);
  r.destroy();
});

test('T-R4 fire executes workflow and returns run', async () => {
  const r = createWorkflowRunner({ executor: async () => 'ok' });
  r.register(wf('w2'));
  const run = await r.fire('w2');
  assert.equal(run.status, 'done');
  assert.equal(run.workflowId, 'w2');
  r.destroy();
});

test('T-R5 getRuns returns history after fire', async () => {
  const r = createWorkflowRunner({ executor: noop });
  r.register(wf('w3'));
  await r.fire('w3');
  await r.fire('w3');
  assert.equal(r.getRuns('w3').length, 2);
  r.destroy();
});

test('T-R6 lastRun returns most recent run', async () => {
  const r = createWorkflowRunner({ executor: async () => 42 });
  r.register(wf('w4'));
  await r.fire('w4');
  const last = r.lastRun('w4');
  assert.ok(last !== null);
  assert.equal(last!.status, 'done');
  r.destroy();
});

test('T-R7 lastRun returns null before any fires', () => {
  const r = createWorkflowRunner({ executor: noop });
  r.register(wf('w5'));
  assert.equal(r.lastRun('w5'), null);
  r.destroy();
});

test('T-R8 fire throws for unregistered workflow', async () => {
  const r = createWorkflowRunner({ executor: noop });
  await assert.rejects(r.fire('nope'), /not registered/);
  r.destroy();
});

test('T-R9 unregister removes workflow from list', () => {
  const r = createWorkflowRunner({ executor: noop });
  r.register(wf('w6'));
  r.unregister('w6');
  assert.ok(!r.list().includes('w6'));
  r.destroy();
});

test('T-R10 unregister unknown id is a no-op', () => {
  const r = createWorkflowRunner({ executor: noop });
  assert.doesNotThrow(() => r.unregister('ghost'));
  r.destroy();
});

test('T-R11 onRunComplete callback is invoked', async () => {
  const completed: string[] = [];
  const r = createWorkflowRunner({
    executor: noop,
    onRunComplete: (run) => completed.push(run.workflowId),
  });
  r.register(wf('w7'));
  await r.fire('w7');
  assert.deepEqual(completed, ['w7']);
  r.destroy();
});

test('T-R12 destroy clears all workflows', () => {
  const r = createWorkflowRunner({ executor: noop });
  r.register(wf('a'));
  r.register(wf('b'));
  r.destroy();
  assert.deepEqual(r.list(), []);
});
