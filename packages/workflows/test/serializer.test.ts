import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportWorkflow, importWorkflow } from '../src/serializer.js';
import type { WorkflowDef } from '../src/types.js';

const sample: WorkflowDef = {
  id: 'wf-1', name: 'Test WF', trigger: 'manual',
  nodes: [{ id: 'n1', kind: 'action', label: 'Step 1' }],
  edges: [],
};

test('T-SER1 export produces valid JSON string', () => {
  const json = exportWorkflow(sample);
  assert.ok(typeof json === 'string');
  assert.doesNotThrow(() => JSON.parse(json));
});

test('T-SER2 exported JSON contains version 1', () => {
  const json = exportWorkflow(sample);
  assert.equal(JSON.parse(json).version, 1);
});

test('T-SER3 export → import round-trip preserves def', () => {
  const json = exportWorkflow(sample);
  const def = importWorkflow(json);
  assert.equal(def.id, sample.id);
  assert.equal(def.name, sample.name);
  assert.equal(def.nodes.length, 1);
});

test('T-SER4 import throws on invalid JSON', () => {
  assert.throws(() => importWorkflow('not json'), /invalid JSON/);
});

test('T-SER5 import throws on wrong version', () => {
  assert.throws(() => importWorkflow(JSON.stringify({ version: 2, workflow: sample })), /unsupported/);
});

test('T-SER6 import throws on missing workflow structure', () => {
  assert.throws(() => importWorkflow(JSON.stringify({ version: 1, workflow: {} })), /invalid workflow/);
});

test('T-SER7 exportedAt is a recent timestamp', () => {
  const before = Date.now();
  const json = exportWorkflow(sample);
  const after = Date.now();
  const { exportedAt } = JSON.parse(json);
  assert.ok(exportedAt >= before && exportedAt <= after);
});
