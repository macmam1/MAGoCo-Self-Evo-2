/**
 * Knowledge Base — Phase 7.
 *
 * Per-agent knowledge base: wraps RAGPipeline with agent-scoped namespacing.
 * Multiple agents can have independent KBs backed by the same embed function.
 */

import { randomUUID } from 'node:crypto';
import { createRAGPipeline, type Document, type RAGResult } from './pipeline.js';
import type { EmbedFn } from './vector-store.js';
import type { ChunkOptions } from './chunker.js';

export interface KnowledgeBase {
  agentId: string;
  index(doc: Document): Promise<number>;
  retrieve(query: string, topK?: number): Promise<RAGResult>;
  remove(docId: string): void;
  clear(): void;
  size(): number;
  docCount(): number;
}

export function createKnowledgeBase(
  agentId: string,
  embedFn: EmbedFn,
  chunkOpts: ChunkOptions = {},
): KnowledgeBase {
  const rag = createRAGPipeline(embedFn, chunkOpts);
  return { agentId, ...rag };
}

/** Registry of per-agent KBs */
export function createKBRegistry(embedFn: EmbedFn, chunkOpts: ChunkOptions = {}) {
  const kbs = new Map<string, KnowledgeBase>();

  return {
    /** Get or create a KB for an agent */
    forAgent(agentId: string): KnowledgeBase {
      if (!kbs.has(agentId)) {
        kbs.set(agentId, createKnowledgeBase(agentId, embedFn, chunkOpts));
      }
      return kbs.get(agentId)!;
    },

    /** List all agent ids with KBs */
    agents(): string[] { return [...kbs.keys()]; },

    /** Remove an agent's KB entirely */
    removeAgent(agentId: string): void { kbs.delete(agentId); },

    /** Total chunks across all KBs */
    totalSize(): number {
      let n = 0;
      for (const kb of kbs.values()) n += kb.size();
      return n;
    },
  };
}

export type KBRegistry = ReturnType<typeof createKBRegistry>;
