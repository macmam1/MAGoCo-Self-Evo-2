import type { Store } from '../persistence/store.js';

/**
 * The three-layer memory (MASTER_PLAN.md §2.1 — "حافظه ۳ لایه").
 *
 * Working   — the live conversation. Bounded; old turns are compressed into
 *             episodic memory so context never grows without limit.
 * Episodic  — distilled experience from past sessions: what happened, and what
 *             to remember. Recalled by relevance and recency.
 * Semantic  — durable facts. Key/value, written once, read forever.
 *
 * All three sit behind one object so an agent asks `memory.recall(...)` and
 * never has to know which layer answered.
 */
export interface Memory {
  readonly working: WorkingMemory;
  readonly episodic: EpisodicMemory;
  readonly semantic: SemanticMemory;

  /** Assemble the parts a prompt needs for one turn. */
  recall(sessionId: string, query: string): Promise<RecalledContext>;
}

export interface WorkingMemory {
  /** Append one turn; returns its row id. */
  append(sessionId: string, role: string, content: unknown): number;
  /** The most recent turns, oldest first. */
  recent(sessionId: string, limit?: number): Array<MemoryTurn>;
  count(sessionId: string): number;
  /** Compress turns `fromId..toId` into episodic memory and drop the originals. */
  compact(sessionId: string, keepLast: number, summarize: Summarizer): Promise<number>;
}

export interface EpisodicMemory {
  record(e: Episode): number;
  recentEpisodes(limit?: number): Episode[];
  search(query: string, limit?: number): Episode[];
  /** Bump an episode's weight — a lesson that proved useful gets stronger. */
  reinforce(id: number, delta?: number): void;
}

export interface SemanticMemory {
  set(key: string, value: unknown): void;
  get(key: string): unknown | undefined;
  delete(key: string): boolean;
  keys(prefix?: string): string[];
}

export interface MemoryTurn {
  id: number;
  role: string;
  content: unknown;
  ts: number;
}

export interface Episode {
  id?: number;
  /** The session an episode was learned in. `undefined` when unknown. */
  sessionId?: string | undefined;
  summary: string;
  lesson: string;
  weight?: number;
}

export interface RecalledContext {
  /** Recent working turns, oldest first. */
  working: MemoryTurn[];
  /** Episodes that matched the query. */
  episodes: Episode[];
  /** Semantic facts whose key matched the query. */
  facts: Array<{ key: string; value: unknown }>;
}

/** Turns a window of conversation into one episodic entry. */
export type Summarizer = (
  turns: MemoryTurn[],
) => Promise<Pick<Episode, 'summary' | 'lesson'>>;

export class MemoryImpl implements Memory {
  constructor(
    private readonly store: Store,
    private readonly summarize: Summarizer,
  ) {}

  get working(): WorkingMemory {
    return this;
  }
  get episodic(): EpisodicMemory {
    return this;
  }
  get semantic(): SemanticMemory {
    return this;
  }

  // ── working ──────────────────────────────────────────────────────────────

  append(sessionId: string, role: string, content: unknown): number {
    return this.store.appendWorking(sessionId, role, content);
  }

  recent(sessionId: string, limit = 50): MemoryTurn[] {
    return this.store.recentWorking(sessionId, limit);
  }

  count(sessionId: string): number {
    return this.store.countWorking(sessionId);
  }

  /**
   * Compact: keep the most recent `keepLast` turns, summarize the rest into one
   * episodic entry, then delete the originals. Working memory stays bounded no
   * matter how long the conversation runs.
   *
   * Returns the number of turns compressed.
   */
  async compact(sessionId: string, keepLast: number, summarize?: Summarizer): Promise<number> {
    const turns = this.store.recentWorking(sessionId, Number.MAX_SAFE_INTEGER);
    if (turns.length <= keepLast) return 0;

    const toCompress = turns.slice(0, turns.length - keepLast);
    const lastId = toCompress[toCompress.length - 1]!.id;
    const { summary, lesson } = await (summarize ?? this.summarize)(toCompress);
    this.store.recordEpisode({ sessionId, summary, lesson });

    return this.store.deleteWorkingBefore(sessionId, lastId + 1);
  }

  // ── episodic ─────────────────────────────────────────────────────────────

  record(e: Episode): number {
    return this.store.recordEpisode(e);
  }

  recentEpisodes(limit = 10): Episode[] {
    return this.store.recentEpisodes(limit).map((r) => ({
      ...r,
      sessionId: r.sessionId ?? undefined,
    }));
  }

  search(query: string, limit = 5): Episode[] {
    return this.store.searchEpisodes(query, limit);
  }

  reinforce(id: number, delta = 0.1): void {
    this.store.reinforceEpisode(id, delta);
  }

  // ── semantic ─────────────────────────────────────────────────────────────

  set(key: string, value: unknown): void {
    this.store.setSemantic(key, value);
  }
  get(key: string): unknown | undefined {
    return this.store.getSemantic(key);
  }
  delete(key: string): boolean {
    return this.store.deleteSemantic(key);
  }
  keys(prefix = ''): string[] {
    return this.store.keysSemantic(prefix);
  }

  // ── unified recall ───────────────────────────────────────────────────────

  async recall(sessionId: string, query: string): Promise<RecalledContext> {
    const episodes = this.episodic.search(query);
    const facts = this.store
      .keysSemantic()
      .filter((k) => keyMatchesQuery(k, query))
      .map((key) => ({ key, value: this.store.getSemantic(key) }))
      .filter((f) => f.value !== undefined) as Array<{ key: string; value: unknown }>;
    return {
      working: this.working.recent(sessionId),
      episodes,
      facts,
    };
  }
}

/**
 * A semantic fact is recalled when the query mentions any salient segment of
 * its key: `deploy.port` answers "deploy the app to modelscope" via `deploy`,
 * `user.name` answers "what's my name" via `name`. Segments shorter than two
 * characters are ignored — a key of `a.b.c` should not fire on every query.
 */
function keyMatchesQuery(key: string, query: string): boolean {
  const hay = query.toLowerCase();
  return key
    .split('.')
    .some((seg) => seg.length > 1 && hay.includes(seg));
}
