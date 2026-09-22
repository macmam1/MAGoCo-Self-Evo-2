import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reflect, createReflectionStore } from '../src/reflection.js';

test('T-RF1 reflect returns reflection with correct fields', () => {
  const r = reflect({ taskId: 't1', agentId: 'a1', outcome: 'success' });
  assert.equal(r.taskId, 't1');
  assert.equal(r.agentId, 'a1');
  assert.equal(r.outcome, 'success');
  assert.ok(typeof r.id === 'string' && r.id.length > 0);
  assert.ok(typeof r.createdAt === 'number');
});

test('T-RF2 reflect defaults to empty arrays', () => {
  const r = reflect({ taskId: 't1', agentId: 'a1', outcome: 'failure' });
  assert.deepEqual(r.strengths, []);
  assert.deepEqual(r.weaknesses, []);
  assert.deepEqual(r.lessons, []);
  assert.deepEqual(r.toolsCalled, []);
  assert.equal(r.steps, 0);
});

test('T-RF3 reflect accepts all optional fields', () => {
  const r = reflect({
    taskId: 't1', agentId: 'a1', outcome: 'partial',
    strengths: ['fast'], weaknesses: ['missed edge case'],
    lessons: ['add more tests'], toolsCalled: ['search', 'edit'],
    steps: 5, tokenCost: 1200,
  });
  assert.deepEqual(r.strengths, ['fast']);
  assert.deepEqual(r.toolsCalled, ['search', 'edit']);
  assert.equal(r.steps, 5);
  assert.equal(r.tokenCost, 1200);
});

test('T-RF4 store save and getAll', () => {
  const s = createReflectionStore();
  const r = reflect({ taskId: 't1', agentId: 'a1', outcome: 'success' });
  s.save(r);
  assert.equal(s.getAll().length, 1);
  assert.equal(s.getAll()[0]!.id, r.id);
});

test('T-RF5 getByTask filters correctly', () => {
  const s = createReflectionStore();
  s.save(reflect({ taskId: 'ta', agentId: 'a1', outcome: 'success' }));
  s.save(reflect({ taskId: 'tb', agentId: 'a1', outcome: 'failure' }));
  assert.equal(s.getByTask('ta').length, 1);
  assert.equal(s.getByTask('ta')[0]!.taskId, 'ta');
});

test('T-RF6 getByAgent filters correctly', () => {
  const s = createReflectionStore();
  s.save(reflect({ taskId: 't1', agentId: 'ag1', outcome: 'success' }));
  s.save(reflect({ taskId: 't2', agentId: 'ag2', outcome: 'failure' }));
  assert.equal(s.getByAgent('ag1').length, 1);
  assert.equal(s.getByAgent('ag2').length, 1);
});

test('T-RF7 clear removes all reflections', () => {
  const s = createReflectionStore();
  s.save(reflect({ taskId: 't1', agentId: 'a1', outcome: 'success' }));
  s.clear();
  assert.equal(s.getAll().length, 0);
});

test('T-RF8 multiple reflections per task', () => {
  const s = createReflectionStore();
  s.save(reflect({ taskId: 't1', agentId: 'a1', outcome: 'failure' }));
  s.save(reflect({ taskId: 't1', agentId: 'a1', outcome: 'success' }));
  assert.equal(s.getByTask('t1').length, 2);
});

test('T-RF9 getByTask returns empty for unknown task', () => {
  const s = createReflectionStore();
  assert.deepEqual(s.getByTask('nope'), []);
});

test('T-RF10 each reflection has unique id', () => {
  const s = createReflectionStore();
  for (let i = 0; i < 5; i++) {
    s.save(reflect({ taskId: `t${i}`, agentId: 'a1', outcome: 'success' }));
  }
  const ids = new Set(s.getAll().map(r => r.id));
  assert.equal(ids.size, 5);
});

test('T-RF11 tokenCost is optional', () => {
  const r = reflect({ taskId: 't1', agentId: 'a1', outcome: 'success' });
  assert.equal(r.tokenCost, undefined);
});

test('T-RF12 outcome can be partial', () => {
  const r = reflect({ taskId: 't1', agentId: 'a1', outcome: 'partial' });
  assert.equal(r.outcome, 'partial');
});
