import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hybridSearch } from '../src/rag/hybrid-search.js';
import { createVectorStore } from '../src/rag/vector-store.js';
import type { Chunk } from '../src/rag/chunker.js';

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

test('T-HS1 empty store returns empty array', async () => {
  const store = createVectorStore(mockEmbed);
  const results = await hybridSearch(store, 'query');
  assert.deepEqual(results, []);
});

test('T-HS2 returns topK results', async () => {
  const store = createVectorStore(mockEmbed);
  await store.addAll(['a b c', 'd e f', 'g h i', 'j k l', 'x y z'].map(t => chunk(t)));
  const results = await hybridSearch(store, 'a b', 3);
  assert.equal(results.length, 3);
});

test('T-HS3 hybridScore is between 0 and 1', async () => {
  const store = createVectorStore(mockEmbed);
  await store.addAll(['hello world', 'foo bar'].map(t => chunk(t)));
  const results = await hybridSearch(store, 'hello', 2);
  for (const r of results) {
    assert.ok(r.hybridScore >= 0 && r.hybridScore <= 1);
  }
});

test('T-HS4 result with exact keyword match scores higher', async () => {
  const store = createVectorStore(mockEmbed);
  await store.add(chunk('typescript programming language'));
  await store.add(chunk('cooking delicious food recipes'));
  const results = await hybridSearch(store, 'typescript', 2);
  assert.equal(results[0]!.text, 'typescript programming language');
});

test('T-HS5 results are sorted by hybridScore descending', async () => {
  const store = createVectorStore(mockEmbed);
  await store.addAll(['alpha beta', 'gamma delta', 'alpha gamma'].map(t => chunk(t)));
  const results = await hybridSearch(store, 'alpha', 3);
  for (let i = 0; i < results.length - 1; i++) {
    assert.ok(results[i]!.hybridScore >= results[i + 1]!.hybridScore);
  }
});

test('T-HS6 each result has vectorScore and keywordScore', async () => {
  const store = createVectorStore(mockEmbed);
  await store.add(chunk('test query result'));
  const results = await hybridSearch(store, 'test', 1);
  assert.ok(typeof results[0]!.vectorScore === 'number');
  assert.ok(typeof results[0]!.keywordScore === 'number');
});

test('T-HS7 alpha=1 uses only vector score', async () => {
  const store = createVectorStore(mockEmbed);
  await store.add(chunk('vector only'));
  const results = await hybridSearch(store, 'vector', 1, 1.0);
  assert.ok(Math.abs(results[0]!.hybridScore - results[0]!.vectorScore) < 0.0001);
});

test('T-HS8 alpha=0 uses only keyword score', async () => {
  const store = createVectorStore(mockEmbed);
  await store.add(chunk('keyword only search'));
  const results = await hybridSearch(store, 'keyword', 1, 0.0);
  assert.ok(Math.abs(results[0]!.hybridScore - results[0]!.keywordScore) < 0.0001);
});

test('T-HS9 result has entryId and docId', async () => {
  const store = createVectorStore(mockEmbed);
  await store.add(chunk('doc content', 'my-doc'));
  const results = await hybridSearch(store, 'doc', 1);
  assert.ok(typeof results[0]!.entryId === 'string');
  assert.equal(results[0]!.docId, 'my-doc');
});

test('T-HS10 topK larger than store returns all', async () => {
  const store = createVectorStore(mockEmbed);
  await store.addAll([chunk('a'), chunk('b')]);
  const results = await hybridSearch(store, 'a', 100);
  assert.equal(results.length, 2);
});

test('T-HS11 empty query returns results without crashing', async () => {
  const store = createVectorStore(mockEmbed);
  await store.add(chunk('some text'));
  await assert.doesNotReject(hybridSearch(store, '', 5));
});

test('T-HS12 default alpha 0.7 produces hybrid score', async () => {
  const store = createVectorStore(mockEmbed);
  await store.add(chunk('hybrid search test'));
  const results = await hybridSearch(store, 'hybrid');
  const r = results[0]!;
  const expected = 0.7 * r.vectorScore + 0.3 * r.keywordScore;
  assert.ok(Math.abs(r.hybridScore - expected) < 0.0001);
});
