/**
 * The browser-side WebSocket client.
 *
 * This mirrors the scope line of the server (spec §9.1): it sends
 * unfragmented text frames only, and it closes the socket on anything it
 * cannot parse rather than continuing on a desynchronised stream.
 */

/** A server event, as decoded from the wire. Mirrors packages/web/src/protocol.ts. */
export type ServerEvent =
  | { t: 'hello'; sessionId: string | null; version: number }
  | { t: 'session_created'; sessionId: string; title: string; modelId: string }
  | { t: 'session_message'; sessionId: string; role: 'user' | 'assistant'; text: string }
  | { t: 'session_thinking'; sessionId: string; seq: number; delta: string }
  | { t: 'session_token'; sessionId: string; seq: number; delta: string }
  | { t: 'session_tool_call'; sessionId: string; call: { id: string; capability: string; args: string } }
  | { t: 'session_tool_done'; sessionId: string; outcome: { id: string; status: 'ok' | 'error'; result: string; ms: number } }
  | { t: 'session_done'; sessionId: string; stopReason: string; ms: number; usage?: { inTokens?: number; outTokens?: number } }
  | { t: 'session_failed'; sessionId: string; error: string }
  | { t: 'session_model'; sessionId: string; modelId: string }
  | { t: 'session_export'; sessionId: string; format: 'json' | 'md'; body: string }
  | { t: 'session_list'; sessions: Array<{ sessionId: string; title: string; modelId: string; updatedAt: number }> }
  | { t: 'model_list'; models: Array<{ id: string; label: string; tier: string }> }
  | { t: 'error'; message: string };

export interface ChatClient {
  readonly isOpen: boolean;
  connect(): Promise<void>;
  close(): void;
  send(text: string): void;
  setModel(modelId: string): void;
  listSessions(): void;
  exportSession(format: 'markdown' | 'json'): void;
  createSession(): void;
}

export interface ClientCallbacks {
  onEvent: (e: ServerEvent) => void;
  onOpen?: () => void;
  onClose?: (ev: CloseEvent) => void;
  onError?: (err: Error) => void;
}

export function createChatClient(url: string, cb: ClientCallbacks): ChatClient {
  let ws: WebSocket | null = null;
  let closed = false;
  let pending: Array<() => void> = [];

  return {
    get isOpen() {
      return ws !== null && ws.readyState === WebSocket.OPEN;
    },

    connect(): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        if (closed) return reject(new Error('client closed'));
        const socket = new WebSocket(url);
        ws = socket;

        socket.addEventListener('open', () => {
          cb.onOpen?.();
          for (const fn of pending.splice(0)) fn();
          resolve();
        });
        socket.addEventListener('error', () => {
          // The browser gives no detail here; the close event that follows
          // carries the code.
          cb.onError?.(new Error('socket error'));
          if (socket.readyState !== WebSocket.OPEN) reject(new Error('connect failed'));
        });
        socket.addEventListener('close', (ev) => {
          if (!closed) cb.onClose?.(ev);
        });
        socket.addEventListener('message', (ev) => {
          if (typeof ev.data !== 'string') {
            // The server closes binary frames with 1002; arriving here means
            // a bug, not a protocol feature. Fail loudly.
            cb.onError?.(new Error('received a non-text frame'));
            socket.close(1002, 'binary frames are not supported');
            return;
          }
          let parsed: unknown;
          try {
            parsed = JSON.parse(ev.data);
          } catch {
            cb.onError?.(new Error('server sent invalid JSON'));
            socket.close(1002, 'invalid json');
            return;
          }
          if (!isServerEvent(parsed)) {
            cb.onError?.(new Error('server sent an unknown event: ' + JSON.stringify(parsed)));
            return;
          }
          cb.onEvent(parsed);
        });
      });
    },

    close(): void {
      closed = true;
      ws?.close(1000, 'bye');
    },

    send(text: string): void {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ c: 'send', text }));
    },
    setModel(modelId: string): void {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ c: 'model_set', modelId }));
    },
    listSessions(): void {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ c: 'list' }));
    },
    exportSession(format): void {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ c: 'export', format }));
    },
    createSession(): void {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ c: 'create' }));
    },
  };
}

function isServerEvent(v: unknown): v is ServerEvent {
  if (typeof v !== 'object' || v === null) return false;
  const t = (v as { t?: unknown }).t;
  return typeof t === 'string' && t.startsWith('session_') || t === 'sessions' || t === 'error';
}
