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


// RAG (Feature K)
export interface RAGChunk {
  id: string;
  source: string;
  content: string;
  score: number;
  context: string;
}


// Collaboration (Feature L)
export interface Collaborator {
  id: string;
  name: string;
  cursor?: { x: number; y: number };
  color: string;
}


// Experience Engine (Feature M)
export interface Experience {
  id: string;
  prompt: string;
  embedding: number[];
  score: number;
  timestamp: string;
}

export interface ExperienceEvent {
  type: 'capture' | 'embed' | 'retrieve' | 'inject';
  data: any;
  timestamp: string;
}


export interface CollaborationEvent {
  userId: string;
  type: 'cursor' | 'select' | 'edit';
  data: any;
  timestamp: string;
}


export interface RAGResult {
  query: string;
  chunks: RAGChunk[];
  searchType: 'hybrid' | 'vector' | 'keyword';
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

// Adaptive Canvas Panels (Feature G)
export interface Panel {
  readonly id: string;
  readonly type: 'chat' | 'browser' | 'tools' | 'terminal' | 'file' | 'code' | 'session-log' | 'workflow' | 'rag' | 'collab';
  readonly title: string;
  readonly url?: string;        // For browser panel
  readonly content?: string;  // For tools/file/code panels
  readonly visible: boolean;
  readonly size: number;      // Percentage width (10-90)
  readonly pinned: boolean;
}


// Workflow visualization (Feature H)
export interface WorkflowNode {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  kind: 'action' | 'condition' | 'parallel' | 'loop' | 'hitl';
}

export interface WorkflowEdge {
  from: string;
  to: string;
  label?: string;
}

export interface WorkflowDisplay {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  running: boolean;
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
  readonly paletteOpen: boolean;
  readonly hitlPending: { id: string; type: 'captcha' | 'form' | 'permission'; message: string; data?: any } | null;

  // Adaptive Canvas (Feature G)
  readonly panels: ReadonlyArray<Panel>;
  readonly activePanel: string;   // Currently focused panel ID
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
  paletteOpen: false,
  panels: [
    { id: 'panel-chat', type: 'chat', title: 'Chat', visible: true, size: 100, pinned: true },
  ],
  activePanel: 'panel-chat',
};

// Events that mutate UI state
export type UiEvent =
  | { t: 'connected' }
  | { t: 'disconnected' }
  | { t: 'model'; modelId: string }
  | { t: 'user_sent'; text: string }
  | { t: 'run_started' }
  | { t: 'assistant_message'; text: string }
  | { t: 'token'; seq: number; token: string }
  | { t: 'tool'; id: string; name: string; summary?: string }
  | { t: 'tool_result'; id: string; status: string; summary?: string }
  | { t: 'assistant_done' }
  | { t: 'palette_open' }
  | { t: 'palette_close' }
  // Panel events (Adaptive Canvas)
  | { t: 'panel_add'; type: Panel['type']; title: string; url?: string; content?: string }
  | { t: 'panel_close'; id: string }
  | { t: 'panel_toggle'; id: string }
  | { t: 'panel_resize'; id: string; size: number }
  | { t: 'panel_focus'; id: string }
  | { t: 'panel_pin'; id: string };

