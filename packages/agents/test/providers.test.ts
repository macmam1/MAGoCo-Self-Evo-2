import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { OpenAiProvider, SseStream } from '../src/providers/openai.js';
import { AnthropicProvider } from '../src/providers/anthropic.js';
import type { LlmRequest } from '../src/llm.js';

/** A local HTTP server speaking one provider's wire format, for adapter tests. */
function startServer(handler: (body: any, url: string) => any): Promise<Server> {
  const server = createServer((req, res) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        const parsed = data.length > 0 ? JSON.parse(data) : {};
        const out = handler(parsed, req.url ?? '/');
        if (out instanceof Error) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: { message: out.message } }));
          return;
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(out));
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function baseUrl(server: Server): string {
  const a = server.address();
  return `http://127.0.0.1:${(a as { port: number }).port}`;
}

const req = (messages: Array<{ role: string; content: string }>): LlmRequest => ({
  tier: 'balanced',
  messages: messages.map((m) => ({ role: m.role as 'user', content: m.content })),
  agentId: 'a',
  sessionId: 's',
});

test('openai adapter: parses a text completion', async () => {
  const server = await startServer(() => ({
    model: 'gpt-4o-mini',
    choices: [{ message: { role: 'assistant', content: 'hello there' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
  }));
  const p = new OpenAiProvider({ baseUrl: baseUrl(server), apiKey: 'k', model: 'gpt-4o-mini' });
  const res = await p.complete(req([{ role: 'user', content: 'hi' }]));
  assert.equal(res.stream, false);
  if (!res.stream) {
    assert.equal(res.message.content, 'hello there');
    assert.equal(res.message.toolCalls, undefined);
    assert.equal(res.usage.promptTokens, 5);
    assert.equal(res.usage.completionTokens, 3);
    assert.equal(res.usage.countedByProvider, true);
    assert.equal(res.model, 'gpt-4o-mini');
  }
  server.close();
});

test('openai adapter: parses tool calls and echoes the schema', async () => {
  let received: any;
  const server = await startServer((body) => {
    received = body;
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              { id: 'call_1', type: 'function', function: { name: 'magoco.math.add', arguments: '{"a":1,"b":2}' } },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    };
  });
  const p = new OpenAiProvider({ baseUrl: baseUrl(server), apiKey: 'k', model: 'm' });
  const res = await p.complete({
    ...req([{ role: 'user', content: 'add' }]),
    tools: [
      {
        capability: 'magoco.math.add',
        description: 'add',
        parameters: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } } },
      },
    ],
  });
  if (!res.stream) {
    assert.equal(res.message.toolCalls?.[0]?.capability, 'magoco.math.add');
    assert.equal(res.message.toolCalls?.[0]?.arguments, '{"a":1,"b":2}');
  }
  assert.equal(received.tools[0].function.name, 'magoco.math.add');
  assert.equal(received.tool_choice, 'auto');
  server.close();
});

test('openai adapter: an HTTP error is thrown with the status and body', async () => {
  const server = await startServer(() => new Error('rate limited'));
  const p = new OpenAiProvider({ baseUrl: baseUrl(server), apiKey: 'k', model: 'm' });
  await assert.rejects(() => p.complete(req([{ role: 'user', content: 'x' }])), /HTTP 400/);
  server.close();
});

test('openai adapter: serves() is model-specific', () => {
  const p = new OpenAiProvider({ baseUrl: 'http://x', apiKey: 'k', model: 'gpt-4o-mini' });
  assert.equal(p.serves('gpt-4o-mini'), true);
  assert.equal(p.serves('claude-3'), false);
});

