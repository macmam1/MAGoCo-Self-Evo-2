import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSubWorkflowRegistry, createSubWorkflowExecutor } from '../src/sub-workflow.js';
import { executeWorkflow } from '../src/engine.js';
import type { WorkflowDef, NodeExecutor } from '../src/types.js';

const noop: NodeExecutor = async () => undefined;

function wf(id: string, nodes: WorkflowDef['nodes'] = []): WorkflowDef {
  return { id, name: id, trigger: 'manual', nodes, edges: [] };
}

test('T-SW1 registry list is empty initially', () => {
  const r = createSubWorkflowRegistry();
  assert.deepEqual(r.list(), []);
});

test('T-SW2 register and get round-trip', () => {
  const r = createSubWorkflowRegistry();
  const def = wf('sub1');
  r.register(def);
  assert.deepEqual(r.get('sub1'), def);
});

test('T-SW3 list returns registered ids', () => {
  const r = createSubWorkflowRegistry();
  r.register(wf('a'));
  r.register(wf('b'));
  assert.ok(r.list().includes('a'));
  assert.ok(r.list().includes('b'));
});

test('T-SW4 remove deletes from registry', () => {
  const r = createSubWorkflowRegistry();
  r.register(wf('x'));
  r.remove('x');
  assert.equal(r.get('x'), undefined);
});

test('T-SW5 executor falls back for regular nodes', async () => {
  const r = createSubWorkflowRegistry();
  let called = false;
  const fallback: NodeExecutor = async () => { called = true; return 'ok'; };
  const exec = createSubWorkflowExecutor(r, fallback);
  const parent = wf('p', [{ id: 'n1', kind: 'action', label: 'Step' }]);
  await executeWorkflow(parent, exec);
  assert.ok(called);
});

test('T-SW6 executor runs sub-workflow when subWorkflowId set', async () => {
  const r = createSubWorkflowRegistry();
  const sub = wf('inner', [{ id: 's1', kind: 'action', label: 'Inner step' }]);
  r.register(sub);
  const exec = createSubWorkflowExecutor(r, noop);
  const parent: WorkflowDef = {
    id: 'outer', name: 'Outer', trigger: 'manual',
    nodes: [{ id: 'n1', kind: 'action', label: 'Run inner', config: { subWorkflowId: 'inner' } }],
    edges: [],
  };
  const run = await executeWorkflow(parent, exec);
  assert.equal(run.status, 'done');
  const output = run.nodes.get('n1')?.output as any;
  assert.ok(typeof output?.subRunId === 'string');
  assert.equal(output?.status, 'done');
});

test('T-SW7 executor throws when sub-workflow not found', async () => {
  const r = createSubWorkflowRegistry();
  const exec = createSubWorkflowExecutor(r, noop);
  const parent: WorkflowDef = {
    id: 'outer2', name: 'Outer', trigger: 'manual',
    nodes: [{ id: 'n1', kind: 'action', label: 'Run missing', config: { subWorkflowId: 'ghost' } }],
    edges: [],
  };
  const run = await executeWorkflow(parent, exec);
  assert.equal(run.status, 'failed');
  assert.match(run.nodes.get('n1')?.error ?? '', /not found/);
});

test('T-SW8 failed sub-workflow propagates failure to parent', async () => {
  const r = createSubWorkflowRegistry();
  const sub: WorkflowDef = {
    id: 'failing', name: 'Failing', trigger: 'manual',
    nodes: [{ id: 'f1', kind: 'action', label: 'Fail' }],
    edges: [],
  };
  r.register(sub);
  const failExec: NodeExecutor = async (node) => {
    if (node.id === 'f1') throw new Error('inner failure');
    return undefined;
  };
  const exec = createSubWorkflowExecutor(r, failExec);
  const parent: WorkflowDef = {
    id: 'outer3', name: 'Outer', trigger: 'manual',
    nodes: [{ id: 'p1', kind: 'action', label: 'Run failing', config: { subWorkflowId: 'failing' } }],
    edges: [],
  };
  const run = await executeWorkflow(parent, exec);
  assert.equal(run.status, 'failed');
});
