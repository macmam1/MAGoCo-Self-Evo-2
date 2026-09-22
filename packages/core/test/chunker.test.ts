import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chunkDocument } from '../src/rag/chunker.js';

const DOC = 'doc1';
const LONG = 'a'.repeat(600);

test('T-CK1 empty text returns empty array', () => {
  assert.deepEqual(chunkDocument(DOC, ''), []);
  assert.deepEqual(chunkDocument(DOC, '   '), []);
});

test('T-CK2 fixed strategy splits at maxChars', () => {
  const chunks = chunkDocument(DOC, LONG, { strategy: 'fixed', maxChars: 100, overlap: 0 });
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(c => c.text.length <= 100));
});

test('T-CK3 fixed strategy with overlap reuses chars', () => {
  const text = 'a'.repeat(200);
  const chunks = chunkDocument(DOC, text, { strategy: 'fixed', maxChars: 100, overlap: 20 });
  assert.ok(chunks.length >= 2);
  // second chunk starts 80 chars after first
  assert.equal(chunks[1]!.startChar, 80);
});

test('T-CK4 chunks have sequential index', () => {
  const chunks = chunkDocument(DOC, LONG, { strategy: 'fixed', maxChars: 100, overlap: 0 });
  chunks.forEach((c, i) => assert.equal(c.index, i));
});

test('T-CK5 chunks have unique ids', () => {
  const chunks = chunkDocument(DOC, LONG, { strategy: 'fixed', maxChars: 100, overlap: 0 });
  const ids = new Set(chunks.map(c => c.id));
  assert.equal(ids.size, chunks.length);
});

test('T-CK6 all chunks have correct docId', () => {
  const chunks = chunkDocument('my-doc', LONG, { strategy: 'fixed', maxChars: 100, overlap: 0 });
  assert.ok(chunks.every(c => c.docId === 'my-doc'));
});

test('T-CK7 paragraph strategy splits on double newline', () => {
  const text = 'Para one.\n\nPara two.\n\nPara three.';
  const chunks = chunkDocument(DOC, text, { strategy: 'paragraph' });
  assert.equal(chunks.length, 3);
});

test('T-CK8 sentence strategy splits on punctuation', () => {
  const text = 'First sentence. Second sentence! Third sentence?';
  const chunks = chunkDocument(DOC, text, { strategy: 'sentence' });
  assert.ok(chunks.length >= 2);
});

test('T-CK9 startChar and endChar are consistent', () => {
  const text = 'Hello world this is a test document with enough text to split.';
  const chunks = chunkDocument(DOC, text, { strategy: 'fixed', maxChars: 20, overlap: 0 });
  for (const c of chunks) {
    assert.equal(c.endChar - c.startChar, c.text.length);
  }
});

test('T-CK10 short text produces single chunk', () => {
  const chunks = chunkDocument(DOC, 'short', { strategy: 'fixed', maxChars: 512, overlap: 64 });
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0]!.text, 'short');
});

test('T-CK11 metadata is attached to chunks', () => {
  const meta = { source: 'web', lang: 'en' };
  const chunks = chunkDocument(DOC, 'test text', { metadata: meta });
  assert.deepEqual(chunks[0]!.metadata, meta);
});

test('T-CK12 text exactly maxChars produces one chunk', () => {
  const text = 'x'.repeat(512);
  const chunks = chunkDocument(DOC, text, { strategy: 'fixed', maxChars: 512, overlap: 0 });
  assert.equal(chunks.length, 1);
});
