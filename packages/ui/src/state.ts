/**
 * The client-side model. One source of truth; views are pure functions of it.
 *
 * Guarantee 2 (spec §3.2): tokens append in strict seq order. The store
 * enforces that here too — a token whose seq is not exactly lastSeq+1 is
 * dropped and reported, never inserted out of order.
 */
export type RunPhase = 'idle' | 'running';

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly summary: string;
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
  readonly tier: string;
}

export interface Message {
  readonly role: 'user' | 'assistant';
  readonly text: string;
  /** Present while the assistant message is still streaming. */
  readonly streaming?: boolean;
  readonly tools?: ReadonlyArray<ToolCall>;
}

export interface UiState {
  readonly phase: RunPhase;
  readonly modelId: string | null;
  readonly messages: ReadonlyArray<Message>;
  /** The seq of the last token accepted, for the ordering guarantee. */
  readonly lastSeq: number;
  /** Accumulated reasoning text, shown collapsed until expanded. */
  readonly thinking: string;
  readonly error: string | null;
  readonly connected: boolean;
  readonly sessions: ReadonlyArray<SessionSummary>;
  readonly models: ReadonlyArray<ModelView>;
}

export const initial: UiState = {
  phase: 'idle',
  modelId: null,
  messages: [],
  lastSeq: -1,
  thinking: '',
  error: null,
  connected: false,
  sessions: [],
  models: [],
};

/**
 * All state transitions go through this. Returning a new object every time
 * means a view is a pure `(state) => nodes` function with no surprises.
 */
export function reduce(state: UiState, event: UiEvent): UiState {
  switch (event.t) {
    case 'connected':
      return { ...state, connected: true, error: null };

    case 'disconnected':
      return { ...state, connected: false, phase: 'idle' };

    case 'model':
      return { ...state, modelId: event.modelId };

    case 'user_sent':
      return {
        ...state,
        phase: 'running',
        error: null,
        messages: [...state.messages, { role: 'user', text: event.text }],
      };

    case 'run_started':
      return {
        ...state,
        phase: 'running',
        error: null,
        // Reserve the assistant slot; tokens stream into it.
        messages: [...state.messages, { role: 'assistant', text: '', streaming: true }],
        lastSeq: -1,
      };

    case 'assistant_message':
      return {
        ...state,
        phase: 'running',
        error: null,
        messages: [...state.messages, { role: 'assistant', text: event.text, streaming: true }],
        lastSeq: -1,
      };

    case 'token': {
      // Guarantee 2. Anything out of order is a protocol violation, not a
      // rendering artifact.
      if (event.seq !== state.lastSeq + 1) {
        return { ...state, error: `protocol: token seq ${event.seq} after ${state.lastSeq}` };
      }
      const msgs = state.messages.slice();
      const last = msgs[msgs.length - 1];
      if (!last || last.role !== 'assistant' || !last.streaming) return state;
      msgs[msgs.length - 1] = { ...last, text: last.text + event.text };
      return { ...state, messages: msgs, lastSeq: event.seq };
    }

    case 'thinking':
      return { ...state, thinking: state.thinking + event.text };

    case 'tool':
      return addTool(state, event);

    case 'tool_result':
      return updateTool(state, event);

    case 'session_list':
      return { ...state, sessions: event.sessions };

    case 'model_list':
      return { ...state, models: event.models };

    case 'done': {
      const msgs = state.messages.slice();
      const last = msgs[msgs.length - 1];
      if (last && last.streaming) {
        // Drop the marker outright rather than setting it to undefined —
        // exactOptionalPropertyTypes makes those two different shapes.
        const { streaming: _drop, ...rest } = last;
        msgs[msgs.length - 1] = rest;
      }
      return { ...state, phase: 'idle', messages: msgs };
    }

    case 'failed':
      return { ...state, phase: 'idle', error: event.error };

    case 'clear_error':
      return { ...state, error: null };

    default:
      return state;
  }
}

function addTool(state: UiState, event: UiEvent & { t: 'tool' }): UiState {
  const msgs = state.messages.slice();
  const last = msgs[msgs.length - 1];
  if (!last || last.role !== 'assistant') return state;
  const tools = [...(last.tools ?? []), {
    id: event.id,
    name: event.name,
    status: event.status,
    summary: event.summary,
  }];
  msgs[msgs.length - 1] = { ...last, tools };
  return { ...state, messages: msgs };
}

function updateTool(state: UiState, event: UiEvent & { t: 'tool_result' }): UiState {
  const msgs = state.messages.slice();
  const last = msgs[msgs.length - 1];
  if (!last || last.role !== 'assistant') return state;
  const tools = (last.tools ?? []).map((tc) =>
    tc.id === event.id ? { ...tc, status: event.status === 'ok' ? 'done' : 'error', summary: event.summary } : tc,
  );
  msgs[msgs.length - 1] = { ...last, tools };
  return { ...state, messages: msgs };
}

export type UiEvent =
  | { t: 'connected' }
  | { t: 'disconnected' }
  | { t: 'model'; modelId: string }
  | { t: 'user_sent'; text: string }
  | { t: 'run_started' }
  | { t: 'assistant_message'; text: string }
  | { t: 'token'; seq: number; text: string }
  | { t: 'thinking'; text: string }
  | { t: 'tool'; id: string; name: string; status: string; summary: string }
  | { t: 'tool_result'; id: string; status: 'ok' | 'error'; summary: string }
  | { t: 'session_list'; sessions: ReadonlyArray<SessionSummary> }
  | { t: 'model_list'; models: ReadonlyArray<ModelView> }
  | { t: 'done' }
  | { t: 'failed'; error: string }
  | { t: 'clear_error' };
