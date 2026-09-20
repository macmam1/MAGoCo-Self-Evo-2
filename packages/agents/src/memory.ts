/**
 * The memory seam (MASTER_PLAN.md §2.5, §2.6).
 *
 * `magoco.memory.*` is how the loop touches the three memory layers — semantic facts,
 * working turns, episodic lessons — without knowing how any of them is stored.
 *
 * The contract is deliberately small: `recall`, `remember`, and `recordEpisode`. A
 * store that implements `MemoryStore` can back any of them, and the loop never knows
 * whether it is talking to SQLite, Postgres, or an in-process Map in a test.
 */

/** A fact the agent stated and can rely on later. */
export interface SemanticFact {
  readonly key: string;
  readonly value: string;
  readonly confidence: number;
  readonly agentId: string;
  readonly sessionId?: string;
  readonly createdAt: number;
}

/** A turn still in the working window, not yet summarized. */
export interface WorkingTurn {
  readonly agentId: string;
  readonly sessionId: string;
  readonly role: string;
  readonly content: string;
  readonly turn: number;
  readonly createdAt: number;
}

/** A lesson distilled from a completed run. */
export interface Episode {
  readonly id?: string;
  readonly agentId: string;
  readonly sessionId?: string;
  readonly summary: string;
  readonly lesson: string;
  readonly outcome: string;
  readonly tags?: readonly string[];
  readonly createdAt: number;
}

/**
 * What the three layers look like from the outside.
 *
 * Implementations may throw; the seam's own caller (the memory capability) catches
 * and degrades to an empty result rather than failing the run — a memory layer that
 * is down must not break the agent (MASTER_PLAN.md §2.5).
 */
export interface MemoryStore {
  /** Facts that match a natural-language query. */
  recallSemantic(query: string, agentId: string, limit?: number): Promise<readonly SemanticFact[]>;
  /** Store or refresh a fact. */
  rememberSemantic(fact: SemanticFact): Promise<void>;
  /** Recent turns still in the working window. */
  recentWorking(sessionId: string, limit?: number): Promise<readonly WorkingTurn[]>;
  /** Append a turn to the working window. */
  pushWorking(turn: WorkingTurn): Promise<void>;
  /** Episodes whose summary or lesson mentions the query terms. */
  searchEpisodes(query: string, agentId: string, limit?: number): Promise<readonly Episode[]>;
  /** Store a completed run's lesson. */
  recordEpisode(episode: Episode): Promise<void>;
}

/** What `magoco.memory.recall` returns — mixed evidence, best first. */
export interface MemoryRecallResult {
  readonly facts: readonly SemanticFact[];
  readonly episodes: readonly Episode[];
  readonly recent: readonly WorkingTurn[];
}

/** What `magoco.memory.remember` takes. */
export interface MemoryRememberInput {
  readonly key: string;
  readonly value: string;
  readonly confidence?: number;
  readonly agentId: string;
  readonly sessionId?: string;
}

/**
 * The memory capability. Registered as `magoco.memory` with `recall`, `remember`, and
 * `recordEpisode` sub-operations; each is independently callable through the tools seam.
 */
export class MemoryCapability {
  constructor(private store: MemoryStore) {}

  async recall(query: string, agentId: string, sessionId?: string): Promise<MemoryRecallResult> {
    const [facts, episodes, recent] = await Promise.all([
      this.store.recallSemantic(query, agentId, 8).catch(() => [] as SemanticFact[]),
      this.store.searchEpisodes(query, agentId, 5).catch(() => [] as Episode[]),
      sessionId
        ? this.store.recentWorking(sessionId, 8).catch(() => [] as WorkingTurn[])
        : Promise.resolve([] as WorkingTurn[]),
    ]);
    return { facts, episodes, recent };
  }

  async remember(input: MemoryRememberInput): Promise<void> {
    await this.store
      .rememberSemantic({
        key: input.key,
        value: input.value,
        confidence: input.confidence ?? 0.7,
        agentId: input.agentId,
        ...(input.sessionId ? { sessionId: input.sessionId } : {}),
        createdAt: Date.now(),
      })
      .catch(() => {});
  }

  async recordEpisode(episode: Omit<Episode, 'createdAt'> & { createdAt?: number }): Promise<void> {
    await this.store
      .recordEpisode({ ...episode, createdAt: episode.createdAt ?? Date.now() })
      .catch(() => {});
  }
}
