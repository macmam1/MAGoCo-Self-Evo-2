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
    case 'hello':
      break;
    case 'session_message':
      if (e.role === 'user') dispatch({ t: 'user_sent', text: e.text });
      else dispatch({ t: 'assistant_message', text: e.text });
      break;
    case 'session_token':
      dispatch({ t: 'token', seq: e.seq, text: e.delta });
      break;
    case 'session_thinking':
      dispatch({ t: 'thinking', text: e.delta });
      break;
    case 'session_tool_call':
      dispatch({
        t: 'tool',
        id: e.call.id,
        name: e.call.capability,
        status: 'running',
        summary: e.call.args,
      });
      break;
    case 'session_tool_done':
      dispatch({
        t: 'tool_result',
        id: e.outcome.id,
        status: e.outcome.status,
        summary: e.outcome.result,
      });
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
    case 'session_created':
      dispatch({ t: 'model', modelId: e.modelId });
      dispatch({ t: 'run_started' });
      break;
    case 'session_export':
      downloadExport(e.format, e.body);
      break;
    case 'session_list':
      dispatch({ t: 'session_list', sessions: e.sessions });
      break;
    case 'model_list':
      dispatch({ t: 'model_list', models: e.models });
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
  if (target.id === 'palette-btn') return dispatch({ t: 'toggle_palette' });
  if (target.id === 'palette-overlay') return dispatch({ t: 'close_palette' });
  if (target.id === 'lang-btn') return toggleLanguage();

  if (target.classList.contains('palette-action')) {
    const act = target.dataset.action;
    dispatch({ t: 'close_palette' });
    if (act === 'new') return client.createSession();
    if (act === 'export-md') return client.exportSession('markdown');
    if (act === 'export-json') return client.exportSession('json');
  }
});

ROOT!.addEventListener('keydown', (ev) => {
  // Cmd+K or Ctrl+K to toggle command palette
  if ((ev.metaKey || ev.ctrlKey) && ev.key === 'k') {
    ev.preventDefault();
    dispatch({ t: 'toggle_palette' });
    setTimeout(() => {
      ROOT!.querySelector<HTMLInputElement>('#palette-input')?.focus();
    }, 50);
    return;
  }
  // Esc to close palette
  if (ev.key === 'Escape' && state.paletteOpen) {
    ev.preventDefault();
    dispatch({ t: 'close_palette' });
    return;
  }

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

function downloadExport(format: 'json' | 'md', body: string): void {
  const ext = format === 'json' ? 'json' : 'md';
  const mime = format === 'json' ? 'application/json' : 'text/markdown';
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `magoco-export.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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

function toggleLanguage(): void {
  const next = locale === 'fa' ? 'en' : 'fa';
  locale = next;
  setLocale(next);
  document.documentElement.dir = isRtl(next) ? 'rtl' : 'ltr';
  document.documentElement.lang = next;
  paint();
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
  client.createSession();
}, (err) => {
  dispatch({ t: 'failed', error: err.message });
});

// Expose for the smoke test and for the curious.
(window as unknown as { magoco: { setLocale: typeof setLocale; state: () => UiState } }).magoco = {
  setLocale,
  state: () => state,
};