test('openai adapter: Azure builds the deployment path', async () => {
  let seenUrl = '';
  const server = createServer((req_, res) => {
    seenUrl = req_.url ?? '';
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const p = new OpenAiProvider({
    baseUrl: baseUrl(server),
    apiKey: 'k',
    model: 'deploy',
    azureDeployment: 'deploy',
    apiVersion: '2024-06-01',
  });
  await p.complete(req([{ role: 'user', content: 'x' }]));
  assert.match(seenUrl, /\/openai\/deployments\/deploy\/chat\/completions/);
  assert.match(seenUrl, /api-version=2024-06-01/);
  server.close();
});

test('openai adapter: streams chunks and resolves usage', async () => {
  const server = createServer((req_, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const send = (s: string) => res.write(s);
    send(`data: ${JSON.stringify({ choices: [{ delta: { content: 'hello' } }] })}\n\n`);
    send(`data: ${JSON.stringify({ choices: [{ delta: { content: ' world' } }] })}\n\n`);
    send(`data: ${JSON.stringify({ usage: { prompt_tokens: 2, completion_tokens: 2 } })}\n\n`);
    send('data: [DONE]\n\n');
    res.end();
    req_.on('close', () => res.destroy());
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const p = new OpenAiProvider({ baseUrl: baseUrl(server), apiKey: 'k', model: 'm' });
  const res = await p.complete({ ...req([{ role: 'user', content: 'x' }]), stream: true });
  assert.equal(res.stream, true);
  if (res.stream) {
    const parts: string[] = [];
    for await (const c of res.chunks) if (c.delta) parts.push(c.delta);
    assert.equal(parts.join(''), 'hello world');
    const usage = await res.usage;
    assert.equal(usage.promptTokens, 2);
  }
  server.close();
});

test('openai adapter: assembles streamed tool calls across deltas', async () => {
  const server = createServer((req_, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const send = (s: string) => res.write(s);
    send(`data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'magoco.math.add' } }] } }] })}\n\n`);
    send(`data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"a":1' } }] } }] })}\n\n`);
    send(`data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: ',"b":2}' } }] } }] })}\n\n`);
    send('data: [DONE]\n\n');
    res.end();
    req_.on('close', () => res.destroy());
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const p = new OpenAiProvider({ baseUrl: baseUrl(server), apiKey: 'k', model: 'm' });
  const res = await p.complete({ ...req([{ role: 'user', content: 'x' }]), stream: true });
  if (res.stream) {
    let calls: any;
    for await (const c of res.chunks) if (c.toolCalls) calls = c.toolCalls;
    assert.equal(calls[0].capability, 'magoco.math.add');
    assert.equal(calls[0].arguments, '{"a":1,"b":2}');
  }
  server.close();
});

test('sse parser: the SseStream test below covers this path', () => {
  // Covered by the SseStream unit test at the end of this file.
  assert.ok(true);
});

test('anthropic adapter: parses a text completion', async () => {
  const server = await startServer(() => ({
    model: 'claude-3-5-haiku-20241022',
    content: [{ type: 'text', text: 'bonjour' }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 4, output_tokens: 2 },
  }));
  const p = new AnthropicProvider({ baseUrl: baseUrl(server), apiKey: 'k', model: 'claude-3-5-haiku-20241022' });
  const res = await p.complete(req([{ role: 'user', content: 'salut' }]));
  assert.equal(res.stream, false);
  if (!res.stream) {
    assert.equal(res.message.content, 'bonjour');
    assert.equal(res.usage.promptTokens, 4);
    assert.equal(res.usage.completionTokens, 2);
  }
  server.close();
});

test('anthropic adapter: moves the system prompt out of messages', async () => {
  let received: any;
  const server = await startServer((body) => {
    received = body;
    return { content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 1, output_tokens: 1 } };
  });
  const p = new AnthropicProvider({ baseUrl: baseUrl(server), apiKey: 'k', model: 'm' });
  await p.complete({
    tier: 'balanced',
    messages: [
      { role: 'system', content: 'be brief' },
      { role: 'user', content: 'go' },
    ],
    agentId: 'a',
    sessionId: 's',
  });
  assert.equal(received.system, 'be brief');
  assert.equal(received.messages[0].role, 'user');
  assert.equal(received.max_tokens, 4096); // required by the API
  server.close();
});

test('anthropic adapter: parses tool_use blocks', async () => {
  const server = await startServer(() => ({
    content: [
      { type: 'text', text: 'adding' },
      { type: 'tool_use', id: 't1', name: 'magoco.math.add', input: { a: 1, b: 2 } },
    ],
    usage: { input_tokens: 1, output_tokens: 1 },
  }));
  const p = new AnthropicProvider({ baseUrl: baseUrl(server), apiKey: 'k', model: 'm' });
  const res = await p.complete(req([{ role: 'user', content: 'add' }]));
  if (!res.stream) {
    assert.equal(res.message.content, 'adding');
    assert.equal(res.message.toolCalls?.[0]?.capability, 'magoco.math.add');
    assert.equal(res.message.toolCalls?.[0]?.arguments, JSON.stringify({ a: 1, b: 2 }));
  }
  server.close();
});

test('anthropic adapter: a tool result is sent as a user-role tool_result block', async () => {
  let received: any;
  const server = await startServer((body) => {
    received = body;
    return { content: [{ type: 'text', text: 'done' }], usage: { input_tokens: 1, output_tokens: 1 } };
  });
  const p = new AnthropicProvider({ baseUrl: baseUrl(server), apiKey: 'k', model: 'm' });
  await p.complete({
    tier: 'balanced',
    messages: [
      { role: 'user', content: 'add' },
      { role: 'assistant', content: '', toolCalls: [{ id: 't1', capability: 'magoco.math.add', arguments: '{}' }] },
      { role: 'tool', content: '3', toolCallId: 't1' },
    ],
    agentId: 'a',
    sessionId: 's',
  });
  const last = received.messages[received.messages.length - 1];
  assert.equal(last.role, 'user');
  assert.equal(last.content[0].type, 'tool_result');
  assert.equal(last.content[0].tool_use_id, 't1');
  server.close();
});

test('anthropic adapter: an HTTP error is thrown', async () => {
  const server = await startServer(() => new Error('overloaded'));
  const p = new AnthropicProvider({ baseUrl: baseUrl(server), apiKey: 'k', model: 'm' });
  await assert.rejects(() => p.complete(req([{ role: 'user', content: 'x' }])), /HTTP 400/);
  server.close();
});

test('anthropic adapter: streams text and typed events', async () => {
  const server = createServer((req_, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const send = (s: string) => res.write(s);
    send(`event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { usage: { input_tokens: 3 } } })}\n\n`);
    send(`event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'hel' } })}\n\n`);
    send(`event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'lo' } })}\n\n`);
    send(`event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', usage: { output_tokens: 2 } })}\n\n`);
    send(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
    res.end();
    req_.on('close', () => res.destroy());
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const p = new AnthropicProvider({ baseUrl: baseUrl(server), apiKey: 'k', model: 'm' });
  const res = await p.complete({ ...req([{ role: 'user', content: 'x' }]), stream: true });
  if (res.stream) {
    const parts: string[] = [];
    for await (const c of res.chunks) if (c.delta) parts.push(c.delta);
    assert.equal(parts.join(''), 'hello');
    const usage = await res.usage;
    assert.equal(usage.promptTokens, 3);
    assert.equal(usage.completionTokens, 2);
  }
  server.close();
});

test('SseStream: yields data payloads and ignores comments and event lines', async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(ctl) {
      const enc = new TextEncoder();
      ctl.enqueue(enc.encode(': a comment\n'));
      ctl.enqueue(enc.encode('event: ping\n'));
      ctl.enqueue(enc.encode('data: {"a":1}\n'));
      ctl.enqueue(enc.encode('\n'));
      ctl.enqueue(enc.encode('data: [DONE]\n'));
      ctl.enqueue(enc.encode('\n'));
      ctl.close();
    },
  });
  const out: string[] = [];
  for await (const line of new SseStream(stream).dataLines()) out.push(line);
  assert.deepEqual(out, ['{"a":1}', '[DONE]']);
});
