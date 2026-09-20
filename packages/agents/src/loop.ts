/**
 * The ReAct loop (MASTER_PLAN.md §2.1, §2.2).
 *
 * The loop is the agent: think (LLM) → act (tool) → observe (tool result) → repeat,
 * until the model answers without calling a tool.
 *
 * The design constraint that shapes every line here is that the loop must *terminate*
 * without a human watching it. A model that repeatedly calls a broken tool, or that
 * calls tools forever, must not spin up an unbounded bill. So every exit path is
 * explicit and every continuation is bounded:
 *
 *   - the model replies with no tool calls          -> the answer is done
 *   - the model calls a tool                        -> run it, append the result, continue
 *   - a tool call has invalid arguments             -> tell the model what was wrong,
 *                                                     let it correct itself, continue
 *   - a tool is unknown                             -> tell the model, continue
 *   - the model calls more tools than fit in a turn -> the extra calls are reported
 *                                                     back as errors, not silently dropped
 *   - the LLM fails after fallback                  -> the run ends with that error
 *   - the loop hits `maxSteps`                      -> the run ends with a budget error
 *
 * There is no path where the loop continues without making progress, and no path
 * where a failure is swallowed into an infinite retry.
 */

import type {
  LlmChunk,
  LlmRequest,
  LlmResponse,
  Message,
  ToolCall,
  ToolSchema,
} from './llm.js';
import { NoProviderSucceededError } from './llm.js';
import {
  formatSchemaErrors,
  invokeTool,
  type ToolInvoker,
  type ToolInvokeOutput,
} from './tools.js';
import type { Tier } from './llm.js';

/** Options for one run of the loop. */
export interface LoopOptions {
  readonly agentId: string;
  readonly sessionId: string;
  /** The user's question. */
  readonly task: string;
  /** Capabilities the model may call. */
  readonly tools?: readonly ToolSchema[];
  /** Hard ceiling on think/act iterations. Default 12. */
  readonly maxSteps?: number;
  /** Weight class for the model. Default `balanced`. */
  readonly tier?: Tier;
  /** Stream the model's text out as it arrives. */
  readonly stream?: boolean;
  /** A system prompt prepended to every conversation. */
  readonly systemPrompt?: string;
  /** Temperature for the model. */
  readonly temperature?: number;
  readonly maxTokens?: number;
}

/** The result of a completed run. */
export interface LoopResult {
  /** The model's final answer. Empty when the loop ended on a budget error. */
  readonly answer: string;
  /** True when the loop ended with a real answer; false when it hit a limit or error. */
  readonly completed: boolean;
  /** Why the loop ended, for telemetry and for the caller to act on. */
  readonly stopReason: 'answer' | 'max_steps' | 'llm_error' | 'no_answer';
  /** Every message exchanged, in order — the full trace. */
  readonly trace: readonly Message[];
  /** Every tool call made, with its outcome. */
  readonly toolCalls: Array<{ call: ToolCall; outcome: ToolInvokeOutput }>;
  /** Number of think/act iterations actually performed. */
  readonly steps: number;
  /** Present only when `stopReason` is not `answer`. */
  readonly error?: string;
}

const DEFAULT_MAX_STEPS = 12;

const BASE_SYSTEM_PROMPT = [
  'You are a MAGoCo agent. Answer the user task.',
  'You may call tools to gather information or take action.',
  'Call a tool only when you cannot answer without it.',
  'When you call a tool, wait for its result before continuing.',
  'When you have the answer, reply with text and no tool calls.',
].join(' ');

/**
 * Run the ReAct loop to completion.
 *
 * `llm` and `tools` are the two seams: the first produces model turns, the second
 * executes tool calls. Neither is a network client and neither knows about the other.
 */
