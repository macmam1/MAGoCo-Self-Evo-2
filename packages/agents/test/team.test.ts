import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decomposeTask, executeDecomposed, createRuleBasedDecomposer } from '../src/team.js';
import type { SubTask } from '../src/team.js';

test('T-TM1 decomposeTask always includes pm and qa', async () => {
  const task = await decomposeTask('build login', 'add user auth');
  const roles = task.subtasks.map(s => s.assignedRole);
  assert.ok(roles.includes('pm'));
  assert.ok(roles.includes('qa'));
});

test('T-TM2 architecture keyword adds architect subtask', async () => {
  const task = await decomposeTask('design system', 'design database schema');
  assert.ok(task.subtasks.some(s => s.assignedRole === 'architect'));
});

test('T-TM3 no architecture keyword skips architect', async () => {
  const task = await decomposeTask('fix typo', 'fix a typo in README');
  assert.ok(!task.subtasks.some(s => s.assignedRole === 'architect'));
});

test('T-TM4 coder depends on architect when present', async () => {
  const task = await decomposeTask('build api', 'design api schema');
  const arch = task.subtasks.find(s => s.assignedRole === 'architect')!;
  const coder = task.subtasks.find(s => s.assignedRole === 'coder')!;
  assert.ok(coder.dependencies.includes(arch.id));
});

test('T-TM5 qa depends on coder', async () => {
  const task = await decomposeTask('build login', 'login form');
  const coder = task.subtasks.find(s => s.assignedRole === 'coder')!;
  const qa = task.subtasks.find(s => s.assignedRole === 'qa')!;
  assert.ok(qa.dependencies.includes(coder.id));
});

test('T-TM6 all subtasks start as pending', async () => {
  const task = await decomposeTask('build', 'something');
  assert.ok(task.subtasks.every(s => s.status === 'pending'));
});

test('T-TM7 executeDecomposed runs all subtasks', async () => {
  const task = await decomposeTask('build', 'something');
  await executeDecomposed(task, async () => 'done');
  assert.ok(task.subtasks.every(s => s.status === 'done'));
});

test('T-TM8 executor receives previous results', async () => {
  const task = await decomposeTask('build', 'something');
  const seen: number[] = [];
  await executeDecomposed(task, async (_s, results) => {
    seen.push(results.size);
    return 'x';
  });
  // First subtask sees 0, subsequent see more
  assert.ok(seen[0] === 0);
  assert.ok(seen[seen.length - 1]! > 0);
});

test('T-TM9 failed subtask marks status failed', async () => {
  const task = await decomposeTask('fix typo', 'small fix');
  const pm = task.subtasks.find(s => s.assignedRole === 'pm')!;
  await executeDecomposed(task, async (s) => {
    if (s.id === pm.id) throw new Error('pm error');
    return 'ok';
  });
  assert.equal(pm.status, 'failed');
});

test('T-TM10 task has id and createdAt', async () => {
  const task = await decomposeTask('x', 'y');
  assert.ok(typeof task.id === 'string' && task.id.length > 0);
  assert.ok(typeof task.createdAt === 'number');
});

test('T-TM11 custom decomposer is used', async () => {
  const custom = {
    async decompose(): Promise<SubTask[]> {
      return [{
        id: 'x1', title: 'Custom', description: '',
        assignedRole: 'coder', dependencies: [], status: 'pending',
      }];
    },
  };
  const task = await decomposeTask('anything', 'desc', custom);
  assert.equal(task.subtasks.length, 1);
  assert.equal(task.subtasks[0]!.assignedRole, 'coder');
});

test('T-TM12 executeDecomposed parallel-safe with no deps', async () => {
  const task = await decomposeTask('parallel', 'run stuff');
  // Make all deps empty for testing
  for (const s of task.subtasks) s.dependencies = [];
  const order: string[] = [];
  await executeDecomposed(task, async (s) => { order.push(s.assignedRole); return 'ok'; });
  assert.equal(order.length, task.subtasks.length);
});
