/**
 * The view layer. Pure functions: (state) => HTML string.
 *
 * Adaptive Canvas UI (Feature G): Multi-panel layout with dynamic tools.
 */
import type { UiState, Message, ToolCall, Panel } from './state.js';
import { renderMarkdown, esc } from './markdown.js';
import { t, isRtl, type Locale } from './i18n.js';

export interface ViewProps {
  readonly state: UiState;
  readonly locale: Locale;
  readonly showThinking: boolean;
}

/** The full page body. */
export function render(props: ViewProps): string {
  const { state, locale, showThinking } = props;
  const dir = isRtl(locale) ? 'rtl' : 'ltr';

  return `<div class="app" dir="${dir}">
  ${header(props)}
  ${state.error ? errorBanner(props) : ''}
  <div class="main-layout">
    ${panels(props)}
    ${main(props)}
  </div>
  ${state.paletteOpen ? paletteOverlay(props) : ''}
  ${composer(props)}
  ${hitlModal(state, locale)}
</div>`;
}

/** Render all adaptive canvas panels */
function panels(props: ViewProps): string {
  const { state } = props;
  const activePanel = state.panels.find((p) => p.id === state.activePanel);

  return `<aside class="panels">
    ${state.panels.map((panel) => panelRender(panel, props)).join('')}
  </aside>`;
}

/** Render a single panel */
function panelRender(panel: Panel, props: ViewProps): string {
  const { state, locale } = props;
  const isActive = panel.id === state.activePanel;
  const visibleClass = panel.visible ? '' : 'hidden';

  if (!panel.visible) return '';

  return `<div class="panel ${visibleClass} ${isActive ? 'active' : ''}" data-panel-id="${panel.id}">
    <div class="panel-header">
      <span class="panel-title">${esc(panel.title)}</span>
      <div class="panel-actions">
        <button class="ghost panel-btn" title="${t('panel.toggle', locale)}" onclick="togglePanel('${panel.id}')">◀</button>
        <button class="ghost panel-btn" title="${t('panel.pin', locale)}" onclick="togglePin('${panel.id}')">${panel.pinned ? '📌' : '📍'}</button>
        <button class="ghost panel-btn" title="${t('panel.close', locale)}" onclick="closePanel('${panel.id}')">✕</button>
      </div>
    </div>
    <div class="panel-content">
      ${panelContent(panel, props)}
    </div>
    ${hitlModal(state, locale)}
</div>`;
}

/** Render panel-specific content */
function panelContent(panel: Panel, props: ViewProps): string {
  const { locale } = props;

  switch (panel.type) {
    case 'browser':
      return panel.browser ?
        `<iframe src="${esc(panel.url || '')}" class="browser-frame"></iframe>` :
        `<div class="panel-empty">${esc(t('panel.browser_empty', locale))}  ${hitlModal(state, locale)}
</div>`;

    case 'terminal':
      return panel.content ?
        `<pre class="terminal-output">${esc(panel.content)}</pre>` :
        `<div class="panel-empty">${esc(t('panel.terminal_empty', locale))}  ${hitlModal(state, locale)}
</div>`;

    case 'file':
    case 'code':
      return panel.content ?
        `<pre class="code-block">${esc(panel.content)}</pre>` :
        `<div class="panel-empty">${esc(t('panel.code_empty', locale))}  ${hitlModal(state, locale)}
</div>`;

            case 'session-log':
      return panel.content ?
        `<div class="session-log">${esc(panel.content)}</div>` :
        `<div class="panel-empty">${esc(t('panel.session_log_empty', locale))}  ${hitlModal(state, locale)}
</div>`;

case 'workflow':
      return panel.content ?
        `<div class="workflow-canvas">${esc(panel.content)}</div>` :
        `<div class="panel-empty">${esc(t('panel.workflow_empty', locale))}  ${hitlModal(state, locale)}
</div>`;

case 'tools':
      return panel.content ?
        `<div class="tools-list">${esc(panel.content)}</div>` :
        `<div class="panel-empty">${esc(t('panel.tools_empty', locale))}  ${hitlModal(state, locale)}
</div>`;

    default:
      return `<div class="panel-empty">${esc(t('panel.empty', locale))}  ${hitlModal(state, locale)}
</div>`;
  }
}

/** Main chat area */
function main(props: ViewProps): string {
  const { state, locale, showThinking } = props;

  return `<main class="messages" id="messages">
    ${state.messages.length === 0 ? emptyState(props) : state.messages.map((m) => message(m, props)).join('')}
    ${state.thinking && showThinking ? thinkingBlock(state.thinking) : ''}
  </main>`;
}

