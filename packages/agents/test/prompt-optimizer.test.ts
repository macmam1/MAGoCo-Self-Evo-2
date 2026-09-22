import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createABTest, recordOutcome, selectVariant, closeTest,
  createPromptOptimizer,
} from '../src/prompt-optimizer.js';

const variants = [
  { name: 'A', prompt: 'You are a helpful assistant.' },
  { name: 'B', prompt: 'You are a concise assistant.' },
];

test('T-AB1 createABTest throws with < 2 variants', () => {
  assert.throws(() => createABTest('test', [variants[0]!]), /at least 2/);
});

test('T-AB2 createABTest creates variants with ids', () => {
  const t = createABTest('test', variants);
  assert.equal(t.variants.length, 2);
  assert.ok(t.variants.every(v => typeof v.id === 'string'));
});

test('T-AB3 initial variant stats are zero', () => {
  const t = createABTest('test', variants);
  assert.ok(t.variants.every(v => v.wins === 0 && v.losses === 0 && v.trials === 0));
});

test('T-AB4 recordOutcome increments wins', () => {
  const t = createABTest('test', variants);
  recordOutcome(t, t.variants[0]!.id, true);
  assert.equal(t.variants[0]!.wins, 1);
  assert.equal(t.variants[0]!.trials, 1);
});

test('T-AB5 recordOutcome increments losses', () => {
  const t = createABTest('test', variants);
  recordOutcome(t, t.variants[0]!.id, false);
  assert.equal(t.variants[0]!.losses, 1);
});

test('T-AB6 recordOutcome throws for unknown variant', () => {
  const t = createABTest('test', variants);
  assert.throws(() => recordOutcome(t, 'ghost', true), /not found/);
});

test('T-AB7 selectVariant picks untested variant first', () => {
  const t = createABTest('test', variants);
  recordOutcome(t, t.variants[0]!.id, true);
  const selected = selectVariant(t);
  assert.equal(selected.id, t.variants[1]!.id);
});

test('T-AB8 selectVariant returns a valid variant', () => {
  const t = createABTest('test', variants);
  const v = selectVariant(t);
  assert.ok(t.variants.some(tv => tv.id === v.id));
});

test('T-AB9 closeTest sets closedAt', () => {
  const t = createABTest('test', variants);
  recordOutcome(t, t.variants[0]!.id, true);
  const closed = closeTest(t);
  assert.ok(typeof closed.closedAt === 'number');
});

test('T-AB10 closeTest sets winnerId to highest win rate', () => {
  const t = createABTest('test', variants);
  const [a, b] = t.variants;
  recordOutcome(t, a!.id, true);
  recordOutcome(t, a!.id, true);
  recordOutcome(t, b!.id, false);
  const closed = closeTest(t);
  assert.equal(closed.winnerId, a!.id);
});

test('T-AB11 optimizer createTest and getTest', () => {
  const opt = createPromptOptimizer();
  const t = opt.createTest('my-test', variants);
  assert.deepEqual(opt.getTest(t.id), t);
});

test('T-AB12 optimizer recordOutcome and selectVariant', () => {
  const opt = createPromptOptimizer();
  const t = opt.createTest('test2', variants);
  opt.recordOutcome(t.id, t.variants[0]!.id, true);
  const v = opt.selectVariant(t.id);
  assert.ok(t.variants.some(tv => tv.id === v.id));
});
