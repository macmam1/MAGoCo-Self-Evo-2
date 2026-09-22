/**
 * Pattern Miner — Phase 8.
 *
 * Analyzes reflection history to find recurring patterns:
 * - common failure causes
 * - most-used tools
 * - success rate per agent/task-type
 */

import type { Reflection, ReflectionOutcome } from './reflection.js';

export interface PatternSummary {
  agentId: string;
  totalRuns: number;
  successRate: number;    // 0-1
  avgSteps: number;
  avgTokenCost: number;
  topTools: string[];     // most frequently called
  commonWeaknesses: string[];
  commonLessons: string[];
}

export interface FreqMap { [key: string]: number }

function topN(freq: FreqMap, n: number): string[] {
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export function minePatterns(reflections: Reflection[]): PatternSummary[] {
  // Group by agentId
  const byAgent = new Map<string, Reflection[]>();
  for (const r of reflections) {
    if (!byAgent.has(r.agentId)) byAgent.set(r.agentId, []);
    byAgent.get(r.agentId)!.push(r);
  }

  const summaries: PatternSummary[] = [];

  for (const [agentId, runs] of byAgent) {
    const total = runs.length;
    const successes = runs.filter(r => r.outcome === 'success').length;

    const toolFreq: FreqMap = {};
    const weakFreq: FreqMap = {};
    const lessonFreq: FreqMap = {};
    let totalSteps = 0;
    let totalCost = 0;
    let costCount = 0;

    for (const r of runs) {
      totalSteps += r.steps;
      if (r.tokenCost !== undefined) { totalCost += r.tokenCost; costCount++; }
      for (const t of r.toolsCalled) toolFreq[t] = (toolFreq[t] ?? 0) + 1;
      for (const w of r.weaknesses) weakFreq[w] = (weakFreq[w] ?? 0) + 1;
      for (const l of r.lessons) lessonFreq[l] = (lessonFreq[l] ?? 0) + 1;
    }

    summaries.push({
      agentId,
      totalRuns: total,
      successRate: total === 0 ? 0 : successes / total,
      avgSteps: total === 0 ? 0 : totalSteps / total,
      avgTokenCost: costCount === 0 ? 0 : totalCost / costCount,
      topTools: topN(toolFreq, 5),
      commonWeaknesses: topN(weakFreq, 3),
      commonLessons: topN(lessonFreq, 3),
    });
  }

  return summaries;
}

/** Detect regression: last N runs have worse success rate than baseline */
export function detectRegression(
  reflections: Reflection[],
  agentId: string,
  windowSize = 5,
  threshold = 0.3,
): boolean {
  const runs = reflections
    .filter(r => r.agentId === agentId)
    .sort((a, b) => a.createdAt - b.createdAt);

  if (runs.length < windowSize * 2) return false;

  const baseline = runs.slice(0, -windowSize);
  const recent = runs.slice(-windowSize);

  const baselineRate = baseline.filter(r => r.outcome === 'success').length / baseline.length;
  const recentRate = recent.filter(r => r.outcome === 'success').length / recent.length;

  return baselineRate - recentRate > threshold;
}
