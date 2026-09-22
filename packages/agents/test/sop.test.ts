import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createSOPRegistry, instantiateSOP, refinePlan, BUILTIN_SOPS,
} from '../src/sop.js';

test('T-SOP1 BUILTIN_SOPS has feature and bug SOPs', () => {
  assert.ok(BUILTIN_SOPS.some(s => s.id === 'sop-feature'));
  assert.ok(BUILTIN_SOPS.some(s => s.id === 'sop-bug'));
});

test('T-SOP2 registry register and get round-trip', () => {
  const r = createSOPRegistry();
  const sop = BUILTIN_SOPS[0]!;
  r.register(sop);
  assert.deepEqual(r.get(sop.id), sop);
});

test('T-SOP3 registry list returns all registered', () => {
  const r = createSOPRegistry();
  for (const s of BUILTIN_SOPS) r.register(s);
  assert.equal(r.list().length, BUILTIN_SOPS.length);
});

test('T-SOP4 registry remove deletes sop', () => {
  const r = createSOPRegistry();
  const sop = BUILTIN_SOPS[0]!;
  r.register(sop);
  r.remove(sop.id);
  assert.equal(r.get(sop.id), undefined);
});

test('T-SOP5 instantiateSOP creates plan with pending steps', () => {
  const sop = BUILTIN_SOPS[0]!;
  const plan = instantiateSOP(sop, 'Add login');
  assert.equal(plan.sopId, sop.id);
  assert.equal(plan.taskTitle, 'Add login');
  assert.equal(plan.iteration, 1);
  assert.ok(plan.steps.every(s => s.status === 'pending'));
});

test('T-SOP6 plan steps match SOP steps', () => {
  const sop = BUILTIN_SOPS[0]!;
  const plan = instantiateSOP(sop, 'task');
  assert.equal(plan.steps.length, sop.steps.length);
  for (let i = 0; i < sop.steps.length; i++) {
    assert.equal(plan.steps[i]!.action, sop.steps[i]!.action);
  }
});

test('T-SOP7 refinePlan increments iteration', () => {
  const sop = BUILTIN_SOPS[0]!;
  const plan = instantiateSOP(sop, 'task');
  const refined = refinePlan(plan, 'needs more detail');
  assert.equal(refined.iteration, 2);
});

test('T-SOP8 refinePlan appends feedback', () => {
  const sop = BUILTIN_SOPS[0]!;
  const plan = instantiateSOP(sop, 'task');
  const r1 = refinePlan(plan, 'feedback 1');
  const r2 = refinePlan(r1, 'feedback 2');
  assert.deepEqual(r2.feedback, ['feedback 1', 'feedback 2']);
});

test('T-SOP9 refinePlan resets non-done steps to pending', () => {
  const sop = BUILTIN_SOPS[1]!; // bug fix SOP
  const plan = instantiateSOP(sop, 'fix bug');
  plan.steps[0]!.status = 'done';
  plan.steps[1]!.status = 'skipped';
  const refined = refinePlan(plan, 'try again');
  assert.equal(refined.steps[0]!.status, 'done');   // preserved
  assert.equal(refined.steps[1]!.status, 'pending'); // reset
});

test('T-SOP10 refinePlan produces new id', () => {
  const sop = BUILTIN_SOPS[0]!;
  const plan = instantiateSOP(sop, 'task');
  const refined = refinePlan(plan, 'fb');
  assert.notEqual(refined.id, plan.id);
});

test('T-SOP11 plan has createdAt timestamp', () => {
  const sop = BUILTIN_SOPS[0]!;
  const before = Date.now();
  const plan = instantiateSOP(sop, 'task');
  assert.ok(plan.createdAt >= before);
});

test('T-SOP12 multiple refinements chain correctly', () => {
  const sop = BUILTIN_SOPS[0]!;
  let plan = instantiateSOP(sop, 'task');
  for (let i = 1; i <= 5; i++) {
    plan = refinePlan(plan, `feedback ${i}`);
  }
  assert.equal(plan.iteration, 6);
  assert.equal(plan.feedback.length, 5);
});
