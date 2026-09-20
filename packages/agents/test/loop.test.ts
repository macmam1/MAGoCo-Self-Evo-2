import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runLoop, type LoopResult } from '../src/loop.js';
import { ScriptedProvider, type Script } from '../src/scripted.js';
import type { LlmRequest, LlmResponse, ToolCall, ToolSchema } from '../src/llm.js';
import type { ToolInvoker, ToolInvokeOutput } from '../src/tools.js';

const TOOLS: readonly ToolSchema[] = [
  {
    capability: 'magoco.math.add',
    description: 'Add two numbers',
    parameters: {
      type: 'object',
      required: ['a', 'b'],
      properties: { a: { type: 'number' }, b: { type: 'number' } },
    },
  },
];

/** A tools seam backed by one in-process capability. */
function makeInvoker(): ToolInvoker {
  return async (input): Promise<ToolInvokeOutput> => {
    const started = Date.now();
    if (input.capability !== 'magoco.math.add') {
      return {
        ok: false,
        error: `capability ${input.capability} is not registered`,
        capability: input.capability,
        latencyMs: 0,
      };
    }
    let args: { a?: number; b?: number };
    try {
      args = JSON.parse(input.arguments || '{}');
    } catch (e) {
      return {
        ok: false,
        error: `arguments are not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
        capability: input.capability,
        latencyMs: Date.now() - started,
      };
    }
    if (typeof args.a !== 'number' || typeof args.b !== 'number') {
      return {
        ok: false,
        error: 'arguments did not match the schema',
        schemaErrors: [
          ...(typeof args.a !== 'number' ? [{ path: 'args.a', message: 'expected number' }] : []),
          ...(typeof args.b !== 'number' ? [{ path: 'args.b', message: 'expected number' }] : []),
        ],
        capability: input.capability,
        latencyMs: Date.now() - started,
      };
    }
    return {
      ok: true,
      result: String(args.a + args.b),
      capability: input.capability,
      latencyMs: Date.now() - started,
    };
  };
}

/** Run the loop against a scripted provider. */
function run(script: Script, opts: Partial<Parameters<typeof runLoop>[2]> = {}): Promise<LoopResult> {
  const provider = new ScriptedProvider('scripted', script);
  const llm = (req: LlmRequest): Promise<LlmResponse> => provider.complete(req);
  return runLoop(llm, makeInvoker(), {
    agentId: 'agent',
    sessionId: 'sess',
    task: 'What is 2+2?',
    tools: TOOLS,
    ...opts,
  });
}

test('loop: answers directly when the model needs no tool', async () => {
  const r = await run([{ reply: { text: 'four' } }]);
  assert.equal(r.completed, true);
  assert.equal(r.stopReason, 'answer');
  assert.equal(r.answer, 'four');
  assert.equal(r.steps, 1);
  assert.equal(r.toolCalls.length, 0);
});

test('loop: calls a tool, reads the result, then answers', async () => {
  const r = await run([
    {
      when: (req) => req.messages[req.messages.length - 1]?.role === 'user',
      reply: {
        toolCalls: [{ id: 'c1', capability: 'magoco.math.add', arguments: '{"a":2,"b":2}' }],
      },
    },
    { reply: { text: 'It is 4.' } },
  ]);
  assert.equal(r.completed, true);
  assert.equal(r.answer, 'It is 4.');
  assert.equal(r.steps, 2);
  assert.equal(r.toolCalls.length, 1);
  assert.equal(r.toolCalls[0]!.outcome.result, '4');
});

test('loop: the tool result message is handed back to the model', async () => {
  let sawResult = false;
  const provider = new ScriptedProvider('s', [
    {
      when: (req) => req.messages[req.messages.length - 1]?.role === 'user',
      reply: { toolCalls: [{ id: 'c1', capability: 'magoco.math.add', arguments: '{"a":1,"b":1}' }] },
    },
    {
      when: (req) => {
        const last = req.messages[req.messages.length - 1];
        sawResult = last?.role === 'tool' && last.content.includes('2');
        return true;
      },
      reply: { text: 'two' },
    },
  ]);
  const r = await runLoop(
    (req) => provider.complete(req),
    makeInvoker(),
    { agentId: 'a', sessionId: 's', task: '1+1?', tools: TOOLS },
  );
  assert.equal(r.answer, 'two');
  assert.equal(sawResult, true);
});

test('loop: an invalid-argument call is reported back and the model can correct it', async () => {
  let sawCorrection = false;
  const provider = new ScriptedProvider('s', [
    {
      when: (req) => req.messages.filter((m) => m.role === 'tool').length === 0,
      reply: { toolCalls: [{ id: 'c1', capability: 'magoco.math.add', arguments: '{"a":"two","b":2}' }] },
    },
    {
      when: (req) => req.messages.filter((m) => m.role === 'tool').length === 1,
      reply: ((): { toolCalls: readonly ToolCall[] } => {
        sawCorrection = true;
        return { toolCalls: [{ id: 'c2', capability: 'magoco.math.add', arguments: '{"a":2,"b":2}' }] };
      })(),
    },
    { reply: { text: '4' } },
  ]);
  const r = await runLoop(
    (req) => provider.complete(req),
    makeInvoker(),
    { agentId: 'a', sessionId: 's', task: '2+2?', tools: TOOLS },
  );
  assert.equal(r.answer, '4');
  assert.equal(sawCorrection, true);
  assert.equal(r.toolCalls[0]!.outcome.ok, false);
});

test('loop: an unknown capability is reported, not fatal', async () => {
  const r = await run([
    {
      when: (req) => !req.messages.some((m) => m.role === 'tool'),
      reply: { toolCalls: [{ id: 'c1', capability: 'magoco.nope', arguments: '{}' }] },
    },
    { reply: { text: 'I could not do that' } },
  ]);
  assert.equal(r.completed, true);
  assert.equal(r.answer, 'I could not do that');
  assert.match(r.toolCalls[0]!.outcome.error!, /not registered/);
});

test('loop: terminates at maxSteps when the model never stops calling tools', async () => {
  const script: Script = [{ reply: { toolCalls: [{ id: 'x', capability: 'magoco.math.add', arguments: '{"a":1,"b":1}' }] } }];
  const r = await run(script, { maxSteps: 3 });
  assert.equal(r.completed, false);
  assert.equal(r.stopReason, 'max_steps');
  assert.equal(r.steps, 3);
  assert.match(r.error!, /budget of 3 steps/);
  assert.equal(r.toolCalls.length, 3);
});

test('loop: an LLM error ends the run with the cause', async () => {
  const llm = async (): Promise<LlmResponse> => {
    throw new Error('network is down');
  };
  const r = await runLoop(llm, makeInvoker(), { agentId: 'a', sessionId: 's', task: 'x', tools: TOOLS });
  assert.equal(r.completed, false);
  assert.equal(r.stopReason, 'llm_error');
  assert.equal(r.error, 'network is down');
});

test('loop: an empty answer is reported as no_answer, not as success', async () => {
  const r = await run([{ reply: { text: '' } }]);
  assert.equal(r.completed, false);
  assert.equal(r.stopReason, 'no_answer');
});

test('loop: the trace holds every message in order', async () => {
  const r = await run([
    {
      when: (req) => req.messages[req.messages.length - 1]?.role === 'user',
      reply: { toolCalls: [{ id: 'c1', capability: 'magoco.math.add', arguments: '{"a":2,"b":2}' }] },
    },
    { reply: { text: '4' } },
  ]);
  const roles = r.trace.map((m) => m.role);
  assert.deepEqual(roles, ['system', 'user', 'assistant', 'tool', 'assistant']);
});

test('loop: a custom system prompt is prepended', async () => {
  let seen: string[] | undefined;
  const provider = new ScriptedProvider('s', [
    {
      when: (req) => {
        seen = req.messages.map((m) => m.content);
        return true;
      },
      reply: { text: 'ok' },
    },
  ]);
  await runLoop(
    (req) => provider.complete(req),
    makeInvoker(),
    { agentId: 'a', sessionId: 's', task: 'go', systemPrompt: 'You are a test harness.', tools: TOOLS },
  );
  assert.equal(seen![0], 'You are a test harness.');
});

test('loop: maxSteps default is applied when omitted', async () => {
  const script: Script = [{ reply: { toolCalls: [{ id: 'x', capability: 'magoco.math.add', arguments: '{"a":1,"b":1}' }] } }];
  const provider = new ScriptedProvider('s', script);
  const r = await runLoop(
    (req) => provider.complete(req),
    makeInvoker(),
    { agentId: 'a', sessionId: 's', task: 'loop forever', tools: TOOLS },
  );
  assert.equal(r.stopReason, 'max_steps');
  assert.ok(r.steps <= 12);
});
