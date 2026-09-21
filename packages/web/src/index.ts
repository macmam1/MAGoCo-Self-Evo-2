/**
 * @magoco/web — the public surface.
 *
 * The CLI resolves `magoco.web.serve` and calls it; nothing else in the repo
 * imports the internals directly. That keeps packages/web replaceable
 * (spec §1.5 mechanism 1).
 *
 * The web plugin entrypoint is intentionally NOT exported here: it lives at
 * `packages/web/plugin.ts` (a `plugin.yaml` sibling) and is discovered by the
 * PluginLoader at boot, never imported by hand. Exporting it from the package
 * root would let core reach straight back across the layer boundary the
 * plugin seam exists to enforce.
 */
export { serve, type ServeOptions, type ServeHandle } from './http.js';
export { createSession, type ChatSession } from './session.js';
export type {
  ClientCommand,
  ClientFrame,
  SessionSummary,
  ModelView,
  UsageView,
  ToolCallView,
  ToolOutcomeView,
  SessionRole,
} from './protocol.js';
export { isClientCommand, PROTOCOL_VERSION } from './protocol.js';
