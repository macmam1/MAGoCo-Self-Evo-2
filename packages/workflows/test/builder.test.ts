/**
 * Workflow Builder tests — Phase 5.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWorkflowFromPrompt, createRuleBasedParser } from '../src/builder.js';

test('T-BLD1 simple prompt produces nodes and edges', async () => {
  const { def, warnings } = await buildWorkflowFromPrompt('fetch data, process it, save results');
  assert.ok(def.nodes.length >= 2);
  assert.ok(def.edges.length === def.nodes.length - 1);
  assert.equal(warnings.length, 0);
});

test('T-BLD2 schedule keyword sets trigger to schedule', async () => {
  const { def } = await buildWorkflowFromPrompt('every day fetch reports and send email');
  assert.equal(def.trigger, 'schedule');
});

test('T-BLD3 webhook keyword sets trigger to webhook', async () => {
  const { def } = await buildWorkflowFromPrompt('on webhook call process the payload');
  assert.equal(def.trigger, 'webhook');
});

test('T-BLD4 event keyword sets trigger to event', async () => {
  const { def } = await buildWorkflowFromPrompt('when task.done event fires, send notification');
  assert.equal(def.trigger, 'event');
});

test('T-BLD5 no trigger keyword defaults to manual', async () => {
  const { def } = await buildWorkflowFromPrompt('run the pipeline');
  assert.equal(def.trigger, 'manual');
});

test('T-BLD6 if keyword creates a condition node', async () => {
  const { def } = await buildWorkflowFromPrompt('fetch data, if success save it, else log error');
  const hasCondition = def.nodes.some(n => n.kind === 'condition');
  assert.ok(hasCondition);
});

test('T-BLD7 approve keyword creates hitl-gate node', async () => {
  const { def } = await buildWorkflowFromPrompt('prepare report, approve it, then publish');
  const hasHitl = def.nodes.some(n => n.kind === 'hitl-gate');
  assert.ok(hasHitl);
});

test('T-BLD8 edges form a linear chain', async () => {
  const { def } = await buildWorkflowFromPrompt('step one, step two, step three');
  const nodeIds = def.nodes.map(n => n.id);
  for (let i = 0; i < def.edges.length; i++) {
    assert.equal(def.edges[i]!.from, nodeIds[i]);
    assert.equal(def.edges[i]!.to, nodeIds[i + 1]);
  }
});

test('T-BLD9 empty prompt produces warning and fallback node', async () => {
  const { def, warnings } = await buildWorkflowFromPrompt('');
  assert.ok(warnings.length > 0);
  assert.equal(def.nodes.length, 1);
});

test('T-BLD10 def has valid id and name', async () => {
  const { def } = await buildWorkflowFromPrompt('do something useful');
  assert.ok(typeof def.id === 'string' && def.id.length > 0);
  assert.ok(typeof def.name === 'string' && def.name.length > 0);
});

test('T-BLD11 custom parser is used when provided', async () => {
  const custom = {
    async parse() {
      return {
        def: { id: 'custom', name: 'Custom', trigger: 'manual' as const, nodes: [], edges: [] },
        warnings: [],
      };
    },
  };
  const { def } = await buildWorkflowFromPrompt('anything', custom);
  assert.equal(def.id, 'custom');
});

test('T-BLD12 node labels are trimmed substrings of prompt sentences', async () => {
  const { def } = await buildWorkflowFromPrompt('fetch the data, clean it up');
  for (const node of def.nodes) {
    assert.ok(node.label.length <= 80);
    assert.ok(node.label.trim() === node.label);
  }
});
