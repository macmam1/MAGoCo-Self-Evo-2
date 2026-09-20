/**
 * The LLM router (MASTER_PLAN.md §2.9).
 *
 * The router is the layer that makes the agent provider-agnostic. Nothing above it
 * knows which backend answered, and nothing below it decides policy. Its job is
 * three things:
 *
 * 1. **Tier mapping.** Callers ask for a weight class (`fast`, `balanced`, `strong`);
 *    the router turns that into a concrete model, so a caller never names a model
 *    and a model never hardcodes a caller.
 * 2. **Auto-fallback.** A provider that fails is retried on the next candidate for
 *    that tier, in configured order. Providers themselves never retry — a provider
 *    is a thin transport, and retry policy is a property of the deployment.
 * 3. **Cost attribution.** Every call's usage is accumulated per agent and per
 *    session, so a run's cost is answerable without a billing console.
 *
 * The error contract is deliberate: when every candidate fails, the router throws
 * `NoProviderSucceededError` carrying *all* the underlying causes. A caller that
 * only sees the last error cannot tell whether one provider is down or all of them.
 */

import {
  NoProviderSucceededError,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
  type Tier,
  type Usage,
} from './llm.js';

/** One candidate in a router's chain, in try order. */
export interface RouterCandidate {
  readonly provider: string;
  readonly model: string;
}

/** Configuration for one router (named, so a deployment can have several). */
export interface RouterConfig {
  /** Candidates per tier, ordered by preference. The first that succeeds wins. */
  readonly tiers: Record<Tier, readonly RouterCandidate[]>;
  /** Retry the first candidate this many times before moving to the next. Default 0. */
  readonly retriesPerCandidate?: number;
}

export interface RouterOptions {
  readonly config: RouterConfig;
  /** Every provider the router may use, keyed by its `name`. */
  readonly providers: Record<string, LlmProvider>;
}

/** A running tally of what a router has spent. */
export interface CostLedger {
  readonly calls: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly costUsd: number;
}

/**
 * The router. One instance per agent; cheap to construct.
 *
 * Usage accounting is keyed by `agentId` and `sessionId` from the request, so a
 * caller can answer "what did this run cost" without a separate store.
 */
export class LlmRouter {
  private readonly ledger = new Map<string, CostLedger>();

  constructor(private options: RouterOptions) {}

  /** Resolve a tier to the model the first viable candidate will use. */
  modelFor(tier: Tier): string | undefined {
    const cands = this.options.config.tiers[tier];
    return cands?.[0]?.model;
  }

  /** The accumulated cost for an agent (and optionally one session). */
  cost(agentId: string, sessionId?: string): CostLedger {
    return this.ledger.get(ledgerKey(agentId, sessionId)) ?? zeroLedger;
  }

  /**
   * Perform a request, trying candidates in order until one succeeds.
   *
   * A candidate that throws is logged and the next is tried. If none succeed, the
   * error carries every cause.
   */
  async complete(req: LlmRequest): Promise<LlmResponse> {
    const tier: Tier = req.tier ?? 'balanced';
    const candidates = this.options.config.tiers[tier];
    if (!candidates || candidates.length === 0) {
      throw new Error(`router: tier ${tier} has no candidates configured`);
    }
    const retries = this.options.config.retriesPerCandidate ?? 0;

    const causes: Array<{ provider: string; error: unknown }> = [];
    for (const cand of candidates) {
      const provider = this.options.providers[cand.provider];
      if (!provider) {
        causes.push({ provider: cand.provider, error: new Error('provider is not registered') });
        continue;
      }
      if (!provider.serves(cand.model)) {
        causes.push({ provider: cand.provider, error: new Error(`does not serve model ${cand.model}`) });
        continue;
      }

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const res = await provider.complete({ ...req, model: cand.model });
          await this.recordUsage(req, res);
          return res;
        } catch (e) {
          causes.push({ provider: cand.provider, error: e });
          if (attempt < retries) continue;
        }
      }
    }

    throw new NoProviderSucceededError(tier, causes);
  }

  private async recordUsage(req: LlmRequest, res: LlmResponse): Promise<void> {
    let usage: Usage;
    if (res.stream) {
      try {
        usage = await res.usage;
      } catch {
        return; // a stream whose usage never resolved is not worth failing the call over
      }
    } else {
      usage = res.usage;
    }
    const key = ledgerKey(req.agentId, req.sessionId);
    const prev = this.ledger.get(key) ?? zeroLedger;
    this.ledger.set(key, {
      calls: prev.calls + 1,
      promptTokens: prev.promptTokens + usage.promptTokens,
      completionTokens: prev.completionTokens + usage.completionTokens,
      costUsd: roundUsd(prev.costUsd + usage.costUsd),
    });
  }
}

function ledgerKey(agentId: string, sessionId: string | undefined): string {
  return sessionId ? `${agentId}::${sessionId}` : agentId;
}

const zeroLedger: CostLedger = { calls: 0, promptTokens: 0, completionTokens: 0, costUsd: 0 };

function roundUsd(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}
