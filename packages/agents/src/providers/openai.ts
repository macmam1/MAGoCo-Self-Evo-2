/**
 * The OpenAI-compatible adapter (MASTER_PLAN.md §2.9).
 *
 * One adapter serves every backend that speaks the OpenAI Chat Completions wire
 * format: OpenAI itself, Azure OpenAI, xAI, DeepSeek, Qwen, Mistral, Groq,
 * OpenRouter, Together, Fireworks, Cohere — and every local server (Ollama,
 * llama.cpp / llama-server, LM Studio, vLLM, SGLang) plus the 9router endpoint.
 * That is the point of the standard: one client, many backends, chosen by `baseUrl`.
 *
 * What this file is NOT: it is not a general-purpose OpenAI SDK. It implements only
 * what `magoco.llm.complete` needs — chat completions, tools, JSON-mode structured
 * output, and SSE streaming. It has zero runtime dependencies: `fetch` and
 * `ReadableStream` are in Node 18+, and SSE is parsed by hand below.
 *
 * Error contract: this adapter NEVER retries and never falls back. It reports failure
 * by throwing; the router owns both (see router.ts). That division is why a provider
 * stays a thin transport.
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
  type ToolSchema,
  type Usage,
} from '../llm.js';

/** Configuration for one OpenAI-compatible endpoint. */
export interface OpenAiConfig {
  /** Endpoint root, e.g. `https://api.openai.com/v1`. No trailing slash needed. */
  readonly baseUrl: string;
  /** API key. Read from the environment, never from config files. */
  readonly apiKey: string;
  /** Model id as the backend spells it, e.g. `gpt-4o-mini`. */
  readonly model: string;
  /** When the backend is Azure, this is the deployment name and the path differs. */
  readonly azureDeployment?: string;
  /** Override the API version header (Azure `api-version`). */
  readonly apiVersion?: string;
  /** Extra headers for a backend that needs its own (e.g. `Helicone-Auth`). */
  readonly headers?: Record<string, string>;
  /**
   * Overrides the `user-agent`. Needed by gateways whose free tier only serves
   * clients that identify as a known agent.
   */
  readonly userAgent?: string;
  /** Request timeout in ms. Default 120000. */
  readonly timeoutMs?: number;
}

/** Rough USD price per 1M tokens, used only when the backend reports no pricing. */
const PRICE_TABLE: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1': { input: 2, output: 8 },
  'o4-mini': { input: 1.1, output: 4.4 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
};

/** Prices change; treat the table as an estimate and never as truth. */
function estimateCostUsd(model: string, usage: { promptTokens: number; completionTokens: number }): number {
  const p = PRICE_TABLE[model];
  if (!p) return 0;
  return (usage.promptTokens * p.input + usage.completionTokens * p.output) / 1_000_000;
}

export class OpenAiProvider implements LlmProvider {
  readonly name: string;
  private readonly model: string;

  constructor(private config: OpenAiConfig) {
    this.name = config.azureDeployment ? `openai:${config.azureDeployment}` : `openai:${config.model}`;
    this.model = config.model;
  }

  serves(model: string): boolean {
    return model === this.model || model === this.config.azureDeployment;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const url = this.chatUrl();
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
      throw new Error(`openai ${this.model}: HTTP ${res.status} — ${detail}`);
    }

    if (req.stream) {
      return this.readStreamChunks(req, res, started, this.model);
    }

    // Some gateways stream even when we did not ask. A plain JSON.parse on an SSE
    // body throws and looks like a protocol error; if the body smells like SSE,
    // collect it as a stream instead. This is the 9router behaviour.
    const text = await res.text();
    if (isSseBody(text)) {
      return this.readStreamChunks(req, new Response(text), started, this.model);
    }

    const json = JSON.parse(text) as ChatCompletionResponse;
    const message = parseChoice(json);
    const usage = usageFromResponse(json, this.model);
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

  private chatUrl(): string {
    const base = this.config.baseUrl.replace(/\/+$/, '');
    if (this.config.azureDeployment) {
      const q = this.config.apiVersion ? `?api-version=${this.config.apiVersion}` : '';
      return `${base}/openai/deployments/${this.config.azureDeployment}/chat/completions${q}`;
    }
    return `${base}/chat/completions`;
  }

  private buildHeaders(): Record<string, string> {
    const h: Record<string, string> = {
      'content-type': 'application/json',
      authorization: `Bearer ${this.config.apiKey}`,
    };
    if (this.config.apiVersion && !this.config.azureDeployment) h['api-version'] = this.config.apiVersion;
    // An anonymous-token gateway must not be able to pass for a keyed one.
    if (this.config.apiKey === 'public') h['x-magoco-anonymous'] = '1';
    if (this.config.userAgent) h['user-agent'] = this.config.userAgent;
    if (this.config.headers) Object.assign(h, this.config.headers);
    return h;
  }

