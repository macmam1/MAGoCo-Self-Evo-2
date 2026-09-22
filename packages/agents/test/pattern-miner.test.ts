import assert from 'node:assert/strict';
import { test } from 'node:test';
import { minePatterns, detectRegression } from '../src/pattern-miner.js';
import { reflect } from '../src/reflection.js';
import type { Reflection } from '../src/reflection.js';

function r(agentId: string, outcome: 'success'|'failure'|'partial', opts: Partial<Reflection> = {}): Reflection {
  return reflect({ taskId: `t-${Math.random()}`, agentId, outcome, ...opts });
}

test('T-PM1 empty input returns empty summaries', () => {
  assert.deepEqual(minePatterns([]), []);
});

test('T-PM2 single success gives successRate 1', () => {
  const s = minePatterns([r('a1', 'success')]);
  assert.equal(s[0]!.successRate, 1);
});

test('T-PM3 single failure gives successRate 0', () => {
  const s = minePatterns([r('a1', 'failure')]);
  assert.equal(s[0]!.successRate, 0);
});

test('T-PM4 mixed outcomes calculate correct rate', () => {
  const runs = [r('a1','success'), r('a1','success'), r('a1','failure')];
  const s = minePatterns(runs);
  assert.ok(Math.abs(s[0]!.successRate - 2/3) < 0.001);
});

test('T-PM5 topTools sorted by frequency', () => {
  const runs = [
    r('a1','success', { toolsCalled: ['search','edit','search'] }),
    r('a1','success', { toolsCalled: ['search'] }),
  ];
  const s = minePatterns(runs);
  assert.equal(s[0]!.topTools[0], 'search');
});

test('T-PM6 avgSteps calculated correctly', () => {
  const runs = [r('a1','success',{steps:4}), r('a1','success',{steps:6})];
  const s = minePatterns(runs);
  assert.equal(s[0]!.avgSteps, 5);
});

test('T-PM7 avgTokenCost ignores undefined', () => {
  const runs = [
    r('a1','success',{tokenCost:100}),
    r('a1','success'),  // no tokenCost
    r('a1','success',{tokenCost:200}),
  ];
  const s = minePatterns(runs);
  assert.equal(s[0]!.avgTokenCost, 150);
});

test('T-PM8 commonWeaknesses ordered by frequency', () => {
  const runs = [
    r('a1','failure',{weaknesses:['timeout','timeout','missing context']}),
    r('a1','failure',{weaknesses:['timeout']}),
  ];
  const s = minePatterns(runs);
  assert.equal(s[0]!.commonWeaknesses[0], 'timeout');
});

test('T-PM9 multiple agents produce separate summaries', () => {
  const runs = [r('ag1','success'), r('ag2','failure')];
  const s = minePatterns(runs);
  assert.equal(s.length, 2);
  const ids = s.map(x => x.agentId).sort();
  assert.deepEqual(ids, ['ag1','ag2']);
});

test('T-PM10 totalRuns matches input count', () => {
  const runs = Array.from({length:7}, () => r('a1','success'));
  const s = minePatterns(runs);
  assert.equal(s[0]!.totalRuns, 7);
});

test('T-PM11 detectRegression returns false when insufficient data', () => {
  const runs = [r('a1','success'), r('a1','failure')];
  assert.equal(detectRegression(runs, 'a1', 5, 0.3), false);
});

test('T-PM12 detectRegression detects drop in success rate', () => {
  const runs: Reflection[] = [
    ...Array.from({length:6}, () => r('a1','success')),
    ...Array.from({length:5}, () => r('a1','failure')),
  ];
  assert.equal(detectRegression(runs, 'a1', 5, 0.3), true);
});