export async function runLoop(
  llm: (req: LlmRequest) => Promise<LlmResponse>,
  tools: ToolInvoker,
  opts: LoopOptions,
): Promise<LoopResult> {
  const maxSteps = opts.maxSteps ?? DEFAULT_MAX_STEPS;
  const messages: Message[] = [];
  if (opts.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt });
  messages.push({ role: 'system', content: BASE_SYSTEM_PROMPT });
  messages.push({ role: 'user', content: opts.task });

  const toolCallLog: Array<{ call: ToolCall; outcome: ToolInvokeOutput }> = [];

  for (let step = 1; step <= maxSteps; step++) {
    const req: LlmRequest = {
      tier: opts.tier ?? 'balanced',
      messages,
      ...(opts.tools ? { tools: opts.tools } : {}),
      stream: opts.stream ?? false,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      ...(opts.maxTokens !== undefined ? { maxTokens: opts.maxTokens } : {}),
      agentId: opts.agentId,
      sessionId: opts.sessionId,
    };

    let res: LlmResponse;
    try {
      res = await llm(req);
    } catch (e) {
      return {
        answer: '',
        completed: false,
        stopReason: 'llm_error',
        trace: messages,
        toolCalls: toolCallLog,
        steps: step,
        error: describeLlmError(e),
      };
    }

    const reply = await collectReply(res);
    messages.push(reply.message);

    const calls = reply.message.toolCalls ?? [];
    if (calls.length === 0) {
      // The model answered without acting. That is the only clean exit.
      const answer = reply.message.content.trim();
      return {
        answer,
        completed: answer.length > 0,
        stopReason: answer.length > 0 ? 'answer' : 'no_answer',
        trace: messages,
        toolCalls: toolCallLog,
        steps: step,
      };
    }

    // The model acted. Execute each call, then hand the results back.
    for (const call of calls) {
      const outcome = await invokeTool(tools, call, {
        agentId: opts.agentId,
        sessionId: opts.sessionId,
        turn: step,
      });
      toolCallLog.push({ call, outcome });
      const resultMessage: Message = outcome.ok
        ? { role: 'tool', content: outcome.result ?? '', toolCallId: call.id }
        : {
            role: 'tool',
            content: toolFailureText(call, outcome),
            toolCallId: call.id,
          };
      messages.push(resultMessage);
    }
  }

  // Every step was consumed by a tool call; the model never produced an answer.
  return {
    answer: '',
    completed: false,
    stopReason: 'max_steps',
    trace: messages,
    toolCalls: toolCallLog,
    steps: maxSteps,
    error: `the loop exhausted its budget of ${maxSteps} steps without an answer`,
  };
}

/** Collapse a streamed or non-streamed reply into one message. */
export async function collectReply(res: LlmResponse): Promise<{ message: Message }> {
  if (!res.stream) {
    return { message: res.message };
  }
  const parts: string[] = [];
  let toolCalls: readonly ToolCall[] = [];
  for await (const chunk of res.chunks as AsyncIterable<LlmChunk>) {
    if (chunk.delta) parts.push(chunk.delta);
    if (chunk.toolCalls) toolCalls = chunk.toolCalls;
  }
  // The usage promise is awaited elsewhere (the router's ledger); here we only need
  // the assembled message so the loop can continue.
  void res.usage;
  return {
    message: {
      role: 'assistant' as const,
      content: parts.join(''),
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
    },
  };
}

/** Render a failed tool call as text the model can learn from on the next turn. */
function toolFailureText(call: ToolCall, outcome: ToolInvokeOutput): string {
  const lines = [`tool ${call.capability} failed`];
  if (outcome.error) lines.push(`error: ${outcome.error}`);
  if (outcome.schemaErrors && outcome.schemaErrors.length > 0) {
    lines.push('the arguments did not match the schema:');
    lines.push(formatSchemaErrors(outcome.schemaErrors));
  }
  lines.push('correct the arguments and try again, or answer without the tool');
  return lines.join('\n');
}

function describeLlmError(e: unknown): string {
  if (e instanceof NoProviderSucceededError) {
    return `every LLM provider failed (${e.causes.length} attempts); the first was: ${String(e.causes[0]?.error)}`;
  }
  return e instanceof Error ? e.message : String(e);
}
