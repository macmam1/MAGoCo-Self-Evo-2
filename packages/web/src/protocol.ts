/**
 * The shared protocol between packages/web and packages/ui.
 *
 * This file is the ONLY coupling point between server and client. Both import
 * it; neither imports the other. If a change is needed here it is a breaking
 * change to the wire protocol and must be called out in the commit message.
 *
 * Everything the UI learns about the world arrives as a ClientFrame. Everything
 * the UI sends to the server is a ClientCommand. There is no request/response
 * pair that is not also visible on the bus as an event (spec §3.1).
 */

// ---------------------------------------------------------------------------
// Events: server → client
// ---------------------------------------------------------------------------

export type SessionRole = 'user' | 'assistant' | 'system';

/** A tool call as seen by the UI. */
export interface ToolCallView {
  readonly id: string;
  readonly capability: string;
  /** The arguments the model chose, as a JSON string for display. */
  readonly args: string;
}

export interface ToolOutcomeView {
  readonly id: string;
  /** 'ok' | 'error' — the only two terminal states (spec §1.1 D). */
  readonly status: 'ok' | 'error';
  /** The result the tool returned, as a JSON string for display. */
  readonly result: string;
  readonly ms: number;
}

/**
 * The full event vocabulary (spec §3.1).
 *
 * One invariant the tests rely on: exactly ONE of these ends a turn —
 * `session_done` or `session_failed`. `token` and `thinking` may repeat.
 */
export type ClientFrame =
  | { readonly t: 'hello'; readonly sessionId: string | null; readonly version: number }
  | { readonly t: 'session_created'; readonly sessionId: string; readonly title: string; readonly modelId: string }
  | { readonly t: 'session_message'; readonly sessionId: string; readonly role: SessionRole; readonly text: string }
  | { readonly t: 'session_token'; readonly sessionId: string; readonly seq: number; readonly delta: string }
  | { readonly t: 'session_thinking'; readonly sessionId: string; readonly seq: number; readonly delta: string }
  | { readonly t: 'session_tool_call'; readonly sessionId: string; readonly call: ToolCallView }
  | { readonly t: 'session_tool_done'; readonly sessionId: string; readonly outcome: ToolOutcomeView }
  | { readonly t: 'session_done'; readonly sessionId: string; readonly stopReason: string; readonly ms: number; readonly usage?: UsageView }
  | { readonly t: 'session_failed'; readonly sessionId: string; readonly error: string }
  | { readonly t: 'session_model'; readonly sessionId: string; readonly modelId: string }
  | { readonly t: 'session_export'; readonly sessionId: string; readonly format: 'json' | 'md'; readonly body: string }
  | { readonly t: 'session_list'; readonly sessions: ReadonlyArray<SessionSummary> }
  | { readonly t: 'model_list'; readonly models: ReadonlyArray<ModelView> }
  | { readonly t: 'error'; readonly message: string };

export interface UsageView {
  readonly inTokens?: number;
  readonly outTokens?: number;
  readonly costUsd?: number;
}

export interface SessionSummary {
  readonly sessionId: string;
  readonly title: string;
  readonly modelId: string;
  readonly updatedAt: number;
}

export interface ModelView {
  readonly id: string;
  readonly label: string;
  readonly tier: 'fast' | 'balanced' | 'strong';
  readonly ctx?: number;
}

// ---------------------------------------------------------------------------
// Commands: client → server
// ---------------------------------------------------------------------------

export type ClientCommand =
  | { readonly c: 'create' }
  | { readonly c: 'send'; readonly text: string }
  | { readonly c: 'list' }
  | { readonly c: 'search'; readonly q: string }
  | { readonly c: 'export'; readonly format: 'json' | 'md' }
  | { readonly c: 'model_list' }
  | { readonly c: 'model_set'; readonly modelId: string }
  /** Client→server resume: replay from this seq (spec §4 guarantee 3). */
  | { readonly c: 'resume'; readonly seq: number };

/** Wire version. Bumped only on a breaking protocol change. */
export const PROTOCOL_VERSION = 1;

/** Close codes we use (spec §9.1). */
export const CLOSE = {
  NORMAL: 1000,
  PROTOCOL_ERROR: 1002,
  INTERNAL: 1011,
} as const;

/** Type guard used by the server; a frame it cannot recognise is protocol error. */
export function isClientCommand(raw: unknown): raw is ClientCommand {
  if (typeof raw !== 'object' || raw === null) return false;
  const c = (raw as { c?: unknown }).c;
  if (typeof c !== 'string') return false;
  const known = new Set<ClientCommand['c']>([
    'create', 'send', 'list', 'search', 'export', 'model_list', 'model_set', 'resume',
  ]);
  return known.has(c as ClientCommand['c']);
}
