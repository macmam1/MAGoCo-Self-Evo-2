/**
 * On-disk entrypoint the PluginLoader discovers (sibling of plugin.yaml).
 *
 * The real registration lives in ../src/plugin.ts so the binding stays a
 * source file of the @magoco/web package, typechecked by its own project.
 * This file only re-exports — a plugin is loaded by *path*, never by package
 * name, so no dependency edge is created in either direction.
 */
export { register } from '../../src/plugin.js';
export { default } from '../../src/plugin.js';
