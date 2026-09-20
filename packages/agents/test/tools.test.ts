import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSchemaErrors,
  invokeTool,
  parseArguments,
  validateToolArguments,
  type ToolInvokeOutput,
  type ToolInvoker,
} from '../src/tools.js';
import type { ToolCall } from '../src/llm.js';

/** A seam backed by an in-process map of capabilities. */
function makeInvoker(capabilities: Record<string, (args: unknown) => unknown>): ToolInvoker {
  return async (input): Promise<ToolInvokeOutput> => {
    const started = Date.now();
    const fn = capabilities[input.capability];
    if (!fn) {
      return {
        ok: false,
        error: `capability ${input.capability} is not registered`,
        capability: input.capability,
        latencyMs: Date.now() - started,
      };
    }
    const parsed = parseArguments(input.arguments);
    if (!parsed.ok) {
      return {
        ok: false,
        error: `arguments are not valid JSON: ${parsed.error}`,
        capability: input.capability,
        latencyMs: Date.now() - started,
      };
    }
    // The seam validates against the capability's own schema before it runs.
    try {
      const out = await fn(parsed.value);
      if (out === undefined) {
        return {
          ok: false,
          error: `capability ${input.capability} returned no value`,
          capability: input.capability,
          latencyMs: Date.now() - started,
        };
      }
      return {
        ok: true,
        result: typeof out === 'string' ? out : JSON.stringify(out),
        capability: input.capability,
        latencyMs: Date.now() - started,
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        capability: input.capability,
        latencyMs: Date.now() - started,
      };
    }
  };
}

const ctx = { agentId: 'a', sessionId: 's', turn: 1 };

test('tools: a well-formed call returns the result', async () => {
  const invoker = makeInvoker({
    'magoco.greet.hello': (a) => ({ greeting: `hi ${(a as { name: string }).name}` }),
  });
  const out = await invokeTool(invoker, {
    id: 'c1',
    capability: 'magoco.greet.hello',
    arguments: JSON.stringify({ name: 'World' }),
  }, ctx);
  assert.equal(out.ok, true);
  assert.equal(out.result, JSON.stringify({ greeting: 'hi World' }));
});

test('tools: an unknown capability is reported, not thrown', async () => {
  const invoker = makeInvoker({});
  const out = await invokeTool(invoker, { id: 'c1', capability: 'nope', arguments: '{}' }, ctx);
  assert.equal(out.ok, false);
  assert.match(out.error!, /not registered/);
});

test('tools: a capability that throws becomes a tool error', async () => {
  const invoker = makeInvoker({
    boom: () => {
      throw new Error('kaput');
    },
  });
  const out = await invokeTool(invoker, { id: 'c1', capability: 'boom', arguments: '{}' }, ctx);
  assert.equal(out.ok, false);
  assert.equal(out.error, 'kaput');
});

test('tools: a capability returning undefined is reported', async () => {
  const invoker = makeInvoker({ empty: () => undefined });
  const out = await invokeTool(invoker, { id: 'c1', capability: 'empty', arguments: '{}' }, ctx);
  assert.equal(out.ok, false);
  assert.match(out.error!, /returned no value/);
});

test('tools: unparseable arguments are reported with a parse error', async () => {
  const invoker = makeInvoker({ any: () => 1 });
  const out = await invokeTool(invoker, { id: 'c1', capability: 'any', arguments: '{oops' }, ctx);
  assert.equal(out.ok, false);
  assert.match(out.error!, /not valid JSON/);
});

test('tools: an empty arguments string is treated as an empty object', async () => {
  const invoker = makeInvoker({ any: () => ({ ok: 1 }) });
  const out = await invokeTool(invoker, { id: 'c1', capability: 'any', arguments: '' }, ctx);
  assert.equal(out.ok, true);
});

test('tools: schema validation lists every offending path', () => {
  const schema = {
    type: 'object',
    required: ['query'],
    properties: { query: { type: 'string' }, limit: { type: 'integer' } },
  };
  const call: ToolCall = {
    id: 'c1',
    capability: 'magoco.search',
    arguments: JSON.stringify({ limit: 'ten' }),
  };
  const errors = validateToolArguments(call, schema);
  const paths = errors.map((e) => e.path);
  assert.deepEqual(paths.sort(), ['args.limit', 'args.query']);
});

test('tools: formatSchemaErrors renders one line per error', () => {
  const text = formatSchemaErrors([
    { path: 'args.query', message: 'required property is missing' },
    { path: 'args.limit', message: 'expected integer, got string' },
  ]);
  assert.equal(text, 'args.query: required property is missing\nargs.limit: expected integer, got string');
});

test('tools: latency is always present', async () => {
  const invoker = makeInvoker({ any: () => 1 });
  const out = await invokeTool(invoker, { id: 'c1', capability: 'any', arguments: '{}' }, ctx);
  assert.equal(typeof out.latencyMs, 'number');
  assert.ok(out.latencyMs >= 0);
});
