/**
 * UI main entry point. Mounts to #app.
 */
import type { UiEvent } from './state.js';
import { state, dispatch } from './state.js';
import { render } from './views.js';
import { t, isRtl, type Locale } from './i18n.js';

const app = document.getElementById('app')!;
const locale: Locale = navigator.language.startsWith('fa') ? 'fa' : 'en';

/**
 * Render the UI.
 */
function paint() {
  app.innerHTML = render({ state, locale, showThinking: true });
  initPanelHandlers();
}

/** Initialize panel event handlers */
function initPanelHandlers() {
  // Panel toggle
  document.querySelectorAll('.panel-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const panelId = target.closest('.panel')?.dataset?.panelId;
      if (!panelId) return;

      if (target.title.includes('toggle') || target.textContent === '◀') {
        dispatch({ t: 'panel_toggle', id: panelId });
      } else if (target.title.includes('pin')) {
        dispatch({ t: 'panel_pin', id: panelId });
      } else if (target.title.includes('close')) {
        dispatch({ t: 'panel_close', id: panelId });
      }
    });
  });

  // Panel focus on click
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.addEventListener('click', (e) => {
      const panelId = (e.target as HTMLElement).closest('.panel')?.dataset?.panelId;
      if (panelId && panelId !== state.activePanel) {
        dispatch({ t: 'panel_focus', id: panelId });
      }
    });
  });
}

/**
 * Connect to the backend.
 */
async function connect() {
  const wsUrl = `ws://${window.location.host}/ws`;
  const ws = new WebSocket(wsUrl);

  ws.addEventListener('open', () => {
    dispatch({ t: 'connected' });
  });

  ws.addEventListener('message', async (e) => {
    const data = JSON.parse(e.data);

    switch (data.t) {
      case 'token':
        dispatch({ t: 'token', seq: data.seq, token: data.token });
        break;

      case 'tool':
        dispatch({ t: 'tool', id: data.id, name: data.name, summary: data.summary });
        break;

      case 'tool_result':
        dispatch({ t: 'tool_result', id: data.id, status: data.status, summary: data.summary });
        break;

      case 'panel_add':
        dispatch({ t: 'panel_add', type: data.type, title: data.title, url: data.url, content: data.content });
        break;

      case 'panel_close':
        dispatch({ t: 'panel_close', id: data.id });
        break;

      default:
        dispatch(data);
    }

    paint();
  });

  ws.addEventListener('close', () => {
    dispatch({ t: 'disconnected' });
  });

  return ws;
}

/**
 * Send message from composer.
 */
function setupComposer(ws: WebSocket) {
  const input = document.getElementById('input') as HTMLTextAreaElement;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !state.phase === 'running') {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      dispatch({ t: 'user_sent', text });
      ws.send(JSON.stringify({ t: 'user_sent', text }));
      input.value = '';
      paint();
    }
  });

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 200)}px`;
  });
}

/**
 * Palette handler.
 */
function setupPalette() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();

      const paletteOpen = state.paletteOpen;
      dispatch({ t: paletteOpen ? 'palette_close' : 'palette_open' });
      paint();

      if (!paletteOpen) {
        setTimeout(() => {
          document.getElementById('palette-input')?.focus();
        }, 10);
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (state.paletteOpen && !(e.target as HTMLElement).closest('.palette')) {
      dispatch({ t: 'palette_close' });
      paint();
    }
  });
}

/**
 * Toolbar actions.
 */
function setupToolbar() {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Language toggle
    if (target.id === 'lang-btn') {
      const newLocale = locale === 'en' ? 'fa' : 'en';
      localStorage.setItem('locale', newLocale);
      // Would need to reload page or update locale dynamically
    }

    // Theme toggle
    if (target.id === 'theme-btn') {
      document.documentElement.classList.toggle('dark');
    }

    // Export markdown
    if (target.id === 'export-md-btn') {
      const md = state.messages.map((m) => `**${m.role}:**\n${m.text}`).join('\n\n');
      downloadFile(md, 'chat.md', 'text/markdown');
    }

    // Export JSON
    if (target.id === 'export-json-btn') {
      const json = JSON.stringify(state.messages, null, 2);
      downloadFile(json, 'chat.json', 'application/json');
    }

    // Stop
    if (target.id === 'stop-btn') {
      // Would need to implement stop action
    }

    // Retry
    if (target.id === 'retry-btn') {
      window.location.reload();
    }
  });
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Entry point.
 */
async function main() {
  paint();
  const ws = await connect();
  setupComposer(ws);
  setupPalette();
  setupToolbar();
}

main();
