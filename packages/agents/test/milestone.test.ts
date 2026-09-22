import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMilestoneTracker } from '../src/milestone.js';

test('T-MS1 list is empty initially', () => {
  const t = createMilestoneTracker();
  assert.deepEqual(t.list(), []);
});

test('T-MS2 add returns milestone with id and pending status', () => {
  const t = createMilestoneTracker();
  const m = t.add('MVP', 'first release', ['s1', 's2']);
  assert.ok(typeof m.id === 'string' && m.id.length > 0);
  assert.equal(m.status, 'pending');
  assert.equal(m.title, 'MVP');
  assert.deepEqual(m.subtaskIds, ['s1', 's2']);
});

test('T-MS3 get returns added milestone', () => {
  const t = createMilestoneTracker();
  const m = t.add('Beta', 'beta release');
  assert.deepEqual(t.get(m.id), m);
});

test('T-MS4 get returns null for unknown id', () => {
  const t = createMilestoneTracker();
  assert.equal(t.get('nope'), null);
});

test('T-MS5 update changes status', () => {
  const t = createMilestoneTracker();
  const m = t.add('Phase 1', '');
  t.update(m.id, 'in-progress');
  assert.equal(t.get(m.id)?.status, 'in-progress');
});

test('T-MS6 update to done sets completedAt', () => {
  const t = createMilestoneTracker();
  const m = t.add('Done test', '');
  const before = Date.now();
  t.update(m.id, 'done');
  const after = Date.now();
  const updated = t.get(m.id)!;
  assert.ok(updated.completedAt! >= before && updated.completedAt! <= after);
});

test('T-MS7 update throws for unknown id', () => {
  const t = createMilestoneTracker();
  assert.throws(() => t.update('ghost', 'done'), /not found/);
});

test('T-MS8 remove deletes milestone', () => {
  const t = createMilestoneTracker();
  const m = t.add('To remove', '');
  t.remove(m.id);
  assert.equal(t.get(m.id), null);
});

test('T-MS9 progress returns zeros when empty', () => {
  const t = createMilestoneTracker();
  const p = t.progress();
  assert.equal(p.total, 0);
  assert.equal(p.percent, 0);
});

test('T-MS10 progress calculates percent correctly', () => {
  const t = createMilestoneTracker();
  const m1 = t.add('M1', '');
  const m2 = t.add('M2', '');
  const m3 = t.add('M3', '');
  const m4 = t.add('M4', '');
  t.update(m1.id, 'done');
  t.update(m2.id, 'done');
  t.update(m3.id, 'in-progress');
  const p = t.progress();
  assert.equal(p.total, 4);
  assert.equal(p.done, 2);
  assert.equal(p.inProgress, 1);
  assert.equal(p.pending, 1);
  assert.equal(p.percent, 50);
});

test('T-MS11 100 percent when all done', () => {
  const t = createMilestoneTracker();
  const m = t.add('All done', '');
  t.update(m.id, 'done');
  assert.equal(t.progress().percent, 100);
});

test('T-MS12 blocked status is tracked', () => {
  const t = createMilestoneTracker();
  const m = t.add('Blocked', '');
  t.update(m.id, 'blocked');
  assert.equal(t.progress().blocked, 1);
});
