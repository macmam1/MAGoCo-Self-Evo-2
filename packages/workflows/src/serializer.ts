/**
 * Workflow serialization — Phase 5.
 * import/export as JSON + version tagging.
 */

import type { WorkflowDef } from './types.js';

export interface WorkflowExport {
  version: 1;
  exportedAt: number;
  workflow: WorkflowDef;
}

export function exportWorkflow(def: WorkflowDef): string {
  const payload: WorkflowExport = { version: 1, exportedAt: Date.now(), workflow: def };
  return JSON.stringify(payload, null, 2);
}

export function importWorkflow(json: string): WorkflowDef {
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch {
    throw new Error('invalid JSON');
  }
  const p = parsed as any;
  if (p?.version !== 1) throw new Error('unsupported workflow version');
  if (!p?.workflow?.id || !Array.isArray(p?.workflow?.nodes)) {
    throw new Error('invalid workflow structure');
  }
  return p.workflow as WorkflowDef;
}
