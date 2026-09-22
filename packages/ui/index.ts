/**
 * UI package entry point.
 * Usage: import { renderEditorView, renderExecutionView } from '@magoco/ui';
 */

export { renderEditorView } from './views/editor.js';
export { renderExecutionView, type RunState } from './views/execution.js';
export { renderTerminalView, type TermState } from './views/terminal.js';
