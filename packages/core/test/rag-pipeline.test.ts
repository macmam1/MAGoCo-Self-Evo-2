import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRAGPipeline } from '../src/rag/pipeline.js';
import type { Document } from '../src/rag/pipeline.js';

const mockEmbed = async (text: string): Promise<number[]> => {
  const v = new Array(26).fill(0);
  for (const c of text.toLowerCase()) {
    const i = c.charCodeAt(0) - 97;
    if (i >= 0 && i < 26) v[i]++;
  }
  return v;
};

function doc(id: string, title: string, text: string, source?: string): Document {
  return { id, title, text, ...(source ? { source } : {}) };
}

test('T-RAG1 size and docCount are 0 initially', () => {
  const rag = createRAGPipeline(mockEmbed);
  assert.equal(rag.size(), 0);
  assert.equal(rag.docCount(), 0);
});

test('T-RAG2 index returns chunk count > 0', async () => {
  const rag = createRAGPipeline(mockEmbed);
  const n = await rag.index(doc('d1', 'Doc 1', 'hello world this is a test document'));
  assert.ok(n >= 1);
});

test('T-RAG3 docCount increments after index', async () => {
  const rag = createRAGPipeline(mockEmbed);
  await rag.index(doc('d1', 'D1', 'text one'));
  await rag.index(doc('d2', 'D2', 'text two'));
  assert.equal(rag.docCount(), 2);
});

test('T-RAG4 retrieve returns citations', async () => {
  const rag = createRAGPipeline(mockEmbed);
  await rag.index(doc('d1', 'TypeScript Guide', 'typescript programming language features'));
  const result = await rag.retrieve('typescript');
  assert.ok(result.citations.length >= 1);
  assert.equal(result.query, 'typescript');
});

test('T-RAG5 citation has docTitle and chunkText', async () => {
  const rag = createRAGPipeline(mockEmbed);
  await rag.index(doc('d1', 'My Doc', 'some interesting content'));
  const result = await rag.retrieve('interesting');
  assert.equal(result.citations[0]!.docTitle, 'My Doc');
  assert.ok(typeof result.citations[0]!.chunkText === 'string');
});

test('T-RAG6 citation score between 0 and 1', async () => {
  const rag = createRAGPipeline(mockEmbed);
  await rag.index(doc('d1', 'D', 'hello world'));
  const result = await rag.retrieve('hello');
  assert.ok(result.citations[0]!.score >= 0 && result.citations[0]!.score <= 1);
});

test('T-RAG7 context is non-empty string after retrieve', async () => {
  const rag = createRAGPipeline(mockEmbed);
  await rag.index(doc('d1', 'D', 'context building test text'));
  const result = await rag.retrieve('context');
  assert.ok(typeof result.context === 'string' && result.context.length > 0);
});

test('T-RAG8 context includes chunk number markers', async () => {
  const rag = createRAGPipeline(mockEmbed);
  await rag.index(doc('d1', 'D', 'test content'));
  const result = await rag.retrieve('test');
  assert.ok(result.context.includes('[1]'));
});

test('T-RAG9 remove deletes doc and its chunks', async () => {
  const rag = createRAGPipeline(mockEmbed);
  await rag.index(doc('d1', 'D1', 'remove me please'));
  await rag.index(doc('d2', 'D2', 'keep me'));
  rag.remove('d1');
  assert.equal(rag.docCount(), 1);
});

test('T-RAG10 retrieve on empty returns empty citations', async () => {
  const rag = createRAGPipeline(mockEmbed);
  const result = await rag.retrieve('anything');
  assert.deepEqual(result.citations, []);
  assert.equal(result.context, '');
});

test('T-RAG11 source field propagates to citation', async () => {
  const rag = createRAGPipeline(mockEmbed);
  await rag.index(doc('d1', 'D', 'source test', 'https://example.com'));
  const result = await rag.retrieve('source');
  assert.equal(result.citations[0]!.source, 'https://example.com');
});

test('T-RAG12 clear resets everything', async () => {
  const rag = createRAGPipeline(mockEmbed);
  await rag.index(doc('d1', 'D1', 'some text'));
  rag.clear();
  assert.equal(rag.size(), 0);
  assert.equal(rag.docCount(), 0);
});