  private buildBody(req: LlmRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: req.messages.map(toOpenAiMessage),
    };
    if (req.tools && req.tools.length > 0) {
      body.tools = req.tools.map(toOpenAiTool);
      body.tool_choice = 'auto';
    }
    if (req.outputSchema) {
      // JSON mode: the schema is attached so a well-behaved backend honours it.
      body.response_format = { type: 'json_object' };
    }
    if (req.temperature !== undefined) body.temperature = req.temperature;
    if (req.maxTokens !== undefined) body.max_tokens = req.maxTokens;
    if (req.stream) body.stream = true;
    return body;
  }

  private async readStream(res: Response, started: number): Promise<LlmResponse> {
    if (!res.body) throw new MalformedReplyError(this.name, 'stream response had no body');
    const events = new SseStream(res.body);

    const collected: string[] = [];
    const toolAcc = new Map<number, { id: string; capability: string; args: string }>();
    let providerUsage: Usage | undefined;
    const modelRef = this.model;

    /** The actual parse; one pass over the stream, one reader. */
    async function* parse(): AsyncIterable<LlmChunk> {
      for await (const line of events.dataLines()) {
        if (line === '[DONE]') break;
        let delta: ChatStreamDelta;
        try {
          delta = JSON.parse(line) as ChatStreamDelta;
        } catch {
          throw new MalformedReplyError('openai', `unparseable stream chunk: ${line}`);
        }
        if (delta.usage) providerUsage = usageFromStreamChunk(delta, modelRef);
        const choice = delta.choices?.[0];
        if (!choice) continue;
        const d = choice.delta;
        if (d?.content) {
          collected.push(d.content);
          yield { delta: d.content };
        }
        for (const tc of d?.tool_calls ?? []) {
          const slot = toolAcc.get(tc.index) ?? { id: '', capability: '', args: '' };
          if (tc.id) slot.id = tc.id;
          if (tc.function?.name) slot.capability = tc.function.name;
          if (tc.function?.arguments) slot.args += tc.function.arguments;
          toolAcc.set(tc.index, slot);
        }
      }
      const calls: ToolCall[] = [...toolAcc.values()].map((s) => ({
        id: s.id,
        capability: s.capability,
        arguments: s.args,
      }));
      if (calls.length > 0) yield { toolCalls: calls };
      yield { done: true };
    }

    /**
     * One consumer of the parse, so the stream is read exactly once. When that
     * consumer drains it, usage resolves — there is no second pass over the stream.
     */
    let resolveUsage!: (u: Usage) => void;
    const usagePromise = new Promise<Usage>((resolve) => {
      resolveUsage = resolve;
    });
    async function* passthrough(): AsyncIterable<LlmChunk> {
      try {
        for await (const c of parse()) yield c;
      } finally {
        resolveUsage(
          providerUsage ?? {
            promptTokens: 0,
            completionTokens: Math.ceil(collected.join('').length / 4),
            costUsd: 0,
            countedByProvider: false,
          },
        );
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

  private async readStreamChunks(
    _req: LlmRequest,
    res: Response,
    started: number,
    model: string,
  ): Promise<LlmResponse> {
    if (!res.body) throw new MalformedReplyError(this.name, 'stream response had no body');
    const events = new SseStream(res.body);

    const collected: string[] = [];
    const toolAcc = new Map<number, { id: string; capability: string; args: string }>();
    let providerUsage: Usage | undefined;

    async function* parse(): AsyncIterable<LlmChunk> {
      for await (const line of events.dataLines()) {
        if (line === '[DONE]') break;
        let delta: ChatStreamDelta;
        try {
          delta = JSON.parse(line) as ChatStreamDelta;
        } catch {
          throw new MalformedReplyError('openai', `unparseable stream chunk: ${line}`);
        }
        if (delta.usage) providerUsage = usageFromStreamChunk(delta, model);
        const choice = delta.choices?.[0];
        if (!choice) continue;
        const d = choice.delta;
        if (d?.content) {
          collected.push(d.content);
          yield { delta: d.content };
        }
        for (const tc of d?.tool_calls ?? []) {
          const slot = toolAcc.get(tc.index) ?? { id: '', capability: '', args: '' };
          if (tc.id) slot.id = tc.id;
          if (tc.function?.name) slot.capability = tc.function.name;
          if (tc.function?.arguments) slot.args += tc.function.arguments;
          toolAcc.set(tc.index, slot);
        }
      }
      const calls: ToolCall[] = [...toolAcc.values()].map((s) => ({
        id: s.id,
        capability: s.capability,
        arguments: s.args,
      }));
      if (calls.length > 0) yield { toolCalls: calls };
      yield { done: true };
    }

    let resolveUsage!: (u: Usage) => void;
    const usagePromise = new Promise<Usage>((resolve) => {
      resolveUsage = resolve;
    });
    async function* passthrough(): AsyncIterable<LlmChunk> {
      try {
        for await (const c of parse()) yield c;
      } finally {
        resolveUsage(
          providerUsage ?? {
            promptTokens: 0,
            completionTokens: Math.ceil(collected.join('').length / 4),
            costUsd: 0,
            countedByProvider: false,
          },
        );
      }
    }

    void started;
    return {
      stream: true,
      chunks: passthrough(),
      usage: usagePromise,
      provider: this.name,
      model,
    };
  }
}

// ---------------------------------------------------------------------------
// Wire types
// ---------------------------------------------------------------------------

interface ChatCompletionResponse {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

interface ChatStreamDelta {
  choices?: Array<{
    delta?: {
      role?: string;
      content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/** True when a body is SSE rather than JSON. Gateways that ignore `stream: false`
 * send `data: {...}` lines, which is not parseable as a completion. */
function isSseBody(text: string): boolean {
  return text.trimStart().startsWith('data:');
}

function parseChoice(json: ChatCompletionResponse): Message {
  const choice = json.choices?.[0];
  if (!choice || !choice.message) {
    throw new MalformedReplyError('openai', 'response had no choices[0].message');
  }
  const m = choice.message;
  const toolCalls: ToolCall[] = (m.tool_calls ?? []).map((tc) => ({
    id: tc.id,
    capability: tc.function.name,
    arguments: tc.function.arguments,
  }));
  const message: Message = {
    role: 'assistant',
    content: m.content ?? '',
    ...(toolCalls.length > 0 ? { toolCalls } : {}),
  };
  return message;
}

function usageFromResponse(json: ChatCompletionResponse, model: string): Usage {
  const u = json.usage;
  const promptTokens = u?.prompt_tokens ?? 0;
  const completionTokens = u?.completion_tokens ?? 0;
  return {
    promptTokens,
    completionTokens,
    costUsd: estimateCostUsd(model, { promptTokens, completionTokens }),
    countedByProvider: u !== undefined,
  };
}

function usageFromStreamChunk(delta: ChatStreamDelta, model: string): Usage {
  const u = delta.usage;
  const promptTokens = u?.prompt_tokens ?? 0;
  const completionTokens = u?.completion_tokens ?? 0;
  return {
    promptTokens,
    completionTokens,
    costUsd: estimateCostUsd(model, { promptTokens, completionTokens }),
    countedByProvider: u !== undefined,
  };
}

function toOpenAiMessage(m: Message): Record<string, unknown> {
  const out: Record<string, unknown> = { role: m.role, content: m.content };
  if (m.toolCalls && m.toolCalls.length > 0) {
    out.tool_calls = m.toolCalls.map((tc) => ({
      id: tc.id,
      type: 'function',
      function: { name: tc.capability, arguments: tc.arguments },
    }));
  }
  if (m.toolCallId) out.tool_call_id = m.toolCallId;
  return out;
}

function toOpenAiTool(t: ToolSchema): Record<string, unknown> {
  return {
    type: 'function',
    function: { name: t.capability, description: t.description, parameters: t.parameters },
  };
}

// ---------------------------------------------------------------------------
// fetch with timeout, and a hand-rolled SSE parser
// ---------------------------------------------------------------------------

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`openai: request timed out after ${timeoutMs}ms (${url})`);
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

/**
 * Server-Sent Events, parsed without a dependency.
 *
 * An SSE stream is `event:`/`data:` lines separated by blank lines. OpenAI streams
 * use plain `data:` lines carrying JSON, terminated by `data: [DONE]`. This parser
 * yields the content of each `data:` line and nothing else.
 */
export class SseStream {
  constructor(private source: ReadableStream<Uint8Array>) {}

  async *dataLines(): AsyncIterable<string> {
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
          if (trimmed === '') continue; // event boundary
          if (trimmed.startsWith(':')) continue; // comment
          if (trimmed.startsWith('data:')) {
            const payload = trimmed.slice('data:'.length).trim();
            if (payload !== '') yield payload;
          }
          // event:/id:/retry: lines are ignored — OpenAI does not use them here
        }
      }
      const tail = buffer.trim();
      if (tail.startsWith('data:')) {
        const payload = tail.slice('data:'.length).trim();
        if (payload !== '') yield payload;
      }
    } finally {
      reader.releaseLock();
    }
  }
}

function parseSse(source: ReadableStream<Uint8Array>): SseStream {
  return new SseStream(source);
}
