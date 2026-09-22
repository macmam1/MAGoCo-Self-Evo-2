import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createKnowledgeBase, createKBRegistry } from '../src/rag/knowledge-base.js';

const mockEmbed = async (text: string): Promise<number[]> => {
  const v = new Array(26).fill(0);
  for (const c of text.toLowerCase()) {
    const i = c.charCodeAt(0) - 97;
    if (i >= 0 && i < 26) v[i]++;
  }
  return v;
};

test('T-KB1 createKnowledgeBase has correct agentId', () => {
  const kb = createKnowledgeBase('agent-1', mockEmbed);
  assert.equal(kb.agentId, 'agent-1');
});

test('T-KB2 index and size work', async () => {
  const kb = createKnowledgeBase('a1', mockEmbed);
  await kb.index({ id: 'd1', title: 'T', text: 'hello world knowledge base' });
  assert.ok(kb.size() >= 1);
  assert.equal(kb.docCount(), 1);
});

test('T-KB3 retrieve returns result with citations', async () => {
  const kb = createKnowledgeBase('a2', mockEmbed);
  await kb.index({ id: 'd1', title: 'Guide', text: 'typescript is a typed language' });
  const r = await kb.retrieve('typescript');
  assert.ok(r.citations.length >= 1);
});

test('T-KB4 remove clears doc from kb', async () => {
  const kb = createKnowledgeBase('a3', mockEmbed);
  await kb.index({ id: 'd1', title: 'T', text: 'test' });
  kb.remove('d1');
  assert.equal(kb.docCount(), 0);
});

test('T-KB5 clear resets kb', async () => {
  const kb = createKnowledgeBase('a4', mockEmbed);
  await kb.index({ id: 'd1', title: 'T', text: 'data' });
  kb.clear();
  assert.equal(kb.size(), 0);
});

test('T-KB6 registry forAgent creates KB on first call', () => {
  const reg = createKBRegistry(mockEmbed);
  const kb = reg.forAgent('bot-1');
  assert.equal(kb.agentId, 'bot-1');
  assert.ok(reg.agents().includes('bot-1'));
});

test('T-KB7 registry forAgent returns same instance', () => {
  const reg = createKBRegistry(mockEmbed);
  const kb1 = reg.forAgent('bot-2');
  const kb2 = reg.forAgent('bot-2');
  assert.equal(kb1, kb2);
});

test('T-KB8 registry agents lists all', () => {
  const reg = createKBRegistry(mockEmbed);
  reg.forAgent('a');
  reg.forAgent('b');
  assert.ok(reg.agents().includes('a'));
  assert.ok(reg.agents().includes('b'));
});

test('T-KB9 registry removeAgent deletes kb', () => {
  const reg = createKBRegistry(mockEmbed);
  reg.forAgent('x');
  reg.removeAgent('x');
  assert.ok(!reg.agents().includes('x'));
});

test('T-KB10 different agents have independent KBs', async () => {
  const reg = createKBRegistry(mockEmbed);
  const kb1 = reg.forAgent('ag1');
  const kb2 = reg.forAgent('ag2');
  await kb1.index({ id: 'd1', title: 'T', text: 'agent one knowledge' });
  assert.equal(kb1.docCount(), 1);
  assert.equal(kb2.docCount(), 0);
});

test('T-KB11 totalSize sums all KBs', async () => {
  const reg = createKBRegistry(mockEmbed);
  await reg.forAgent('ag3').index({ id: 'd1', title: 'T', text: 'text one' });
  await reg.forAgent('ag4').index({ id: 'd2', title: 'T', text: 'text two' });
  assert.ok(reg.totalSize() >= 2);
});

test('T-KB12 retrieve context contains numbered citations', async () => {
  const kb = createKnowledgeBase('a5', mockEmbed);
  await kb.index({ id: 'd1', title: 'T', text: 'knowledge retrieval test' });
  const r = await kb.retrieve('knowledge');
  assert.ok(r.context.includes('[1]'));
});
