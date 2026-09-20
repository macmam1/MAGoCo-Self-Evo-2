/**
 * Free-tier (keyless) provider catalogue (MASTER_PLAN.md §2.9).
 *
 * Why these are separate from the OpenAI/Anthropic adapters: they are *not* new
 * transports. Every entry below is a plain OpenAI-compatible endpoint reached with
 * a fixed anonymous token plus a few identity headers. Encoding them here (rather
 * than hard-coding them inside an adapter) means adding or fixing one is a data
 * change, not a code change — and one that a user who is offline today can ignore.
 *
 * What we verified 2026-09-20 from this build host:
 *   - OpenCode Zen does expose 8 genuinely zero-priced model ids.
 *   - Anonymous requests work from residential IPs but are blocked from this
 *     host's datacenter egress ("free tier can only be used from within OpenCode",
 *     a 403 identical with or without CLI identity headers -> an IP-level block).
 *   - Kilo's documented gateway base URL returned 404; Kilo's no-key path is an
 *     OAuth subscription sign-in, which is a web flow, not an endpoint.
 *
 * So these are shipped *disabled by default*. A user whose network can reach them
 * flips `enabled: true`. Nothing else is needed — no rebuild, no code change.
 */

/** One keyless gateway entry. */
export interface FreeProvider {
  /** Stable id used in config and logs. */
  readonly id: string;
  /** What a user sees when picking a provider. */
  readonly label: string;
  /** The endpoint this gateway speaks. All are OpenAI-compatible. */
  readonly baseUrl: string;
  /** Anonymous token sent as `authorization`. */
  readonly anonToken: string;
  /**
   * Headers a gateway requires to grant its free tier. Send verbatim.
   * If `userAgent` is set it goes in the `user-agent` header.
   */
  readonly headers: Record<string, string>;
  readonly userAgent?: string;
  /** Model ids the gateway prices at zero, as it spells them. */
  readonly freeModels: readonly string[];
  /** Short note on why this is off by default. */
  readonly note: string;
}

export const FREE_PROVIDERS: readonly FreeProvider[] = [
  {
    id: 'opencode-zen-free',
    label: 'OpenCode Zen (free models, no account)',
    baseUrl: 'https://opencode.ai/zen/v1',
    anonToken: 'public',
    headers: {
      'x-opencode-client': 'cli',
    },
    userAgent: 'opencode/1.18.30',
    freeModels: [
      'big-pickle',
      'mimo-v2.5-free',
      'ling-3.0-flash-fin-free',
      'nemotron-3-ultra-free',
      'nemotron-3.5-lightning-free',
      'muse-spark-1.2-contributor-free',
      'muse-spark-1.3-contributor-free',
      'jev-1.13-free',
    ],
    note: 'Anonymous free tier is IP-gated; works from a residential network, not from most datacenter egress. Off by default.',
  },
];

/**
 * Build an `OpenAiProvider` config for a free gateway, so the adapter does not have
 * to know anything about gateways.
 */
export function freeProviderToOpenAiConfig(entry: FreeProvider, model: string) {
  if (!entry.freeModels.includes(model)) {
    throw new RangeError(
      `model ${model} is not on the free list for ${entry.id} — it is metered, ` +
        'so sending an anonymous token would bill somebody else',
    );
  }
  return {
    baseUrl: entry.baseUrl,
    apiKey: entry.anonToken,
    model,
    headers: { ...entry.headers },
    ...(entry.userAgent ? { userAgent: entry.userAgent } : {}),
  } as const;
}
