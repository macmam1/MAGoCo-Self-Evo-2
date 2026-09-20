import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Store } from '../src/persistence/store.js';
import { MemoryImpl } from '../src/memory/memory.js';
import type { MemoryTurn } from '../src/memory/memory.js';

/** Deterministic stand-in for an LLM summarizer: concatenates the turns. */
function fakeSummarize(turns: MemoryTurn[]) {
  const text = turns.map((t) => `${t.role}:${JSON.stringify(t.content)}`).join(' ');
  return Promise.resolve({
    summary: `session covered: ${text.slice(0, 120)}`,
    lesson: 'keep answers short',
  });
}

async function withRoot<T>(fn: (root: string) => Promise<T>): Promise<T> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'magoco-mem-'));
  try {
    return await fn(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('working memory appends and reads back in order', async () => {
  await withRoot(async (root) => {
    const store = new Store(root);
    const mem = new MemoryImpl(store, fakeSummarize);
    mem.append('s1', 'user', 'hello');
    mem.append('s1', 'assistant', 'hi there');
    mem.append('s2', 'user', 'other session');
    const got = mem.recent('s1').map((t) => [t.role, t.content]);
    assert.deepEqual(got, [
      ['user', 'hello'],
      ['assistant', 'hi there'],
    ]);
    assert.equal(mem.count('s1'), 2);
    store.close();
  });
});

test('semantic memory writes, reads, and keys', async () => {
  await withRoot(async (root) => {
    const store = new Store(root);
    const mem = new MemoryImpl(store, fakeSummarize);
    mem.set('user.name', 'Mrh');
    assert.equal(mem.get('user.name'), 'Mrh');
    assert.equal(mem.get('missing'), undefined);
    assert.deepEqual(mem.keys('user.'), ['user.name']);
    assert.equal(mem.delete('user.name'), true);
    assert.equal(mem.get('user.name'), undefined);
    store.close();
  });
});

test('episodic memory records, searches, and reinforces', async () => {
  await withRoot(async (root) => {
    const store = new Store(root);
    const mem = new MemoryImpl(store, fakeSummarize);
    const id = mem.record({ summary: 'deployed to modelscope', lesson: 'check port first' });
    mem.record({ summary: 'fixed yaml bug', lesson: 'validate manifests early' });

    const hits = mem.search('modelscope');
    assert.equal(hits.length, 1);
    assert.equal(hits[0]!.id, id);
    assert.equal(hits[0]!.lesson, 'check port first');

    mem.reinforce(id, 0.5);
    // highest weight now sorts first even against a newer record
    mem.record({ summary: 'deployed again', lesson: 'b' });
    assert.equal(mem.recentEpisodes()[0]!.id, id);
    store.close();
  });
});

test('compact compresses old turns into episodic memory and bounds working', async () => {
  await withRoot(async (root) => {
    const store = new Store(root);
    const mem = new MemoryImpl(store, fakeSummarize);
    for (let i = 0; i < 10; i++) mem.append('s1', 'user', `msg ${i}`);
    assert.equal(mem.count('s1'), 10);

    const n = await mem.compact('s1', 4);
    assert.equal(n, 6, 'six oldest turns should be compressed');
    assert.equal(mem.count('s1'), 4, 'working must keep only the last 4');
    const remaining = mem.recent('s1').map((t) => t.content);
    assert.deepEqual(remaining, ['msg 6', 'msg 7', 'msg 8', 'msg 9']);

    // the compressed turns must survive as one episodic entry
    const ep = mem.recentEpisodes(1)[0]!;
    assert.match(ep.summary, /msg 0/);
    assert.equal(ep.lesson, 'keep answers short');
    store.close();
  });
});

test('recall assembles working, episodes, and facts for one query', async () => {
  await withRoot(async (root) => {
    const store = new Store(root);
    const mem = new MemoryImpl(store, fakeSummarize);
    mem.append('s1', 'user', 'deploy the app');
    mem.record({ summary: 'modelscope deploy failed', lesson: 'use port 7860' });
    mem.set('deploy.port', 7860);

    const ctx = await mem.recall('s1', 'deploy the app to modelscope');
    assert.equal(ctx.working.length, 1);
    assert.equal(ctx.episodes.length, 1);
    assert.equal(ctx.episodes[0]!.lesson, 'use port 7860');
    assert.deepEqual(ctx.facts, [{ key: 'deploy.port', value: 7860 }]);
    store.close();
  });
});

test('store reopens without duplicating schema', async () => {
  await withRoot(async (root) => {
    const store = new Store(root);
    store.setSemantic('k', 1);
    store.close();
    const again = new Store(root);
    assert.equal(again.getSemantic('k'), 1);
    again.close();
  });
});
