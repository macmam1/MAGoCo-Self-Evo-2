/**
 * @magoco/web — the public surface.
 *
 * The CLI resolves `magoco.web.serve` and calls it; nothing else in the repo
 * imports the internals directly. That keeps packages/web replaceable
 * (spec §1.5 mechanism 1).
 */
export { serve, type ServeOptions, type ServeHandle } from './http.js';
export { createSession } from './session.js';
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
export { name as pluginName, register as registerPlugin } from './plugin.js';
