import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRollbackManager } from '../src/rollback.js';

test('T-RB1 size is 0 initially', () => {
  const m = createRollbackManager();
  assert.equal(m.size(), 0);
});

test('T-RB2 save increments size', () => {
  const m = createRollbackManager();
  m.save('v1', { prompt: 'hello' });
  assert.equal(m.size(), 1);
});

test('T-RB3 latest returns last saved', () => {
  const m = createRollbackManager();
  m.save('v1', { prompt: 'a' });
  m.save('v2', { prompt: 'b' });
  assert.equal(m.latest()?.label, 'v2');
});

test('T-RB4 latest returns null when empty', () => {
  const m = createRollbackManager();
  assert.equal(m.latest(), null);
});

test('T-RB5 list returns all snapshots', () => {
  const m = createRollbackManager();
  m.save('v1', {}); m.save('v2', {});
  assert.equal(m.list().length, 2);
});

test('T-RB6 rollback to id creates new entry', () => {
  const m = createRollbackManager();
  const s1 = m.save('v1', { x: 1 });
  m.save('v2', { x: 2 });
  const rolled = m.rollback(s1.id);
  assert.ok(rolled.label.includes('v1'));
  assert.deepEqual(rolled.data, { x: 1 });
  assert.equal(m.size(), 3);
});

test('T-RB7 rollback throws for unknown id', () => {
  const m = createRollbackManager();
  assert.throws(() => m.rollback('ghost'), /not found/);
});

test('T-RB8 rollbackLast reverts to previous', () => {
  const m = createRollbackManager();
  m.save('v1', { prompt: 'original' });
  m.save('v2', { prompt: 'updated' });
  const rolled = m.rollbackLast();
  assert.deepEqual(rolled.data, { prompt: 'original' });
});

test('T-RB9 rollbackLast throws when only one snapshot', () => {
  const m = createRollbackManager();
  m.save('v1', {});
  assert.throws(() => m.rollbackLast(), /no previous/);
});

test('T-RB10 clear resets manager', () => {
  const m = createRollbackManager();
  m.save('v1', {}); m.save('v2', {});
  m.clear();
  assert.equal(m.size(), 0);
});

test('T-RB11 save preserves data as copy', () => {
  const m = createRollbackManager();
  const data = { prompt: 'original' };
  m.save('v1', data);
  data.prompt = 'modified';
  assert.equal(m.latest()?.data.prompt, 'original');
});

test('T-RB12 multiple rollbacks chain correctly', () => {
  const m = createRollbackManager();
  const s1 = m.save('v1', { n: 1 });
  m.save('v2', { n: 2 });
  m.rollback(s1.id);
  m.rollbackLast();
  assert.ok(m.size() >= 4);
});
