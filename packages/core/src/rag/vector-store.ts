/**
 * Vector Store — Phase 7 (RAG).
 *
 * In-memory vector store with cosine similarity search.
 * No external dependencies — embeddings are injected externally.
 * Pluggable EmbedFn interface for real embedding backends.
 */

import { randomUUID } from 'node:crypto';
import type { Chunk } from './chunker.js';

export interface VectorEntry {
  id: string;
  chunkId: string;
  docId: string;
  text: string;
  vector: number[];
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  entry: VectorEntry;
  score: number;
}

/** Pluggable embedding function */
export type EmbedFn = (text: string) => Promise<number[]>;

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function createVectorStore(embedFn: EmbedFn) {
  const entries = new Map<string, VectorEntry>();

  return {
    /** Embed and store a chunk */
    async add(chunk: Chunk): Promise<VectorEntry> {
      const vector = await embedFn(chunk.text);
      const entry: VectorEntry = {
        id: randomUUID(),
        chunkId: chunk.id,
        docId: chunk.docId,
        text: chunk.text,
        vector,
        ...(chunk.metadata ? { metadata: chunk.metadata } : {}),
      };
      entries.set(entry.id, entry);
      return entry;
    },

    /** Embed and store multiple chunks */
    async addAll(chunks: Chunk[]): Promise<VectorEntry[]> {
      return Promise.all(chunks.map(c => this.add(c)));
    },

    /** Search for top-k most similar chunks */
    async search(query: string, topK = 5): Promise<SearchResult[]> {
      const qVec = await embedFn(query);
      const results: SearchResult[] = [];
      for (const entry of entries.values()) {
        const score = cosineSimilarity(qVec, entry.vector);
        results.push({ entry, score });
      }
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    },

    /** Remove all entries for a document */
    removeDoc(docId: string): number {
      let removed = 0;
      for (const [id, e] of entries) {
        if (e.docId === docId) { entries.delete(id); removed++; }
      }
      return removed;
    },

    /** Total number of stored entries */
    size(): number { return entries.size; },

    /** Clear all entries */
    clear(): void { entries.clear(); },

    /** Get entry by id */
    get(id: string): VectorEntry | null { return entries.get(id) ?? null; },
  };
}

export type VectorStore = ReturnType<typeof createVectorStore>;
