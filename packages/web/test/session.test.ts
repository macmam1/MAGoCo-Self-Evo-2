/**
 * T-W3: the happy path — create → send → stream → done, against the real
 *      session state machine.
 * T-W4: termination — a provider that hangs is force-failed by the watchdog
 *      within the timeout, instead of leaving a client waiting forever.
 *
 * The LLM here is a fake that honours the real LlmStream contract, so these
 * tests exercise the session code, not the network.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createSession, exportMarkdown, exportJson, type LlmCall, type ToolBridge } from '../src/session.js';
import type { ClientFrame } from '../src/protocol.js';

/** Collect everything a session emits, in order. */
function collector(): { frames: ClientFrame[]; emit: (f: ClientFrame) => void } {
  const frames: ClientFrame[] = [];
  return { frames, emit: (f) => frames.push(f) };
}

/** A fake provider that streams a few tokens, then completes. */
function fakeLlm(tokens: string[]): LlmCall {
  return async () => ({
    chunks: (async function* () {
      for (const t of tokens) yield { delta: t };
    })(),
    usage: Promise.resolve({ inTokens: 4, outTokens: tokens.length }),
  });
}

/** A provider that never resolves — until the watchdog aborts it. */
function hangingLlm(): LlmCall {
  return (opts) => new Promise((_, reject) => {
    opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
  });
}

const noopTools: ToolBridge = async () => ({ status: 'ok', result: null });

test('T-W3: send streams tokens in strict seq order and ends in done', async () => {
  const { frames, emit } = collector();
  const session = createSession({
    id: 's1', title: 't', modelId: 'm', maxSteps: 8, timeoutMs: 5000,
    llm: fakeLlm(['M', 'A', 'G', 'o', 'C', 'o']), tools: noopTools, emit,
  });
  await session.send('count letters');

  const kinds = frames.map((f) => f.t);
  assert.deepEqual(kinds, [
    'session_message',
    'session_token', 'session_token', 'session_token', 'session_token', 'session_token', 'session_token',
    'session_done',
  ]);

  // Guarantee 2: token seq is strictly increasing and dense from 1.
  const seqs = frames.filter((f) => f.t === 'session_token').map((f) => f.seq);
  assert.deepEqual(seqs, [1, 2, 3, 4, 5, 6]);

  // The assembled answer is the concatenation of the deltas.
  const done = frames.at(-1)!;
  assert.equal(done.t, 'session_done');
  assert.equal(done.stopReason, 'answer');
  assert.deepEqual(session.messages().at(-1), { role: 'assistant', content: 'MAGoCo' });
});

test('T-W3: thinking deltas arrive in a separate region from the answer', async () => {
  const { frames, emit } = collector();
  const session = createSession({
    id: 's2', title: 't', modelId: 'm', maxSteps: 8, timeoutMs: 5000,
    llm: async () => ({
      chunks: (async function* () {
        yield { thinking: 'considering' };
        yield { delta: 'answer' };
      })(),
    }),
    tools: noopTools, emit,
  });
  await session.send('q');
  const kinds = frames.map((f) => f.t);
  assert.deepEqual(kinds, ['session_message', 'session_thinking', 'session_token', 'session_done']);
});

test('T-W3: setModel emits a session_model frame', () => {
  const { frames, emit } = collector();
  const session = createSession({
    id: 's3', title: 't', modelId: 'a', maxSteps: 8, timeoutMs: 5000,
    llm: fakeLlm(['x']), tools: noopTools, emit,
  });
  session.setModel('b');
  assert.deepEqual(frames.map((f) => f.t), ['session_model']);
  assert.equal(session.getModel(), 'b');
});

