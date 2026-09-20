import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { StoredEvent } from '../eventbus/bus.js';

/**
 * The session log — the single source of truth for everything that happened.
 *
 * Append-only JSONL. Every event the framework produces lands here, which
 * means any moment of the run can be reconstructed from disk alone. This is
 * the third "stable surface" of the framework (MASTER_PLAN.md §1.5).
 */
export class SessionLog {
  private readonly file: string;
  private writeChain: Promise<void> = Promise.resolve();
  private count = 0;

  constructor(sessionId: string, rootDir: string) {
    const dir = path.join(rootDir, 'sessions', sessionId);
    this.file = path.join(dir, 'log.jsonl');
  }

  /** Append one event. Writes are serialized so order is always correct. */
  append(event: StoredEvent): Promise<void> {
    this.count++;
    this.writeChain = this.writeChain.then(() => this.write(event));
    return this.writeChain;
  }

  private async write(event: StoredEvent): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.appendFile(this.file, JSON.stringify(event) + '\n', 'utf8');
  }

  /** Read the whole log back, in order. */
  async *read(): AsyncIterable<StoredEvent> {
    const content = await fs.readFile(this.file, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      yield JSON.parse(trimmed) as StoredEvent;
    }
  }

  get length(): number {
    return this.count;
  }
}
