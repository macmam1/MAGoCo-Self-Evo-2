/**
 * Public surface of @magoco/sandbox.
 *
 * Only what other packages may import. The plugin entry (`plugin/sandbox/`)
 * and the WS routes (`routes.ts`) are separate; they are loaded by the runtime
 * plugin loader and by packages/web respectively, never imported directly.
 */
export { createFs, fsRootExists } from './fs.js';
export type { FsConfig } from './fs.js';
export { resolveInRoot, relativeTo, isInside, classifyPath } from './paths.js';
export type { FsPathProblem } from './paths.js';
export { watch } from './watcher.js';
export type { WatchKind } from './watcher.js';
