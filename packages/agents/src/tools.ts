/**
 * The tools seam: a tool *is* a capability (MASTER_PLAN.md §2.2).
 *
 * `magoco.tools.invoke` is the only path the loop uses to call anything, and it
 * guarantees three things the loop relies on:
 *
 * 1. The model's arguments are validated against the capability's JSON Schema before
 *    the capability runs — a tool never receives untyped input.
 * 2. A capability that throws or returns `undefined` is reported to the model as a
 *    structured tool error, so a broken tool degrades to a retry, not a crash.
 * 3. The schema the model sees is derived from the capability's own declared
 *    `parameters`, so there is no second place for it to drift out of sync.
 */

import type { ToolCall, ToolSchema } from './llm.js';
import { validate, type SchemaError } from './schema.js';

/** What `magoco.tools.invoke` takes. */
export interface ToolInvokeInput {
  /** The capability id, exactly as the model named it in the ToolCall. */
  readonly capability: string;
  /** The model's arguments as a JSON string. Empty string when the model sent none. */
  readonly arguments: string;
  /** Whose run this is — forwarded to the capability as its context. */
  readonly agentId: string;
  readonly sessionId: string;
  readonly turn: number;
}

/** What `magoco.tools.invoke` returns — always, even when the tool failed. */
export interface ToolInvokeOutput {
  /** True only when arguments validated AND the capability returned a value. */
  readonly ok: boolean;
  /** The capability's result, serialized to a string. Present only when `ok`. */
  readonly result?: string;
  /** Present only when `!ok`: why the call failed, in a form the model can act on. */
  readonly error?: string;
  /** Dot-path errors from schema validation, when that is why it failed. */
  readonly schemaErrors?: readonly SchemaError[];
  readonly capability: string;
  readonly latencyMs: number;
}

/**
 * The function a runtime registers to make a capability callable as a tool.
 *
 * Implementations resolve `capability` to a capability instance and invoke it. This
 * indirection keeps `@magoco/agents` free of a dependency on `@magoco/core` — the
 * loop talks to the seam, not to the registry (MASTER_PLAN.md §1.5).
 */
export type ToolInvoker = (input: ToolInvokeInput) => Promise<ToolInvokeOutput>;

export class ToolNotFoundError extends Error {
  constructor(capability: string) {
    super(`tool ${capability} is not registered`);
    this.name = 'ToolNotFoundError';
  }
}

/**
 * Run the tools seam for one tool call. This is the whole contract; the router and
 * the loop both go through it.
 *
 * Failure modes, and what the model sees for each:
 * - arguments are not valid JSON      -> ok:false, error names the parse failure
 * - arguments fail schema validation  -> ok:false, schemaErrors list every path
 * - capability is unknown             -> ToolNotFoundError (the loop treats this as
 *                                        terminal misconfiguration, not a retry)
 * - capability throws                 -> ok:false, error is the thrown message
 * - capability returns undefined      -> ok:false, error says so explicitly
 */
export async function invokeTool(
  invoker: ToolInvoker,
  call: ToolCall,
  ctx: { agentId: string; sessionId: string; turn: number },
): Promise<ToolInvokeOutput> {
  const started = Date.now();
  const out = await invoker({
    capability: call.capability,
    arguments: call.arguments,
    agentId: ctx.agentId,
    sessionId: ctx.sessionId,
    turn: ctx.turn,
  });
  return { ...out, latencyMs: out.latencyMs || Date.now() - started };
}

/**
 * Turn a capability's declared schema into the form the model receives.
 *
 * The capability owns its `parameters`; nothing here is hand-mirrored.
 */
export function describeTool(
  capability: string,
  description: string,
  parameters: object,
): ToolSchema {
  return { capability, description, parameters };
}

/**
 * Format schema errors as one message the model can correct in its next turn.
 * Listed in order, one per line, so a multi-field error is fully visible.
 */
export function formatSchemaErrors(errors: readonly SchemaError[]): string {
  return errors.map((e) => `${e.path}: ${e.message}`).join('\n');
}

/**
 * Validate a tool call's arguments before the capability is touched.
 *
 * Exported for the seam's own tests and for providers that want to pre-check.
 */
export function validateToolArguments(call: ToolCall, parameters: object): readonly SchemaError[] {
  const parsed = parseArguments(call.arguments);
  if (!parsed.ok) {
    return [{ path: 'args', message: `arguments are not valid JSON: ${parsed.error}` }];
  }
  const result = validate(parsed.value, parameters, 'args');
  return result.errors;
}

/** Parse the model's arguments string, tolerating the empty string. */
export function parseArguments(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const text = raw.trim();
  if (text === '') return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
