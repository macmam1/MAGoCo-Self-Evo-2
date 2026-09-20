/**
 * The Anthropic adapter (MASTER_PLAN.md §2.9).
 *
 * Anthropic's wire format is genuinely different from OpenAI's, which is why it gets
 * its own adapter rather than a flag on the OpenAI one:
 *
 * - The system prompt is a top-level `system` field, not a message in `messages`.
 * - Tool calls and tool results travel as typed *content blocks* on a message
 *   (`tool_use` / `tool_result`), not as a separate `tool_calls` array.
 * - `max_tokens` is required, not optional.
 * - Streaming sends typed events (`content_block_start`, `content_block_delta`,
 *   `message_delta`), not plain JSON-per-line.
 *
 * What this file is NOT: it does not implement every Anthropic feature — no caching,
 * no computer use, no batch. It implements what `magoco.llm.complete` needs.
 * As with the OpenAI adapter, it never retries and never falls back: it throws, and
 * the router decides what happens next.
 */

import {
  MalformedReplyError,
  type LlmChunk,
  type LlmDone,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
  type Message,
  type ToolCall,
  type Usage,
} from '../llm.js';

export interface AnthropicConfig {
  readonly baseUrl?: string;
  readonly apiKey: string;
  readonly model: string;
  /** Anthropic version header. Default `2023-06-01`. */
  readonly anthropicVersion?: string;
  readonly headers?: Record<string, string>;
  readonly timeoutMs?: number;
}

const DEFAULT_BASE = 'https://api.anthropic.com/v1';
const DEFAULT_VERSION = '2023-06-01';

const PRICE_TABLE: Record<string, { input: number; output: number }> = {
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-7-sonnet-20250219': { input: 3, output: 15 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-opus-4-20250514': { input: 15, output: 75 },
};

function estimateCostUsd(model: string, usage: { inputTokens: number; outputTokens: number }): number {
  const p = PRICE_TABLE[model];
  if (!p) return 0;
  return (usage.inputTokens * p.input + usage.outputTokens * p.output) / 1_000_000;
}

export class AnthropicProvider implements LlmProvider {
  readonly name: string;
  private readonly model: string;

  constructor(private config: AnthropicConfig) {
    this.model = config.model;
    this.name = `anthropic:${this.model}`;
  }

  serves(model: string): boolean {
    return model === this.model;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const base = (this.config.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, '');
    const url = `${base}/messages`;
    const body = this.buildBody(req);
    const started = Date.now();

    const res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
      },
      this.config.timeoutMs ?? 120_000,
    );

    if (!res.ok) {
      const detail = await readErrorBody(res);
      throw new Error(`anthropic ${this.model}: HTTP ${res.status} — ${detail}`);
    }

    if (req.stream) return this.readStream(res, started);
    return this.readJson(res, started);
  }

  private buildHeaders(): Record<string, string> {
    const h: Record<string, string> = {
      'content-type': ' Anthropic JSON',
      'x-api-key': this.config.apiKey,
      'anthropic-version': this.config.anthropicVersion ?? DEFAULT_VERSION,
    };
    if (this.config.headers) Object.assign(h, this.config.headers);
    return h;
  }

  private buildBody(req: LlmRequest): Record<string, unknown> {
    // The system prompt is a top-level field, not a message.
    const system = req.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const turns = req.messages.filter((m) => m.role !== 'system');

    const body: Record<string, unknown> = {
      model: this.model,
      messages: turns.map(toAnthropicMessage),
      max_tokens: req.maxTokens ?? 4096,
    };
    if (system.length > 0) body.system = system;
    if (req.tools && req.tools.length > 0) {
      body.tools = req.tools.map((t) => ({
        name: t.capability,
        description: t.description,
        input_schema: t.parameters,
      }));
    }
    if (req.temperature !== undefined) body.temperature = req.temperature;
    if (req.stream) body.stream = true;
    return body;
  }

  private async readJson(res: Response, started: number): Promise<LlmResponse> {
    const json = (await res.json()) as AnthropicMessageResponse;
    if (!json.content) throw new MalformedReplyError(this.name, 'response had no content blocks');

    let text = '';
    const toolCalls: ToolCall[] = [];
    for (const block of json.content) {
      if (block.type === 'text') text += block.text;
      else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          capability: block.name,
          arguments: JSON.stringify(block.input),
        });
      }
    }

    const message: Message = {
      role: 'assistant',
      content: text,
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
    };

    const usage: Usage = {
      promptTokens: json.usage?.input_tokens ?? 0,
      completionTokens: json.usage?.output_tokens ?? 0,
      costUsd: estimateCostUsd(this.model, {
        inputTokens: json.usage?.input_tokens ?? 0,
        outputTokens: json.usage?.output_tokens ?? 0,
      }),
      countedByProvider: json.usage !== undefined,
    };

    const done: LlmDone = {
      stream: false,
      message,
      usage,
      provider: this.name,
      model: json.model ?? this.model,
      latencyMs: Date.now() - started,
    };
    return done;
  }

  private async readStream(res: Response, started: number): Promise<LlmResponse> {
    if (!res.body) throw new MalformedReplyError(this.name, 'stream response had no body');
    const events = new AnthropicSse(res.body);

    const collected: string[] = [];
    const tools: ToolCall[] = [];
    let inputTokens = 0;
    let outputTokens = 0;
    const modelRef = this.model;

    /** One pass over the stream, one reader. */
    async function* parse(): AsyncIterable<LlmChunk> {
      let currentTool: { id: string; name: string; input: string } | null = null;
      for await (const evt of events.events()) {
        switch (evt.type) {
          case 'message_start':
            inputTokens = evt.message?.usage?.input_tokens ?? 0;
            break;
          case 'content_block_start': {
            const b = evt.content_block;
            if (b?.type === 'tool_use') {
              currentTool = {
                id: b.id,
                name: b.name,
                // The model sends the input across many deltas; assemble it.
                input: typeof b.input === 'string' ? b.input : '',
              };
            }
            break;
          }
          case 'content_block_delta': {
            const d = evt.delta;
            if (d?.type === 'text_delta' && typeof d.text === 'string') {
              collected.push(d.text);
              yield { delta: d.text };
            } else if (d?.type === 'input_json_delta' && currentTool && typeof d.partial_json === 'string') {
              currentTool.input += d.partial_json;
            }
            break;
          }
          case 'content_block_stop': {
            if (currentTool) {
              tools.push({ id: currentTool.id, capability: currentTool.name, arguments: currentTool.input });
              currentTool = null;
            }
            break;
          }
          case 'message_delta': {
            outputTokens = evt.usage?.output_tokens ?? outputTokens;
            break;
          }
          case 'message_stop':
          case 'ping':
            break;
        }
      }
      if (tools.length > 0) yield { toolCalls: tools };
      yield { done: true };
    }

    /** One consumer; when it drains, usage resolves. */
    let resolveUsage!: (u: Usage) => void;
    const usagePromise = new Promise<Usage>((resolve) => {
      resolveUsage = resolve;
    });
    async function* passthrough(): AsyncIterable<LlmChunk> {
      try {
        for await (const c of parse()) yield c;
      } finally {
        resolveUsage({
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          costUsd: estimateCostUsd(modelRef, { inputTokens, outputTokens }),
          countedByProvider: inputTokens > 0 || outputTokens > 0,
        });
      }
    }

    void started;
    return {
      stream: true,
      chunks: passthrough(),
      usage: usagePromise,
      provider: this.name,
      model: this.model,
    };
  }
}