test('T-W3: sending while running is refused', async () => {
  const { emit } = collector();
  let release!: () => void;
  const session = createSession({
    id: 's4', title: 't', modelId: 'm', maxSteps: 8, timeoutMs: 5000,
    llm: async () => ({
      chunks: (async function* () {
        yield { delta: 'x' };
        await new Promise<void>((r) => { release = r; });
      })(),
    }),
    tools: noopTools, emit,
  });
  const p = session.send('first');
  await assert.rejects(() => session.send('second'), /already running/);
  release();
  await p;
});

test('T-W4: a hung provider is force-failed within the timeout', async () => {
  const { frames, emit } = collector();
  // Track whether the watchdog fired AFTER the send promise settled — a leaked
  // timer would fire late and re-fail an already-idle session.
  let late = false;
  const session = createSession({
    id: 's5', title: 't', modelId: 'm', maxSteps: 8,
    timeoutMs: 40, // short — this test must be fast
    llm: hangingLlm(), tools: noopTools,
    emit: (f) => {
      if (settled) late = true;
      frames.push(f);
    },
  });
  let settled = false;
  await session.send('hello').finally(() => { settled = true; });
  const kinds = frames.map((f) => f.t);
  assert.deepEqual(kinds, ['session_message', 'session_failed']);
  const failed = frames.at(-1)!;
  assert.equal(failed.t, 'session_failed');
  assert.match(failed.error, /timed out/);
  // Give any leaked watchdog room to fire, then confirm it never did.
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(late, false, 'watchdog fired after the run already settled');
});

test('T-W4: an llm error produces a failed terminal event', async () => {
  const { frames, emit } = collector();
  const session = createSession({
    id: 's6', title: 't', modelId: 'm', maxSteps: 8, timeoutMs: 5000,
    llm: async () => { throw new Error('upstream 503'); },
    tools: noopTools, emit,
  });
  await session.send('hello');
  const failed = frames.at(-1)!;
  assert.equal(failed.t, 'session_failed');
  assert.match(failed.error, /upstream 503/);
  // The session is reusable after a failure.
  assert.doesNotReject(() => session.send('again'));
});

test('T-W4: a stream that errors mid-run still produces a single terminal event', async () => {
  const { frames, emit } = collector();
  const session = createSession({
    id: 's7', title: 't', modelId: 'm', maxSteps: 8, timeoutMs: 4000,
    llm: async () => ({
      chunks: (async function* () {
        yield { delta: 'p' };
        throw new Error('stream broke');
      })(),
    }),
    tools: noopTools, emit,
  });
  await session.send('hello');
  const kinds = frames.map((f) => f.t);
  assert.deepEqual(kinds, ['session_message', 'session_token', 'session_failed']);
  const failed = frames.at(-1)!;
  assert.equal(failed.t, 'session_failed');
  assert.match(failed.error, /stream broke/);
  // close() must cancel any remaining timer — no leaked watchdog.
  session.close();
});

test('T-W5: markdown export round-trips and is not a template-injection vector', () => {
  const { emit } = collector();
  const session = createSession({
    id: 's8', title: 't', modelId: 'm', maxSteps: 8, timeoutMs: 5000,
    llm: fakeLlm(['hi']), tools: noopTools, emit,
  });
  void session;
  const md = exportMarkdown({
    id: 'x', title: 'T </title>', getModel: () => 'm', setModel: () => {},
    send: async () => {}, messages: () => [{ role: 'user', content: '`code`' }],
    close: () => {},
  });
  assert.ok(md.includes('`code`'));
  // Export must not silently rewrite the title into something else.
  assert.ok(md.startsWith('# T </title>'));
});

test('T-W5: json export is valid JSON and carries the messages', () => {
  const json = exportJson({
    id: 'x', title: 't', getModel: () => 'm', setModel: () => {},
    send: async () => {}, messages: () => [{ role: 'user', content: 'hi' }], close: () => {},
  }, 'm');
  const parsed = JSON.parse(json);
  assert.equal(parsed.sessionId, 'x');
  assert.deepEqual(parsed.messages, [{ role: 'user', content: 'hi' }]);
});
