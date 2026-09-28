/**
 * Memory Store Implementation
 */

import { MemoryEntry, MemoryType, MemoryConfig } from './types.js';

export class MemoryStore {
  private shortterm: MemoryEntry[] = [];
  private longterm: MemoryEntry[] = [];
  private knowledge: MemoryEntry[] = [];
  private config: MemoryConfig;

  constructor(config: MemoryConfig) {
    this.config = config;
  }

  add(entry: MemoryEntry): void {
    const store = this.getStore(entry.type);
    store.push(entry);
    this.pruneStore(entry.type);
  }

  get(id: string): MemoryEntry | null {
    for (const store of [this.shortterm, this.longterm, this.knowledge]) {
      const found = store.find(e => e.id === id);
      if (found) return found;
    }
    return null;
  }

  search(query: string, limit: number): MemoryEntry[] {
    const results = [
      ...this.shortterm.filter(e => e.content.includes(query)),
      ...this.longterm.filter(e => e.content.includes(query)),
      ...this.knowledge.filter(e => e.content.includes(query))
    ].sort((a, b) => b.timestamp - a.timestamp);
    return results.slice(0, limit);
  }

  getAll(type?: MemoryType): MemoryEntry[] {
    if (type) {
      return this.getStore(type).slice();
    }
    return [...this.shortterm, ...this.longterm, ...this.knowledge];
  }

  clear(): void {
    this.shortterm = [];
    this.longterm = [];
    this.knowledge = [];
  }

  private getStore(type: MemoryType): MemoryEntry[] {
    switch (type) {
      case 'shortterm': return this.shortterm;
      case 'longterm': return this.longterm;
      case 'knowledge': return this.knowledge;
      default: return this.shortterm;
    }
  }

  private pruneStore(type: MemoryType): void {
    const limit = type === 'shortterm' 
      ? this.config.shorttermLimit 
      : this.config.longtermLimit;
    const store = this.getStore(type);
    if (store.length > limit) {
      store.splice(0, store.length - limit);
    }
  }
}
