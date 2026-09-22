/**
 * Document Chunker — Phase 7 (RAG).
 *
 * Splits documents into overlapping chunks for vector embedding.
 * Supports: fixed-size, sentence-based, and paragraph-based strategies.
 */

import { randomUUID } from 'node:crypto';

export interface Chunk {
  id: string;
  docId: string;
  text: string;
  index: number;
  startChar: number;
  endChar: number;
  metadata?: Record<string, unknown>;
}

export type ChunkStrategy = 'fixed' | 'sentence' | 'paragraph';

export interface ChunkOptions {
  strategy?: ChunkStrategy;
  /** Max chars per chunk (fixed strategy). Default 512. */
  maxChars?: number;
  /** Overlap chars between consecutive chunks. Default 64. */
  overlap?: number;
  metadata?: Record<string, unknown>;
}

export function chunkDocument(
  docId: string,
  text: string,
  opts: ChunkOptions = {},
): Chunk[] {
  const strategy = opts.strategy ?? 'fixed';
  const maxChars = opts.maxChars ?? 512;
  const overlap = opts.overlap ?? 64;
  const metadata = opts.metadata;

  if (!text.trim()) return [];

  let segments: { text: string; start: number }[] = [];

  if (strategy === 'paragraph') {
    let pos = 0;
    for (const para of text.split(/\n{2,}/)) {
      const t = para.trim();
      if (t) segments.push({ text: t, start: text.indexOf(t, pos) });
      pos += para.length + 2;
    }
  } else if (strategy === 'sentence') {
    let pos = 0;
    for (const sent of text.split(/(?<=[.!?])\s+/)) {
      const t = sent.trim();
      if (t) segments.push({ text: t, start: text.indexOf(t, pos) });
      pos += sent.length + 1;
    }
  } else {
    // fixed with overlap
    let i = 0;
    while (i < text.length) {
      const end = Math.min(i + maxChars, text.length);
      segments.push({ text: text.slice(i, end), start: i });
      if (end === text.length) break;
      i += maxChars - overlap;
    }
  }

  return segments.map((seg, idx) => ({
    id: randomUUID(),
    docId,
    text: seg.text,
    index: idx,
    startChar: seg.start,
    endChar: seg.start + seg.text.length,
    ...(metadata ? { metadata } : {}),
  }));
}
