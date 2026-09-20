/**
 * The browser entrypoint. Wires the socket to the state machine to the views.
 *
 * This is the only file with side effects; everything else is importable and
 * testable in isolation.
 */
import { createChatClient, type ServerEvent } from './client.js';
import { initial, reduce, type UiState, type UiEvent } from './state.js';
import { render } from './views.js';
import { detectLocale, setLocale, isRtl, type Locale } from './i18n.js';

const ROOT = document.getElementById('app');
if (!ROOT) throw new Error('#app missing from index.html');

let state: UiState = initial;
let locale: Locale = detectLocale();
let showThinking = false;

function dispatch(event: UiEvent): void {
  state = reduce(state, event);
  paint();
}

/** Re-render and keep the user pinned to the newest message. */
function paint(): void {
  const wasNearBottom = nearBottom();
  ROOT!.innerHTML = render({ state, locale, showThinking });
  if (wasNearBottom) ROOT!.querySelector('#messages')?.scrollTo?.(0, 1e9);
  const input = ROOT!.querySelector<HTMLTextAreaElement>('#input');
  if (input && state.phase === 'idle') input.focus();
}

function nearBottom(): boolean {
  const el = ROOT!.querySelector('#messages');
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
}

/** Translate a wire event into a state event. */
function onEvent(e: ServerEvent): void {
  switch (e.t) {
    case 'session_message':
      dispatch(e.role === 'user' ? { t: 'user_sent', text: e.text } : { t: 'run_started' });
      break;
    case 'session_token':
      dispatch({ t: 'token', seq: e.seq, text: e.text });
      break;
    case 'session_thinking':
      dispatch({ t: 'thinking', text: e.text });
      break;
    case 'session_tool':
      dispatch({ t: 'tool', name: e.name, status: e.status, summary: e.summary });
      break;
    case 'session_done':
      dispatch({ t: 'done' });
      break;
    case 'session_failed':
      dispatch({ t: 'failed', error: e.error });
      break;
    case 'session_model':
      dispatch({ t: 'model', modelId: e.modelId });
      break;
    case 'sessions':
      // session list sidebar arrives in a later iteration; the palette is
      // enough for Phase 2.
      break;
    case 'error':
      dispatch({ t: 'failed', error: e.message });
      break;
  }
}

const wsUrl = new URL('/ws', window.location.href);
wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';

const client = createChatClient(wsUrl.toString(), {
  onEvent,
  onOpen: () => dispatch({ t: 'connected' }),
  onClose: () => dispatch({ t: 'disconnected' }),
  onError: (err) => dispatch({ t: 'failed', error: err.message }),
});

function send(): void {
  const input = ROOT!.querySelector<HTMLTextAreaElement>('#input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  client.send(text);
}

ROOT!.addEventListener('click', (ev) => {
  const target = ev.target as HTMLElement;
  if (target.id === 'send-btn') return send();
  if (target.id === 'stop-btn') return client.close();
  if (target.id === 'retry-btn') {
    dispatch({ t: 'clear_error' });
    return void client.connect().catch(() => {/* surfaced via onError */});
  }
  if (target.id === 'export-md-btn') return client.exportSession('markdown');
  if (target.id === 'export-json-btn') return client.exportSession('json');
  if (target.id === 'theme-btn') return toggleTheme();
});

ROOT!.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter' || ev.shiftKey || ev.isComposing) return;
  const target = ev.target as HTMLElement;
  if (target.id === 'input') {
    ev.preventDefault();
    send();
  }
});

ROOT!.addEventListener('input', (ev) => {
  const target = ev.target as HTMLElement;
  if (target.id === 'input') {
    // Auto-grow the textarea up to a sane cap.
    const el = target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }
});

function toggleTheme(): void {
  const html = document.documentElement;
  const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
  html.dataset.theme = next;
  try {
    localStorage.setItem('magoco.theme', next);
  } catch {
    // storage read-only — cosmetic only
  }
}

// Restore theme and direction before first paint.
try {
  const stored = localStorage.getItem('magoco.theme');
  if (stored) document.documentElement.dataset.theme = stored;
} catch {
  /* noop */
}
document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
document.documentElement.lang = locale;

void client.connect().then(() => {
  client.listSessions();
}, (err) => {
  dispatch({ t: 'failed', error: err.message });
});

// Expose for the smoke test and for the curious.
(window as unknown as { magoco: { setLocale: typeof setLocale; state: () => UiState } }).magoco = {
  setLocale,
  state: () => state,
};
