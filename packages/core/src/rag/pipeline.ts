/**
 * RAG Pipeline — Phase 7.
 *
 * Connects chunker + vector store into a full
 * index → retrieve → cite pipeline.
 */

import { randomUUID } from 'node:crypto';
import { chunkDocument, type ChunkOptions } from './chunker.js';
import { createVectorStore, type EmbedFn, type SearchResult } from './vector-store.js';

export interface Document {
  id: string;
  title: string;
  text: string;
  source?: string;
}

export interface Citation {
  docId: string;
  docTitle: string;
  chunkText: string;
  score: number;
  source?: string;
}

export interface RAGResult {
  query: string;
  citations: Citation[];
  context: string; // concatenated chunk texts for prompt injection
}

export function createRAGPipeline(embedFn: EmbedFn, chunkOpts: ChunkOptions = {}) {
  const store = createVectorStore(embedFn);
  const docIndex = new Map<string, Document>();

  return {
    /** Index a document: chunk + embed + store */
    async index(doc: Document): Promise<number> {
      docIndex.set(doc.id, doc);
      const chunks = chunkDocument(doc.id, doc.text, {
        ...chunkOpts,
        metadata: { docTitle: doc.title, source: doc.source },
      });
      await store.addAll(chunks);
      return chunks.length;
    },

    /** Remove a document from the index */
    remove(docId: string): void {
      docIndex.delete(docId);
      store.removeDoc(docId);
    },

    /** Retrieve top-k relevant chunks and build citations */
    async retrieve(query: string, topK = 5): Promise<RAGResult> {
      const results: SearchResult[] = await store.search(query, topK);

      const citations: Citation[] = results.map(r => {
        const doc = docIndex.get(r.entry.docId);
        return {
          docId: r.entry.docId,
          docTitle: doc?.title ?? r.entry.docId,
          chunkText: r.entry.text,
          score: r.score,
          ...(doc?.source ? { source: doc.source } : {}),
        };
      });

      const context = citations.map((c, i) =>
        `[${i + 1}] ${c.chunkText}`
      ).join('\n\n');

      return { query, citations, context };
    },

    /** Number of indexed chunks */
    size(): number { return store.size(); },

    /** Number of indexed documents */
    docCount(): number { return docIndex.size; },

    /** Clear everything */
    clear(): void { store.clear(); docIndex.clear(); },
  };
}

export type RAGPipeline = ReturnType<typeof createRAGPipeline>;
