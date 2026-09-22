/**
 * Agent Team — Phase 6.
 *
 * Defines the four roles in the auto-generation pipeline:
 * PM → Architect → Coder → QA
 *
 * Each role is a typed AgentRole with a system prompt and capability set.
 * The TeamRunner orchestrates the pipeline, passing outputs between roles.
 */

import { randomUUID } from 'node:crypto';

export type RoleKind = 'pm' | 'architect' | 'coder' | 'qa';

export interface AgentRole {
  id: string;
  kind: RoleKind;
  name: string;
  systemPrompt: string;
}

export interface TaskSpec {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
}

export interface PipelineArtifact {
  role: RoleKind;
  output: string;
  createdAt: number;
}

export interface PipelineRun {
  id: string;
  taskId: string;
  startedAt: number;
  finishedAt?: number;
  status: 'running' | 'done' | 'failed';
  artifacts: PipelineArtifact[];
  error?: string;
}

/** Called per role to produce the role's output (pluggable — mock or real LLM). */
export type RoleExecutor = (
  role: AgentRole,
  task: TaskSpec,
  previousArtifacts: PipelineArtifact[],
) => Promise<string>;

export const DEFAULT_ROLES: Record<RoleKind, Omit<AgentRole, 'id'>> = {
  pm: {
    kind: 'pm',
    name: 'Product Manager',
    systemPrompt:
      'You are a Product Manager. Given a task description, produce a clear specification: ' +
      'goals, user stories, acceptance criteria, and out-of-scope items.',
  },
  architect: {
    kind: 'architect',
    name: 'Architect',
    systemPrompt:
      'You are a Software Architect. Given the PM spec, produce a technical design: ' +
      'components, interfaces, data flow, and technology choices.',
  },
  coder: {
    kind: 'coder',
    name: 'Coder',
    systemPrompt:
      'You are a Senior Developer. Given the architecture, produce working code ' +
      'with inline comments. Output file paths and their contents.',
  },
  qa: {
    kind: 'qa',
    name: 'QA Engineer',
    systemPrompt:
      'You are a QA Engineer. Given the code and spec, produce a test plan and ' +
      'test cases. Identify edge cases and potential regressions.',
  },
};

/** Build a fresh AgentRole with a new id. */
export function createRole(kind: RoleKind, overrides: Partial<Omit<AgentRole, 'id' | 'kind'>> = {}): AgentRole {
  const base = DEFAULT_ROLES[kind];
  return { id: randomUUID(), ...base, ...overrides };
}

/**
 * Run the full PM→Arch→Coder→QA pipeline for a task.
 */
export async function runPipeline(
  task: TaskSpec,
  executor: RoleExecutor,
  roles?: Partial<Record<RoleKind, AgentRole>>,
): Promise<PipelineRun> {
  const run: PipelineRun = {
    id: randomUUID(),
    taskId: task.id,
    startedAt: Date.now(),
    status: 'running',
    artifacts: [],
  };

  const pipeline: RoleKind[] = ['pm', 'architect', 'coder', 'qa'];

  for (const kind of pipeline) {
    const role = roles?.[kind] ?? createRole(kind);
    try {
      const output = await executor(role, task, [...run.artifacts]);
      run.artifacts.push({ role: kind, output, createdAt: Date.now() });
    } catch (err) {
      run.status = 'failed';
      run.error = `${role.name} failed: ${String(err)}`;
      run.finishedAt = Date.now();
      return run;
    }
  }

  run.status = 'done';
  run.finishedAt = Date.now();
  return run;
}
