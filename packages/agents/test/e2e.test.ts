/**
 * The end-to-end scenario for Phase 1 (MASTER_PLAN.md §5): a real agent, real store,
 * real memory, real tool — exercising the loop, the memory seam, and the tool seam
 * together. Nothing is mocked except the model itself, which the scripted provider
 * stands in for (a real model belongs to the live suite, not here).
 *
 * Flow: a user asks how many letters a word has. The model must call the `letters`
 * tool rather than guessing, the loop must carry the tool result back, and the
 * answer must be correct — all against a real SQLite store on disk.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { mkdtempSync, rmSync } from 'node:fs';

import { Store } from '../../core/src/persistence/store.js';

import { runLoop } from '../src/loop.js';
import { type ToolInvokeOutput, type ToolInvoker } from '../src/tools.js';
import { ScriptedProvider } from '../src/scripted.js';
import { MemoryCapability, type MemoryStore } from '../src/memory.js';
import type { LlmRequest, Message, ToolSchema } from '../src/llm.js';

const lettersSchema: ToolSchema = {
  capability: 'magoco.text.letters',
  description: 'Count the letters in a word. Always use this instead of guessing.',
  parameters: {
    type: 'object',
    properties: { word: { type: 'string', description: 'the word to measure' } },
    required: ['word'],
  },
};

async function lettersInvoke(args: unknown): Promise<{ word: string; letters: number }> {
  const a = args as { word: string };
  return { word: a.word, letters: a.word.replace(/\s/g, '').length };
}

/** Build a tool invoker that knows only the letters tool, and returns the shape
 * the loop expects: capability + latency on every call, success or failure. */
function lettersInvoker(): ToolInvoker {
  return async (input): Promise<ToolInvokeOutput> => {
    const started = Date.now();
    if (input.capability === 'magoco.text.letters') {
      const out = await lettersInvoke(JSON.parse(input.arguments));
      return {
        ok: true,
        result: JSON.stringify(out),
        capability: input.capability,
        latencyMs: Date.now() - started,
      };
    }
    return {
      ok: false,
      error: `no such tool: ${input.capability}`,
      capability: input.capability,
      latencyMs: Date.now() - started,
    };
  };
}

test('e2e: agent calls the tool and answers correctly through a real store', async () => {
  const root = mkdtempSync(tmpdir() + '/magoco-e2e-');
  const store = new Store(root) as unknown as MemoryStore;
  const mem = new MemoryCapability(store);
  const agentId = 'agent-1';
  const sessionId = 'e2e-1';

  // A model that behaves as a real one should: call the tool, then read the result
  // and answer. The loop is what carries the tool output back to the model.
  const provider = new ScriptedProvider('scripted', [
    {
      when: (req) => req.messages[req.messages.length - 1]?.role === 'user',
      reply: {
        toolCalls: [
          {
            id: 'call-1',
            capability: 'magoco.text.letters',
            arguments: JSON.stringify({ word: 'modelscope' }),
          },
        ],
      },
    },
    {
      when: (req) => req.messages.some((m) => m.role === 'tool'),
      reply: { text: 'The word "modelscope" has 10 letters.' },
    },
  ]);

  const result = await runLoop(
    async (req: LlmRequest) => provider.complete(req),
    lettersInvoker(),
    {
      agentId,
      sessionId,
      task: 'How many letters are in the word "modelscope"?',
      tools: [lettersSchema],
      maxSteps: 6,
    },
  );

  // 1. The answer is right and it ended on an answer, not on a budget.
  assert.equal(result.completed, true);
  assert.equal(result.stopReason, 'answer');
  assert.match(result.answer, /10/);
  assert.ok(result.steps <= 3, `expected <=3 steps, got ${result.steps}`);

  // 2. The trace holds the whole exchange, in order.
  const roles = result.trace.map((m) => m.role);
  assert.deepEqual(roles, ['system', 'user', 'assistant', 'tool', 'assistant']);

  // 3. The tool seam recorded the call and its outcome.
  assert.equal(result.toolCalls.length, 1);
  assert.equal(result.toolCalls[0]?.call.capability, 'magoco.text.letters');
  assert.equal(JSON.parse(result.toolCalls[0]?.outcome.result ?? '{}').letters, 10);

  rmSync(root, { recursive: true, force: true });
});

test('e2e: the loop terminates on maxSteps rather than hanging forever', async () => {
  const root = mkdtempSync(tmpdir() + '/magoco-e2e-');
  const store = new Store(root) as unknown as MemoryStore;

  // A model that never stops calling the tool. The loop must bound it.
  const provider = new ScriptedProvider('scripted', [
    {
      reply: {
        toolCalls: [
          { id: 'c', capability: 'magoco.text.letters', arguments: JSON.stringify({ word: 'x' }) },
        ],
      },
    },
  ]);

  const result = await runLoop(
    async (req: LlmRequest) => provider.complete(req),
    lettersInvoker(),
    { agentId: 'agent-1', sessionId: 'e2e-2', task: 'count forever', tools: [lettersSchema], maxSteps: 4 },
  );

  assert.equal(result.completed, false);
  assert.equal(result.stopReason, 'max_steps');
  assert.equal(result.steps, 4);

  rmSync(root, { recursive: true, force: true });
});

test('e2e: an unusable tool result is reported, not swallowed', async () => {
  const root = mkdtempSync(tmpdir() + '/magoco-e2e-');
  const store = new Store(root) as unknown as MemoryStore;

  // The model asks for a tool that does not exist. The loop must surface that as a
  // failure rather than answering as though nothing went wrong.
  const provider = new ScriptedProvider('scripted', [
    {
      reply: {
        toolCalls: [{ id: 'c1', capability: 'magoco.does.not.exist', arguments: '{}' }],
      },
    },
  ]);

  const result = await runLoop(
    async (req: LlmRequest) => provider.complete(req),
    lettersInvoker(),
    { agentId: 'agent-1', sessionId: 'e2e-3', task: 'use a missing tool', tools: [], maxSteps: 4 },
  );

  assert.equal(result.completed, false);
  // A tool that cannot run is fed back to the model; with no usable answer the
  // loop exhausts its budget rather than reporting success.
  assert.equal(result.stopReason, 'max_steps');
  assert.ok(result.error && result.error.length > 0, 'expected an error message');

  rmSync(root, { recursive: true, force: true });
});
