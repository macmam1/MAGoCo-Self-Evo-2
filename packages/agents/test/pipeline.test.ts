/**
 * Pipeline tests — Phase 6.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createRole, runPipeline, DEFAULT_ROLES,
  type TaskSpec, type RoleExecutor, type PipelineArtifact,
} from '../src/pipeline.js';

const task: TaskSpec = {
  id: 't1', title: 'Build login', description: 'Add user login',
  acceptanceCriteria: ['user can log in', 'invalid creds rejected'],
};

const mockExecutor: RoleExecutor = async (role) => `output from ${role.kind}`;

test('T-PL1 createRole returns role with correct kind and id', () => {
  const r = createRole('pm');
  assert.equal(r.kind, 'pm');
  assert.ok(typeof r.id === 'string' && r.id.length > 0);
  assert.ok(typeof r.systemPrompt === 'string' && r.systemPrompt.length > 0);
});

test('T-PL2 createRole accepts overrides', () => {
  const r = createRole('coder', { name: 'Custom Coder' });
  assert.equal(r.name, 'Custom Coder');
  assert.equal(r.kind, 'coder');
});

test('T-PL3 DEFAULT_ROLES has all four kinds', () => {
  assert.ok('pm' in DEFAULT_ROLES);
  assert.ok('architect' in DEFAULT_ROLES);
  assert.ok('coder' in DEFAULT_ROLES);
  assert.ok('qa' in DEFAULT_ROLES);
});

test('T-PL4 runPipeline completes with status done', async () => {
  const run = await runPipeline(task, mockExecutor);
  assert.equal(run.status, 'done');
  assert.ok(typeof run.finishedAt === 'number');
});

test('T-PL5 runPipeline produces 4 artifacts in order', async () => {
  const run = await runPipeline(task, mockExecutor);
  assert.equal(run.artifacts.length, 4);
  assert.deepEqual(run.artifacts.map(a => a.role), ['pm', 'architect', 'coder', 'qa']);
});

test('T-PL6 each artifact has output and createdAt', async () => {
  const run = await runPipeline(task, mockExecutor);
  for (const a of run.artifacts) {
    assert.ok(typeof a.output === 'string' && a.output.length > 0);
    assert.ok(typeof a.createdAt === 'number');
  }
});

test('T-PL7 executor receives previous artifacts', async () => {
  const seen: number[] = [];
  const exec: RoleExecutor = async (_role, _task, prev) => {
    seen.push(prev.length);
    return 'ok';
  };
  await runPipeline(task, exec);
  assert.deepEqual(seen, [0, 1, 2, 3]);
});

test('T-PL8 failed role stops pipeline with status failed', async () => {
  const exec: RoleExecutor = async (role) => {
    if (role.kind === 'architect') throw new Error('arch failed');
    return 'ok';
  };
  const run = await runPipeline(task, exec);
  assert.equal(run.status, 'failed');
  assert.match(run.error ?? '', /arch failed/);
  assert.equal(run.artifacts.length, 1); // only PM ran
});

test('T-PL9 run has id, taskId, and timing', async () => {
  const run = await runPipeline(task, mockExecutor);
  assert.ok(typeof run.id === 'string' && run.id.length > 0);
  assert.equal(run.taskId, task.id);
  assert.ok(run.finishedAt! >= run.startedAt);
});

test('T-PL10 custom roles override defaults', async () => {
  const customPm = createRole('pm', { name: 'Custom PM', systemPrompt: 'custom' });
  const usedNames: string[] = [];
  const exec: RoleExecutor = async (role) => { usedNames.push(role.name); return 'ok'; };
  await runPipeline(task, exec, { pm: customPm });
  assert.equal(usedNames[0], 'Custom PM');
});

test('T-PL11 multiple pipeline runs are independent', async () => {
  const [r1, r2] = await Promise.all([
    runPipeline({ ...task, id: 'ta' }, mockExecutor),
    runPipeline({ ...task, id: 'tb' }, mockExecutor),
  ]);
  assert.equal(r1.taskId, 'ta');
  assert.equal(r2.taskId, 'tb');
  assert.notEqual(r1.id, r2.id);
});
