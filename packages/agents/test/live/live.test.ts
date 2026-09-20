/**
 * Live LLM suite — opt-in, network-dependent (MASTER_PLAN.md §2.9).
 *
 * Every other test in this package is offline and deterministic. These are not:
 * they send real requests to a real backend, because there is no other way to know
 * whether an adapter actually parses what a real provider emits.
 *
 * When to run: `pnpm test:live`. The CI suite skips this entirely — a CI run that
 * depends on a third party's uptime is a CI run that fails for the wrong reason.
 *
 * What we test here, and why each item matters:
 *   1. A plain text round-trip — can the adapter parse a normal completion?
 *   2. Tool calling — does the model emit tool_calls and does the loop close?
 *   3. Streaming — do SSE chunks reassemble into the same text as non-streaming?
 *   4. Local model (optional) — the whole point of "local LLM" support (§2.9): a
 *      bundled, offline, CPU-only model proves the framework works when the user
 *      has no key at all.
 *
 * Credentials: read from the environment at run time. Never from a file in this
 * repo, and never committed. A missing variable means the test is *skipped*, not
 * failed — "I have not configured a key yet" is not a regression.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { OpenAiProvider } from '../../src/providers/openai.js';
import { AnthropicProvider } from '../../src/providers/anthropic.js';
import { runLoop, collectReply } from '../../src/loop.js';
import type { ToolInvokeInput, ToolInvokeOutput, ToolInvoker } from '../../src/tools.js';
import type { LlmRequest, LlmResponse, Message, ToolSchema } from '../../src/llm.js';

/** Skip when the credential is absent — no key is not a failure. */
function need(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

const OPENAI_BASE = need('MAGOCO_TEST_BASE_URL') ?? 'https://api.openai.com/v1';
const OPENAI_KEY = need('MAGOCO_TEST_API_KEY');
const OPENAI_MODEL = need('MAGOCO_TEST_MODEL') ?? 'gpt-4o-mini';

const LOCAL_BASE = need('MAGOCO_LOCAL_BASE_URL');
const LOCAL_MODEL = need('MAGOCO_LOCAL_MODEL');

const lettersSchema: ToolSchema = {
  capability: 'magoco.text.letters',
  description: 'Count the letters in a word. Always use this instead of guessing.',
  parameters: {
    type: 'object',
    properties: { word: { type: 'string', description: 'the word to measure' } },
    required: ['word'],
  },
};

async function letters(input: ToolInvokeInput): Promise<ToolInvokeOutput> {
  const started = Date.now();
  const args = JSON.parse(input.arguments) as { word: string };
  const out = { word: args.word, letters: args.word.replace(/\s/g, '').length };
  return {
    ok: true,
    result: JSON.stringify(out),
    capability: input.capability,
    latencyMs: Date.now() - started,
  };
}

const invoker: ToolInvoker = async (input) => letters(input);

/** One question the model cannot answer without calling the tool. */
const TOOL_TASK = 'How many letters are in the word "modelscope"? Do not count by eye — call the letters tool.';

// ---------------------------------------------------------------------------

test('live/openai-compat: parses a text completion', { skip: !OPENAI_KEY && 'MAGOCO_TEST_API_KEY not set' }, async () => {
  const p = new OpenAiProvider({ baseUrl: OPENAI_BASE, apiKey: OPENAI_KEY, model: OPENAI_MODEL });
  const res = await p.complete({
    tier: 'balanced',
    messages: [{ role: 'user', content: 'Reply with exactly the word MAGOCO_OK and nothing else.' }],
    agentId: 'live',
    sessionId: 'live-1',
  });
  const { message } = await collectReply(res);
  const text = message.content ?? '';
  assert.ok(text.length > 0, 'empty reply');
});

test('live/openai-compat: tool calling closes the loop', { skip: !OPENAI_KEY && 'MAGOCO_TEST_API_KEY not set' }, async () => {
  const p = new OpenAiProvider({ baseUrl: OPENAI_BASE, apiKey: OPENAI_KEY, model: OPENAI_MODEL });
  const result = await runLoop(async (req: LlmRequest) => p.complete(req), invoker, {
    agentId: 'live',
    sessionId: 'live-tool',
    task: TOOL_TASK,
    tools: [lettersSchema],
    maxSteps: 6,
  });
  assert.equal(result.completed, true, `did not complete: ${result.error}`);
  assert.equal(JSON.parse(result.toolCalls[0]?.outcome.result ?? '{}').letters, 10);
  assert.match(result.answer, /10/);
});

test('live/openai-compat: streaming reassembles the same text', { skip: !OPENAI_KEY && 'MAGOCO_TEST_API_KEY not set' }, async () => {
  const p = new OpenAiProvider({ baseUrl: OPENAI_BASE, apiKey: OPENAI_KEY, model: OPENAI_MODEL });
  const req: LlmRequest = {
    tier: 'balanced',
    messages: [{ role: 'user', content: 'Reply with exactly the word MAGOCO_OK and nothing else.' }],
    agentId: 'live',
    sessionId: 'live-stream',
    stream: true,
  };
  const res = await p.complete(req);
  assert.equal(res.stream, true);
  const parts: string[] = [];
  for await (const chunk of res.chunks as AsyncIterable<{ delta?: string }>) {
    if (chunk.delta) parts.push(chunk.delta);
  }
  assert.ok(parts.length > 0, 'no chunks received');
  assert.ok(/MAGOCO_OK/i.test(parts.join('')), `streamed text wrong: ${parts.join('')}`);
  const usage = await res.usage;
  assert.ok(typeof usage.completionTokens === 'number');
});

// ---------------------------------------------------------------------------

test('live/local: parses a text completion', { skip: !LOCAL_BASE && 'MAGOCO_LOCAL_BASE_URL not set' }, async () => {
  const p = new OpenAiProvider({ baseUrl: LOCAL_BASE, apiKey: 'unused', model: LOCAL_MODEL ?? 'local' });
  const res = await p.complete({
    tier: 'balanced',
    messages: [{ role: 'user', content: 'Reply with exactly the word MAGOCO_OK and nothing else.' }],
    agentId: 'live',
    sessionId: 'local-1',
  });
  const { message } = await collectReply(res);
  const text = message.content ?? '';
  assert.ok(text.length > 0, 'empty reply');
});

test('live/local: tool calling closes the loop', { skip: !LOCAL_BASE && 'MAGOCO_LOCAL_BASE_URL not set' }, async () => {
  const p = new OpenAiProvider({ baseUrl: LOCAL_BASE, apiKey: 'unused', model: LOCAL_MODEL ?? 'local' });
  const result = await runLoop(async (req: LlmRequest) => p.complete(req), invoker, {
    agentId: 'live',
    sessionId: 'local-tool',
    task: TOOL_TASK,
    tools: [lettersSchema],
    maxSteps: 6,
  });
  assert.equal(result.completed, true, `did not complete: ${result.error}`);
  assert.match(result.answer, /10/);
});

test('live/local: streaming reassembles', { skip: !LOCAL_BASE && 'MAGOCO_LOCAL_BASE_URL not set' }, async () => {
  const p = new OpenAiProvider({ baseUrl: LOCAL_BASE, apiKey: 'unused', model: LOCAL_MODEL ?? 'local' });
  const res = await p.complete({
    tier: 'balanced',
    messages: [{ role: 'user', content: 'Count from 1 to 3.' }],
    agentId: 'live',
    sessionId: 'local-stream',
    stream: true,
  });
  const parts: string[] = [];
  for await (const chunk of res.chunks as AsyncIterable<{ delta?: string }>) {
    if (chunk.delta) parts.push(chunk.delta);
  }
  assert.ok(parts.length > 0, 'no chunks received');
  assert.ok(parts.join('').length > 0, 'empty streamed text');
});

// ---------------------------------------------------------------------------

test('live/anthropic: parses a text completion', { skip: !need('ANTHROPIC_API_KEY') && 'ANTHROPIC_API_KEY not set' }, async () => {
  const p = new AnthropicProvider({ apiKey: need('ANTHROPIC_API_KEY') as string, model: 'claude-3-5-haiku-20241022' });
  const res = await p.complete({
    tier: 'balanced',
    messages: [{ role: 'user', content: 'Reply with exactly the word MAGOCO_OK and nothing else.' }],
    agentId: 'live',
    sessionId: 'anthropic-1',
  });
  const { message } = await collectReply(res);
  const text = message.content ?? '';
  assert.ok(text.length > 0, 'empty reply');
});
