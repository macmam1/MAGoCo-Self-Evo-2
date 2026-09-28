/**
 * Workflow Persistence Layer
 * Save/load workflows to/from local file system
 */
import { WorkflowDef, WorkflowRun } from './types.js';

const WORKFLOW_DIR = '.magoco/workflows';

export async function saveWorkflow(workflow: WorkflowDef): Promise<void> {
  try {
    // In browser, use localStorage; in Node, use fs
    const key = `workflow_${workflow.id}`;
    localStorage.setItem(key, JSON.stringify(workflow));
  } catch (err) {
    console.error('Failed to save workflow:', err);
  }
}

export function loadWorkflow(id: string): WorkflowDef | null {
  try {
    const key = `workflow_${id}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function listWorkflows(): WorkflowDef[] {
  try {
    const workflows: WorkflowDef[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('workflow_')) {
        const data = localStorage.getItem(key);
        if (data) workflows.push(JSON.parse(data));
      }
    }
    return workflows;
  } catch {
    return [];
  }
}

export function deleteWorkflow(id: string): void {
  try {
    const key = `workflow_${id}`;
    localStorage.removeItem(key);
  } catch {}
}

export async function saveRun(run: WorkflowRun): Promise<void> {
  try {
    const key = `run_${run.runId}_${Date.now()}`;
    localStorage.setItem(key, JSON.stringify(run));
  } catch {}
}

export function loadRun(runId: string): WorkflowRun | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`run_${runId}_`)) {
        const data = localStorage.getItem(key);
        if (data) return JSON.parse(data);
      }
    }
    return null;
  } catch {
    return null;
  }
}