function header(props: ViewProps): string {
  const { state, locale } = props;
  const status = state.connected
    ? t('status.connected', locale)
    : t('status.disconnected', locale);
  const dot = state.connected ? 'var(--good)' : 'var(--bad)';
  const langLabel = locale === 'en' ? 'فارسی' : 'EN';

  return `<header class="header">
  <div class="brand">
    <strong>${t('app.title', locale)}</strong>
    <span class="tagline">${t('app.tagline', locale)}</span>
  </div>
  <div class="header-right">
    ${state.modelId ? `<span class="model">${t('status.model', locale)}: <code>${esc(state.modelId)}</code></span>` : ''}
    <span class="status"><span class="dot" style="background:${dot}"></span>${esc(status)}</span>
    <button class="ghost" id="lang-btn" title="${locale === 'en' ? t('palette.lang_fa', locale) : t('palette.lang_en', locale)}">${langLabel}</button>
    <button class="ghost" id="theme-btn" title="${t('theme.toggle', locale)}">◐</button>
    <button class="ghost" id="palette-btn" title="${t('palette.trigger', locale)}">⌘</button>
  </div>
</header>`;
}

function errorBanner(props: ViewProps): string {
  const { state, locale } = props;
  return `<div class="banner error-banner" role="alert">
  <strong>${t('error.label', locale)}:</strong> ${esc(state.error ?? '')}
  <button class="ghost" id="retry-btn">${t('error.retry', locale)}</button>
  ${hitlModal(state, locale)}
</div>`;
}

function emptyState(props: ViewProps): string {
  return `<div class="empty">${esc(t('chat.empty', props.locale))}  ${hitlModal(state, locale)}
</div>`;
}

function message(m: Message, props: ViewProps): string {
  const isUser = m.role === 'user';
  const body = isUser ? esc(m.text) : renderMarkdown(m.text);
  const caret = m.streaming ? '<span class="cursor-blink"></span>' : '';
  const tools = m.tools?.length
    ? `<div class="tools">${m.tools.map(toolCard).join('')}</div>`
    : '';
  return `<article class="msg ${isUser ? 'msg-user' : 'msg-assistant'}">
  <div class="msg-body">
    ${body}${caret}
  </div>
  ${tools}
</article>`;
}

function toolCard(tool: ToolCall): string {
  const ok = tool.status === 'ok' || tool.status === 'done';
  const cls = ok ? 'tool-ok' : 'tool-busy';
  return `<div class="tool ${cls}">
  <span class="tool-name">${esc(tool.name)}</span>
  <span class="tool-status">${esc(tool.status)}</span>
  <span class="tool-summary">${esc(tool.summary)}</span>
  ${hitlModal(state, locale)}
</div>`;
}

function thinkingBlock(text: string): string {
  return `<details class="thinking" open>
  <summary>reasoning</summary>
  <div class="thinking-body">${esc(text)}</div>
</details>`;
}

function composer(props: ViewProps): string {
  const { state, locale } = props;
  const busy = state.phase === 'running';
  const btn = busy
    ? `<button id="stop-btn" class="ghost">${t('chat.stop', locale)}</button>`
    : `<button id="send-btn" ${state.connected ? '' : 'disabled'}>${t('chat.send', locale)}</button>`;

  return `<footer class="composer">
  <textarea id="input" rows="1" placeholder="${t('chat.placeholder', locale)}"
    ${busy ? 'disabled' : ''} autocomplete="off"></textarea>
  <div class="composer-actions">
    <button class="ghost" id="export-md-btn" title="${t('chat.export.md', locale)}">⤓ md</button>
    <button class="ghost" id="export-json-btn" title="${t('chat.export.json', locale)}">⤓ json</button>
    ${btn}
  </div>
</footer>`;
}


// HITL (Human-in-the-Loop) Modal
function hitlModal(state: UiState, locale: Locale): string {
  if (!state.hitlPending) return '';
  const { type, message } = state.hitlPending;
  return `<dialog class="hitl-modal" open>
  <div class="hitl-content">
    <h3>${t('hitl.title', locale)}</h3>
    <p>${esc(message)}</p>
    ${type === 'captcha' ? `<input type="text" id="hitl-input" placeholder="${t('hitl.captcha_placeholder', locale)}" />` : ''}
    <div class="hitl-actions">
      <button id="hitl-solve">${t('hitl.solve', locale)}</button>
      <button id="hitl-cancel">${t('hitl.cancel', locale)}</button>
    </div>
  </div>
</dialog>`;
}

function paletteOverlay(props: ViewProps): string {
  const { locale } = props;
  return `<div class="palette-overlay" id="palette-overlay">
  <div class="palette">
    <input type="text" id="palette-input" placeholder="${t('palette.placeholder', locale)}" autocomplete="off" />
    <div class="palette-actions">
      <button class="palette-action" data-action="new">${t('palette.new_chat', locale)}</button>
      <button class="palette-action" data-action="export-md">${t('palette.export_md', locale)}</button>
      <button class="palette-action" data-action="export-json">${t('palette.export_json', locale)}</button>
    </div>
  </div>
  ${hitlModal(state, locale)}
</div>`;
}