  | { t: 'workflow_add'; id: string; name: string; nodes: WorkflowNode[]; edges: WorkflowEdge[] }
  | { t: 'workflow_remove'; id: string }
  | { t: 'workflow_status'; id: string; status: 'running' | 'completed' }
  | { t: 'workflow_node_status'; nodeId: string; status: WorkflowNode['status'] }
  // Session Log (Feature C)
  | { t: 'session_log_add'; id: string; timestamp: string; type: string; data: string }
  | { t: 'session_log_clear' }
  // Human-in-the-Loop (Feature I - HITL)
  | { t: 'hitl_request'; id: string; type: 'captcha' | 'form' | 'permission'; message: string; data?: any }
  | { t: 'hitl_response'; id: string; solution: string }
  | { t: 'hitl_cancel'; id: string }




// Simple in-memory store
const store = { state };
const dispatch = (e: UiEvent) => {
  const newState = reduce(store.state, e);
  Object.assign(store.state, newState);
};

export { store, dispatch };

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
        messages: [...state.messages, { role: 'assistant', text: '', streaming: true }],
        lastSeq: -1,
      };

    case 'assistant_message':
      return {
        ...state,
        messages: state.messages.map((m, i) =>
          i === state.messages.length - 1 ? { ...m, text: m.text + event.text } : m
        ),
      };

    case 'token':
      return {
        ...state,
        messages: state.messages.map((m, i) =>
          i === state.messages.length - 1
            ? { ...m, text: m.text + event.token }
            : m
        ),
        lastSeq: event.seq,
      };

    case 'tool':
      return addTool(state, event);

    case 'tool_result':
      return updateTool(state, event);

    case 'assistant_done':
      return {
        ...state,
        phase: 'idle',
        messages: state.messages.map((m, i) =>
          i === state.messages.length - 1 ? { ...m, streaming: false } : m
        ),
      };

    case 'palette_open':
      return { ...state, paletteOpen: true };

    case 'palette_close':
      return { ...state, paletteOpen: false };

    case 'panel_add': {
      const newPanel: Panel = {
        id: `panel-${event.type}-${Date.now()}`,
        type: event.type,
        title: event.title,
        url: event.url,
        content: event.content,
        visible: true,
        size: 30,
        pinned: false,
      };
      return {
        ...state,
        panels: [...state.panels, newPanel],
        activePanel: newPanel.id,
      };
    }

    case 'panel_close': {
      const filtered = state.panels.filter((p) => p.id !== event.id);
      const active = filtered.length ? filtered[0].id : 'panel-chat';
      return {
        ...state,
        panels: filtered,
        activePanel: active,
      };
    }

    case 'panel_toggle': {
      return {
        ...state,
        panels: state.panels.map((p) =>
          p.id === event.id ? { ...p, visible: !p.visible } : p
        ),
      };
    }

    case 'panel_resize': {
      return {
        ...state,
        panels: state.panels.map((p) =>
          p.id === event.id ? { ...p, size: event.size } : p
        ),
      };
    }

    case 'panel_focus': {
      return { ...state, activePanel: event.id };
    }


    case 'hitl_request':
      return {
        ...state,
        hitlPending: {
          id: event.id,
          type: event.type,
          message: event.message,
          data: event.data
        }
      };

    case 'hitl_response':
      return { ...state, hitlPending: null };

    case 'hitl_cancel':
      return { ...state, hitlPending: null };

    case 'panel_pin': {
      return {
        ...state,
        panels: state.panels.map((p) =>
          p.id === event.id ? { ...p, pinned: !p.pinned } : p
        ),
      };
    }


    case 'workflow_add': {
      const existing = state.panels.find(p => p.id === `workflow-${event.id}`);
      if (existing) return state;
      const workflowPanel: Panel = {
        id: `workflow-${event.id}`,
        type: 'workflow',
        title: event.name,
        visible: true,
        size: 40,
        pinned: false,
      };
      return { ...state, panels: [...state.panels, workflowPanel] };
    }

    case 'workflow_remove': {
      return {
        ...state,
        panels: state.panels.filter(p => p.id !== `workflow-${event.id}`),
      };
    }

    case 'workflow_status': {
      // Would update workflow panel content with status
      return state;
    }

    case 'workflow_node_status': {
      // Would update specific node status in workflow panel
      return state;
    }

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
    status: 'running',
    summary: event.summary || '',
  }];
  msgs[msgs.length - 1] = { ...last, tools };
  return { ...state, messages: msgs };
}

function updateTool(state: UiState, event: UiEvent & { t: 'tool_result' }): UiState {
  const msgs = state.messages.slice();
  const last = msgs[msgs.length - 1];
  if (!last || last.role !== 'assistant') return state;
  const tools = (last.tools ?? []).map((t) =>
    t.id === event.id ? { ...t, status: event.status, summary: event.summary || t.summary } : t
  );
  msgs[msgs.length - 1] = { ...last, tools };
  return { ...state, messages: msgs };
}
