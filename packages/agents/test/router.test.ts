import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LlmRouter } from '../src/router.js';
import { NoProviderSucceededError, type LlmProvider, type LlmRequest, type LlmResponse } from '../src/llm.js';

/** A provider that fails the first N calls then succeeds, to exercise fallback. */
class FlakyProvider implements LlmProvider {
  constructor(
    readonly name: string,
    private failTimes: number,
    private reply: string,
  ) {}
  calls = 0;
  serves(): boolean {
    return true;
  }
  async complete(req: LlmRequest): Promise<LlmResponse> {
    this.calls++;
    if (this.calls <= this.failTimes) {
      throw new Error(`${this.name} is down (call ${this.calls})`);
    }
    void req;
    return {
      stream: false,
      message: { role: 'assistant', content: this.reply },
      usage: { promptTokens: 10, completionTokens: 5, costUsd: 0.001, countedByProvider: true },
      provider: this.name,
      model: 'm',
      latencyMs: 1,
    };
  }
}

/** A provider that always fails, for the all-fail path. */
class DeadProvider implements LlmProvider {
  constructor(readonly name: string) {}
  serves(): boolean {
    return true;
  }
  async complete(): Promise<LlmResponse> {
    throw new Error(`${this.name} permanently down`);
  }
}

const req = (tier: 'fast' | 'balanced' | 'strong' = 'balanced'): LlmRequest => ({
  tier,
  messages: [{ role: 'user' as const, content: 'hi' }],
  agentId: 'agent-1',
  sessionId: 'sess-1',
});

test('router: the first healthy candidate answers', async () => {
  const a = new FlakyProvider('a', 0, 'from-a');
  const router = new LlmRouter({
    config: { tiers: { fast: [], balanced: [{ provider: 'a', model: 'm' }], strong: [] } },
    providers: { a },
  });
  const res = await router.complete(req());
  assert.equal(res.stream, false);
  if (!res.stream) assert.equal(res.message.content, 'from-a');
});

test('router: falls over to the next candidate when the first fails', async () => {
  const a = new FlakyProvider('a', 5, 'from-a'); // always down
  const b = new FlakyProvider('b', 0, 'from-b');
  const router = new LlmRouter({
    config: { tiers: { fast: [], balanced: [{ provider: 'a', model: 'm' }, { provider: 'b', model: 'm' }], strong: [] } },
    providers: { a, b },
  });
  const res = await router.complete(req());
  if (!res.stream) assert.equal(res.message.content, 'from-b');
  assert.equal(a.calls, 1);
  assert.equal(b.calls, 1);
});

test('router: retries the first candidate before moving on', async () => {
  const a = new FlakyProvider('a', 2, 'from-a'); // recovers on the 3rd attempt
  const b = new FlakyProvider('b', 0, 'from-b');
  const router = new LlmRouter({
    config: {
      tiers: { fast: [], balanced: [{ provider: 'a', model: 'm' }, { provider: 'b', model: 'm' }], strong: [] },
      retriesPerCandidate: 2,
    },
    providers: { a, b },
  });
  const res = await router.complete(req());
  if (!res.stream) assert.equal(res.message.content, 'from-a');
  assert.equal(a.calls, 3);
  assert.equal(b.calls, 0);
});

test('router: when every candidate fails, the error lists every cause', async () => {
  const a = new DeadProvider('a');
  const b = new DeadProvider('b');
  const router = new LlmRouter({
    config: { tiers: { fast: [], balanced: [{ provider: 'a', model: 'm' }, { provider: 'b', model: 'm' }], strong: [] } },
    providers: { a, b },
  });
  await assert.rejects(
    () => router.complete(req()),
    (e: unknown) => {
      assert.ok(e instanceof NoProviderSucceededError);
      assert.equal(e.causes.length, 2);
      assert.equal(e.causes[0]!.provider, 'a');
      assert.equal(e.causes[1]!.provider, 'b');
      return true;
    },
  );
});

test('router: a candidate whose provider is unregistered is a cause, not a crash', async () => {
  const router = new LlmRouter({
    config: { tiers: { fast: [], balanced: [{ provider: 'ghost', model: 'm' }], strong: [] } },
    providers: {},
  });
  await assert.rejects(() => router.complete(req()), NoProviderSucceededError);
});

test('router: a tier with no candidates is a configuration error', async () => {
  const router = new LlmRouter({
    config: { tiers: { fast: [], balanced: [], strong: [] } },
    providers: {},
  });
  await assert.rejects(() => router.complete(req()), /no candidates configured/);
});

test('router: accumulates cost per agent and session', async () => {
  const a = new FlakyProvider('a', 0, 'ok');
  const router = new LlmRouter({
    config: { tiers: { fast: [], balanced: [{ provider: 'a', model: 'm' }], strong: [] } },
    providers: { a },
  });
  await router.complete(req());
  await router.complete(req());
  const cost = router.cost('agent-1', 'sess-1');
  assert.equal(cost.calls, 2);
  assert.equal(cost.promptTokens, 20);
  assert.equal(cost.completionTokens, 10);
  assert.equal(cost.costUsd, 0.002);
});

test('router: cost is isolated by agent', async () => {
  const a = new FlakyProvider('a', 0, 'ok');
  const router = new LlmRouter({
    config: { tiers: { fast: [], balanced: [{ provider: 'a', model: 'm' }], strong: [] } },
    providers: { a },
  });
  await router.complete(req());
  assert.equal(router.cost('other').calls, 0);
});

test('router: modelFor resolves a tier to its first candidate', () => {
  const router = new LlmRouter({
    config: {
      tiers: {
        fast: [{ provider: 'a', model: 'mini' }],
        balanced: [{ provider: 'a', model: 'midi' }],
        strong: [{ provider: 'a', model: 'maxi' }],
      },
    },
    providers: {},
  });
  assert.equal(router.modelFor('fast'), 'mini');
  assert.equal(router.modelFor('balanced'), 'midi');
  assert.equal(router.modelFor('strong'), 'maxi');
});

test('router: a provider that cannot serve the model is skipped with a cause', async () => {
  const picky: LlmProvider = {
    name: 'picky',
    serves: (m) => m === 'only-this',
    complete: async () => {
      throw new Error('unreachable');
    },
  };
  const router = new LlmRouter({
    config: { tiers: { fast: [], balanced: [{ provider: 'picky', model: 'wrong' }], strong: [] } },
    providers: { picky },
  });
  await assert.rejects(() => router.complete(req()), /does not serve model wrong/);
});
