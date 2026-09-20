/**
 * The view layer. Pure functions: (state) => HTML string.
 *
 * No virtual DOM, no diffing, no framework. The whole thing is re-rendered on
 * each state change into a container that is scroll-anchored to the bottom.
 * That is deliberately simpler than a diff algorithm — the chat surface is
 * append-mostly, and a full re-render of a few hundred nodes is a sub-millisecond
 * operation. If that ever stops being true, this file is the only thing that
 * changes; the state machine and the client stay as they are.
 */
import type { UiState, Message, ToolCall } from './state.js';
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
  <main class="messages" id="messages">
    ${state.messages.length === 0 ? emptyState(props) : state.messages.map((m) => message(m, props)).join('')}
    ${state.thinking && showThinking ? thinkingBlock(state.thinking) : ''}
  </main>
  ${composer(props)}
</div>`;
}

function header(props: ViewProps): string {
  const { state, locale } = props;
  const status = state.connected
    ? t('status.connected', locale)
    : t('status.disconnected', locale);
  const dot = state.connected ? 'var(--good)' : 'var(--bad)';
  return `<header class="header">
  <div class="brand">
    <strong>${t('app.title', locale)}</strong>
    <span class="tagline">${t('app.tagline', locale)}</span>
  </div>
  <div class="header-right">
    ${state.modelId ? `<span class="model">${t('status.model', locale)}: <code>${esc(state.modelId)}</code></span>` : ''}
    <span class="status"><span class="dot" style="background:${dot}"></span>${esc(status)}</span>
    <button class="ghost" id="theme-btn" title="${t('theme.toggle', locale)}">◐</button>
  </div>
</header>`;
}

function errorBanner(props: ViewProps): string {
  const { state, locale } = props;
  return `<div class="banner error-banner" role="alert">
  <strong>${t('error.label', locale)}:</strong> ${esc(state.error ?? '')}
  <button class="ghost" id="retry-btn">${t('error.retry', locale)}</button>
</div>`;
}

function emptyState(props: ViewProps): string {
  return `<div class="empty">${esc(t('chat.empty', props.locale))}</div>`;
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
