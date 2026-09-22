/**
 * Workflow Trigger System tests — Phase 5.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerTrigger, handleWebhook, emitEvent } from '../src/triggers.js';
import type { WorkflowDef } from '../src/types.js';

function wf(id: string, trigger: WorkflowDef['trigger']): WorkflowDef {
  return { id, name: id, trigger, nodes: [], edges: [] };
}

// ── Manual ────────────────────────────────────────────────────────────────────

test('T-TR1 manual trigger registers without error', () => {
  const fired: string[] = [];
  const h = registerTrigger(wf('m1', 'manual'), {}, (id) => fired.push(id));
  assert.equal(h.kind, 'manual');
  assert.equal(h.workflowId, 'm1');
  assert.ok(typeof h.triggerId === 'string');
  h.stop(); // no-op
  assert.deepEqual(fired, []);
});

// ── Webhook ───────────────────────────────────────────────────────────────────

test('T-TR2 webhook trigger fires on matching POST', () => {
  const fired: unknown[] = [];
  const h = registerTrigger(wf('wh1', 'webhook'), {}, (_, p) => fired.push(p));
  const ok = handleWebhook('wh1', undefined, { data: 1 });
  assert.ok(ok);
  assert.deepEqual(fired, [{ data: 1 }]);
  h.stop();
});

test('T-TR3 webhook with secret rejects wrong secret', () => {
  const fired: unknown[] = [];
  const h = registerTrigger(wf('wh2', 'webhook'), { secret: 'abc' }, () => fired.push(1));
  const ok = handleWebhook('wh2', 'wrong', {});
  assert.equal(ok, false);
  assert.deepEqual(fired, []);
  h.stop();
});

test('T-TR4 webhook with correct secret fires', () => {
  const fired: unknown[] = [];
  const h = registerTrigger(wf('wh3', 'webhook'), { secret: 'abc' }, () => fired.push(1));
  const ok = handleWebhook('wh3', 'abc', {});
  assert.equal(ok, true);
  assert.equal(fired.length, 1);
  h.stop();
});

test('T-TR5 webhook stop removes registration', () => {
  const h = registerTrigger(wf('wh4', 'webhook'), {}, () => {});
  h.stop();
  const ok = handleWebhook('wh4', undefined, {});
  assert.equal(ok, false);
});

test('T-TR6 handleWebhook returns false for unknown workflow', () => {
  assert.equal(handleWebhook('unknown-wf', undefined, {}), false);
});

// ── Event ─────────────────────────────────────────────────────────────────────

test('T-TR7 event trigger fires on matching emitEvent', () => {
  const fired: unknown[] = [];
  const h = registerTrigger(wf('ev1', 'event'), { eventName: 'task.done' }, (_, p) => fired.push(p));
  const count = emitEvent('task.done', { result: 42 });
  assert.ok(count >= 1);
  assert.ok(fired.some((p: any) => p?.result === 42));
  h.stop();
});

test('T-TR8 event trigger does not fire on different event name', () => {
  const fired: unknown[] = [];
  const h = registerTrigger(wf('ev2', 'event'), { eventName: 'x.done' }, () => fired.push(1));
  emitEvent('y.done');
  assert.deepEqual(fired, []);
  h.stop();
});

test('T-TR9 event trigger stop removes listener', () => {
  const fired: unknown[] = [];
  const h = registerTrigger(wf('ev3', 'event'), { eventName: 'stop.test' }, () => fired.push(1));
  h.stop();
  emitEvent('stop.test');
  assert.deepEqual(fired, []);
});

test('T-TR10 emitEvent returns count of fired triggers', () => {
  const h1 = registerTrigger(wf('ev4', 'event'), { eventName: 'multi' }, () => {});
  const h2 = registerTrigger(wf('ev5', 'event'), { eventName: 'multi' }, () => {});
  const count = emitEvent('multi');
  assert.ok(count >= 2);
  h1.stop();
  h2.stop();
});

// ── Schedule ──────────────────────────────────────────────────────────────────

test('T-TR11 schedule trigger fires after interval', async () => {
  const fired: number[] = [];
  const h = registerTrigger(wf('sc1', 'schedule'), { intervalMs: 20 }, () => fired.push(Date.now()));
  await new Promise(r => setTimeout(r, 60));
  h.stop();
  assert.ok(fired.length >= 1, `expected >=1 fires, got ${fired.length}`);
});

test('T-TR12 schedule trigger stop prevents further fires', async () => {
  const fired: number[] = [];
  const h = registerTrigger(wf('sc2', 'schedule'), { intervalMs: 20 }, () => fired.push(1));
  h.stop();
  await new Promise(r => setTimeout(r, 60));
  assert.equal(fired.length, 0);
});
