/**
 * The scripted LLM provider: no network, fully deterministic.
 *
 * Two roles in this package:
 *
 * 1. The unit-test provider. The loop, the router, and termination logic must be
 *    testable without a key, a socket, or flakiness. This is that.
 * 2. The reference provider. It is the smallest possible implementation of
 *    `LlmProvider`, so a new adapter author copies it as the shape to match.
 *
 * It is deliberately NOT a mock of any real API — it speaks the framework's own
 * `LlmRequest`/`LlmResponse` contract. What it does with a request is scripted by
 * the test, so the behaviour under test is the framework's, not a backend's.
 */

import type {
  LlmChunk,
  LlmDone,
  LlmProvider,
  LlmRequest,
  LlmResponse,
  Message,
  ToolCall,
  Usage,
} from './llm.js';

/**
 * A canned reply the scripted provider hands back. Provide `text` for a plain
 * answer, `toolCalls` for a tool request, or both for a model that narrates while
 * it calls a tool.
 */
export interface ScriptedReply {
  readonly text?: string;
  readonly toolCalls?: readonly ToolCall[];
  /** Override the auto-counted usage, when a test needs specific numbers. */
  readonly usage?: Partial<Usage>;
}

/**
 * A rule that decides what to reply. A `Script` is an ordered list of rules; the
 * first rule whose `when` matches wins. A rule with no `when` always matches, so it
 * is the default at the end of the list.
 */
export interface ScriptRule {
  /** Return true when this rule should answer `req`. */
  readonly when?: (req: LlmRequest) => boolean;
  readonly reply: ScriptedReply;
}

export type Script = readonly ScriptRule[];

/**
 * A provider whose replies come from a script instead of a network.
 *
 * The script is a list of rules evaluated in order; the first match answers. If no
 * rule matches, the provider throws — a test that reaches that point is testing the
 * wrong thing, and a silent default would hide it.
 *
 * `tier` is accepted and ignored: the scripted provider serves every tier, so the
 * router's tier mapping can be exercised without a second provider.
 */
export class ScriptedProvider implements LlmProvider {
  readonly name: string;
  private calls: LlmRequest[] = [];
  private ruleIndex = 0;

  constructor(
    name: string,
    private script: Script,
  ) {
    this.name = name;
  }

  serves(): boolean {
    return true;
  }

  /** Every request this provider has seen, in order. */
  get requests(): readonly LlmRequest[] {
    return this.calls;
  }

  /** The most recent request, for terse assertions. */
  get lastRequest(): LlmRequest | undefined {
    return this.calls[this.calls.length - 1];
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    this.calls.push(req);
    const reply = this.pick(req);
    const message: Message = {
      role: 'assistant',
      content: reply.text ?? '',
      ...(reply.toolCalls && reply.toolCalls.length > 0 ? { toolCalls: reply.toolCalls } : {}),
    };
    const usage: Usage = {
      promptTokens: countPromptTokens(req),
      completionTokens: countCompletionTokens(message),
      costUsd: 0,
      countedByProvider: false,
      ...reply.usage,
    };
    const started = Date.now();

    if (req.stream) {
      const chunks = this.streamChunks(message, reply.toolCalls ?? []);
      return {
        stream: true,
        chunks,
        usage: Promise.resolve(usage),
        provider: this.name,
        // The model name is whatever the router asked for; the script cannot know.
        model: req.model ?? 'scripted',
      } as LlmResponse;
    }

    return {
      stream: false,
      message,
      usage,
      provider: this.name,
      model: req.model ?? 'scripted',
      latencyMs: Date.now() - started,
    } as LlmDone;
  }

  private pick(req: LlmRequest): ScriptedReply {
    for (const rule of this.script) {
      if (!rule.when || rule.when(req)) return rule.reply;
    }
    throw new Error(
      `scripted provider ${this.name}: no rule matched (request had ${req.messages.length} messages, ` +
        `${req.tools?.length ?? 0} tools, tier ${req.tier ?? 'balanced'})`,
    );
  }

  private async *streamChunks(message: Message, toolCalls: readonly ToolCall[]): AsyncIterable<LlmChunk> {
    // Emit word by word so a consumer can see partial assembly and a final `done`.
    const words = message.content.split(/(\s+)/).filter((w) => w.length > 0);
    for (const w of words) {
      yield { delta: w };
    }
    if (toolCalls.length > 0) yield { toolCalls };
    yield { done: true };
  }
}

/** Rough token count for tests. Not an approximation of any real tokenizer. */
function countPromptTokens(req: LlmRequest): number {
  let chars = 0;
  for (const m of req.messages) chars += m.content.length;
  if (req.tools) for (const t of req.tools) chars += JSON.stringify(t).length;
  return Math.max(1, Math.ceil(chars / 4));
}

function countCompletionTokens(message: Message): number {
  const base = Math.ceil(message.content.length / 4);
  const calls = (message.toolCalls ?? []).reduce((n, c) => n + Math.ceil(c.arguments.length / 4), 0);
  return Math.max(1, base + calls);
}
