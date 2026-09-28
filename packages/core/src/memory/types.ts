/**
 * Memory System Types
 * Supports: short-term, long-term, knowledge base
 */

export type MemoryType = 'shortterm' | 'longterm' | 'knowledge' | 'session';

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  context: Record<string, any>;
  timestamp: number;
  embedding?: number[];
}

export interface MemoryStore {
  add: (entry: MemoryEntry) => void;
  get: (id: string) => MemoryEntry | null;
  search: (query: string, limit: number) => MemoryEntry[];
  getAll: (type?: MemoryType) => MemoryEntry[];
  clear: () => void;
}

export interface MemoryConfig {
  shorttermLimit: number;
  longtermLimit: number;
  embeddingProvider?: string;
  storagePath: string;
}
