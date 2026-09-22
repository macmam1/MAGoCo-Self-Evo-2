/**
 * Prompt Optimizer — Phase 8.
 *
 * A/B testing for system prompts: tracks which variant
 * performs better and auto-selects the winner.
 */

import { randomUUID } from 'node:crypto';

export interface PromptVariant {
  id: string;
  name: string;
  prompt: string;
  wins: number;
  losses: number;
  trials: number;
}

export interface ABTest {
  id: string;
  name: string;
  variants: PromptVariant[];
  createdAt: number;
  closedAt?: number;
  winnerId?: string;
}

export function createABTest(name: string, prompts: { name: string; prompt: string }[]): ABTest {
  if (prompts.length < 2) throw new Error('A/B test requires at least 2 variants');
  return {
    id: randomUUID(),
    name,
    variants: prompts.map(p => ({ id: randomUUID(), ...p, wins: 0, losses: 0, trials: 0 })),
    createdAt: Date.now(),
  };
}

/** Record outcome for a variant */
export function recordOutcome(test: ABTest, variantId: string, won: boolean): void {
  const v = test.variants.find(v => v.id === variantId);
  if (!v) throw new Error(`variant ${variantId} not found`);
  v.trials++;
  if (won) v.wins++; else v.losses++;
}

/** Pick the variant with highest win rate (UCB1 exploration) */
export function selectVariant(test: ABTest): PromptVariant {
  const totalTrials = test.variants.reduce((s, v) => s + v.trials, 0);

  // Untested variants get priority
  const untested = test.variants.find(v => v.trials === 0);
  if (untested) return untested;

  // UCB1: winRate + sqrt(2 * ln(total) / trials)
  let best = test.variants[0]!;
  let bestScore = -Infinity;

  for (const v of test.variants) {
    const winRate = v.trials === 0 ? 0 : v.wins / v.trials;
    const exploration = Math.sqrt((2 * Math.log(totalTrials)) / v.trials);
    const score = winRate + exploration;
    if (score > bestScore) { bestScore = score; best = v; }
  }

  return best;
}

/** Close test and declare winner (highest win rate) */
export function closeTest(test: ABTest): ABTest {
  const winner = test.variants
    .filter(v => v.trials > 0)
    .sort((a, b) => (b.wins / b.trials) - (a.wins / a.trials))[0];

  const closed: ABTest = {
    ...test,
    closedAt: Date.now(),
  };
  if (winner) closed.winnerId = winner.id;
  return closed;
}

/** Prompt optimizer: manages multiple A/B tests */
export function createPromptOptimizer() {
  const tests = new Map<string, ABTest>();

  return {
    createTest(name: string, prompts: { name: string; prompt: string }[]): ABTest {
      const test = createABTest(name, prompts);
      tests.set(test.id, test);
      return test;
    },
    getTest(id: string): ABTest | null { return tests.get(id) ?? null; },
    listTests(): ABTest[] { return [...tests.values()]; },
    recordOutcome(testId: string, variantId: string, won: boolean): void {
      const t = tests.get(testId);
      if (!t) throw new Error(`test ${testId} not found`);
      recordOutcome(t, variantId, won);
    },
    selectVariant(testId: string): PromptVariant {
      const t = tests.get(testId);
      if (!t) throw new Error(`test ${testId} not found`);
      return selectVariant(t);
    },
    closeTest(testId: string): ABTest {
      const t = tests.get(testId);
      if (!t) throw new Error(`test ${testId} not found`);
      const closed = closeTest(t);
      tests.set(testId, closed);
      return closed;
    },
  };
}
