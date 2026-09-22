/**
 * Hybrid Search — Phase 7.
 *
 * Combines keyword (BM25-like TF scoring) + vector (cosine) search
 * with configurable alpha weighting.
 *   score = alpha * vectorScore + (1 - alpha) * keywordScore
 */

import type { VectorStore, SearchResult } from './vector-store.js';

export interface HybridResult {
  entryId: string;
  docId: string;
  text: string;
  vectorScore: number;
  keywordScore: number;
  hybridScore: number;
}

/** Simple TF keyword scorer: term frequency normalized by doc length */
function keywordScore(text: string, query: string): number {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  const words = text.toLowerCase().split(/\s+/);
  if (words.length === 0) return 0;
  let hits = 0;
  for (const token of tokens) {
    for (const word of words) {
      if (word.includes(token)) hits++;
    }
  }
  return hits / (words.length * tokens.length);
}

export async function hybridSearch(
  store: VectorStore,
  query: string,
  topK = 5,
  alpha = 0.7, // weight for vector score
): Promise<HybridResult[]> {
  // Get all vector results (overfetch for re-ranking)
  const vectorResults: SearchResult[] = await store.search(query, Math.max(topK * 3, 20));

  if (vectorResults.length === 0) return [];

  const scored: HybridResult[] = vectorResults.map(r => {
    const kScore = keywordScore(r.entry.text, query);
    const vScore = r.score;
    return {
      entryId: r.entry.id,
      docId: r.entry.docId,
      text: r.entry.text,
      vectorScore: vScore,
      keywordScore: kScore,
      hybridScore: alpha * vScore + (1 - alpha) * kScore,
    };
  });

  return scored
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, topK);
}
