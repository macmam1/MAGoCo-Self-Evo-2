/**
 * @magoco/ui — the browser client for MAGoCo.
 *
 * Framework-free and bundler-free (spec §6.2). `main.ts` is loaded directly
 * as an ES module by `index.html`; everything else is imported from it. There
 * is no build step in the dev loop — a clone, a `pnpm install` and a running
 * server are all that is needed to open the UI.
 *
 * Layers, each independently testable:
 *
 *   client.ts    WebSocket transport          mirrors the server's scope line
 *   state.ts     the reducer, one source of truth
 *   views.ts     pure (state) => HTML
 *   markdown.ts  safe rendering — a security boundary
 *   i18n.ts      English + Persian, RTL aware
 *   main.ts      the only file with side effects
 *
 * Security note: model output is attacker-controlled from the renderer's
 * perspective. Every interpolation goes through `esc()`; there is no path
 * from model text to a raw tag.
 */
export { createChatClient } from './client.js';
export type { ChatClient, ClientCallbacks, ServerEvent } from './client.js';
export { initial, reduce } from './state.js';
export type { UiState, UiEvent, Message, ToolCall } from './state.js';
export { render } from './views.js';
export { renderMarkdown, esc } from './markdown.js';
export { t, detectLocale, setLocale, isRtl } from './i18n.js';
export type { Locale } from './i18n.js';