// ---------------------------------------------------------------------------
// Wire types
// ---------------------------------------------------------------------------

interface AnthropicMessageResponse {
  id?: string;
  model?: string;
  role?: string;
  content?: Array<
    | { type: 'text'; text: string }
    | { type: 'tool_use'; id: string; name: string; input: unknown }
  >;
  stop_reason?: string | null;
  usage?: { input_tokens?: number; output_tokens?: number };
}

function toAnthropicMessage(m: Message): Record<string, unknown> {
  if (m.role === 'tool') {
    // Anthropic carries a tool result as a user-role message with a tool_result block.
    return {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: m.toolCallId,
          content: m.content,
        },
      ],
    };
  }
  if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
    const blocks: unknown[] = [];
    if (m.content.length > 0) blocks.push({ type: 'text', text: m.content });
    for (const tc of m.toolCalls) {
      blocks.push({
        type: 'tool_use',
        id: tc.id,
        name: tc.capability,
        input: safeParse(tc.arguments),
      });
    }
    return { role: 'assistant', content: blocks };
  }
  return { role: m.role, content: m.content };
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// SSE with typed Anthropic events
// ---------------------------------------------------------------------------

type AnthropicEvent = {
  type: string;
  message?: { usage?: { input_tokens?: number } };
  index?: number;
  content_block?: { type: string; id: string; name: string; input?: unknown };
  delta?: { type: string; text?: string; partial_json?: string };
  usage?: { output_tokens?: number };
};

export class AnthropicSse {
  constructor(private source: ReadableStream<Uint8Array>) {}

  async *events(): AsyncIterable<AnthropicEvent> {
    const reader = this.source.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).replace(/\r$/, '');
          buffer = buffer.slice(nl + 1);
          const trimmed = line.trim();
          if (trimmed === '' || trimmed.startsWith(':')) continue;
          if (trimmed.startsWith('data:')) {
            const payload = trimmed.slice('data:'.length).trim();
            if (payload === '' || payload === '[DONE]') continue;
            try {
              yield JSON.parse(payload) as AnthropicEvent;
            } catch {
              /* a keep-alive or partial line is skipped, not fatal */
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`anthropic: request timed out after ${timeoutMs}ms (${url})`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.length > 500 ? `${text.slice(0, 500)}…` : text;
  } catch {
    return '<no body>';
  }
}
