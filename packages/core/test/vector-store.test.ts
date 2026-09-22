import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createVectorStore } from '../src/rag/vector-store.js';
import type { Chunk } from '../src/rag/chunker.js';

// Mock embedder: converts text to a simple bag-of-chars vector (dim=26)
const mockEmbed = async (text: string): Promise<number[]> => {
  const v = new Array(26).fill(0);
  for (const c of text.toLowerCase()) {
    const i = c.charCodeAt(0) - 97;
    if (i >= 0 && i < 26) v[i]++;
  }
  return v;
};

function chunk(text: string, docId = 'doc1'): Chunk {
  return { id: `c-${Math.random()}`, docId, text, index: 0, startChar: 0, endChar: text.length };
}

test('T-VS1 size is 0 initially', () => {
  const vs = createVectorStore(mockEmbed);
  assert.equal(vs.size(), 0);
});

test('T-VS2 add stores entry and increments size', async () => {
  const vs = createVectorStore(mockEmbed);
  await vs.add(chunk('hello world'));
  assert.equal(vs.size(), 1);
});

test('T-VS3 added entry is retrievable by id', async () => {
  const vs = createVectorStore(mockEmbed);
  const e = await vs.add(chunk('test text'));
  assert.ok(vs.get(e.id) !== null);
  assert.equal(vs.get(e.id)?.text, 'test text');
});

test('T-VS4 addAll stores multiple entries', async () => {
  const vs = createVectorStore(mockEmbed);
  await vs.addAll([chunk('a'), chunk('b'), chunk('c')]);
  assert.equal(vs.size(), 3);
});

test('T-VS5 search returns topK results', async () => {
  const vs = createVectorStore(mockEmbed);
  await vs.addAll(['alpha', 'beta', 'gamma', 'delta', 'epsilon'].map(t => chunk(t)));
  const results = await vs.search('alpha', 3);
  assert.equal(results.length, 3);
});

test('T-VS6 search scores are between 0 and 1', async () => {
  const vs = createVectorStore(mockEmbed);
  await vs.addAll(['apple', 'orange', 'banana'].map(t => chunk(t)));
  const results = await vs.search('apple', 3);
  for (const r of results) {
    assert.ok(r.score >= 0 && r.score <= 1);
  }
});

test('T-VS7 most similar result has highest score', async () => {
  const vs = createVectorStore(mockEmbed);
  await vs.add(chunk('javascript programming'));
  await vs.add(chunk('cooking recipes'));
  const results = await vs.search('javascript code', 2);
  assert.equal(results[0]!.entry.text, 'javascript programming');
});

test('T-VS8 removeDoc removes all entries for that doc', async () => {
  const vs = createVectorStore(mockEmbed);
  await vs.addAll([chunk('a', 'doc1'), chunk('b', 'doc1'), chunk('c', 'doc2')]);
  const removed = vs.removeDoc('doc1');
  assert.equal(removed, 2);
  assert.equal(vs.size(), 1);
});

test('T-VS9 clear removes all entries', async () => {
  const vs = createVectorStore(mockEmbed);
  await vs.addAll([chunk('x'), chunk('y'), chunk('z')]);
  vs.clear();
  assert.equal(vs.size(), 0);
});

test('T-VS10 search on empty store returns empty array', async () => {
  const vs = createVectorStore(mockEmbed);
  const results = await vs.search('anything');
  assert.deepEqual(results, []);
});

test('T-VS11 search topK larger than store returns all', async () => {
  const vs = createVectorStore(mockEmbed);
  await vs.addAll([chunk('a'), chunk('b')]);
  const results = await vs.search('a', 10);
  assert.equal(results.length, 2);
});

test('T-VS12 entry preserves docId and metadata', async () => {
  const vs = createVectorStore(mockEmbed);
  const c: Chunk = { id: 'cid', docId: 'mydoc', text: 'hello', index: 0, startChar: 0, endChar: 5, metadata: { lang: 'en' } };
  const e = await vs.add(c);
  assert.equal(e.docId, 'mydoc');
  assert.deepEqual(e.metadata, { lang: 'en' });
});
