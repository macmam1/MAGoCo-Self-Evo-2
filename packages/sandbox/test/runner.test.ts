/**
 * T-S1, T-S3, T-S4, T-S5, T-S11 (spec §8) — real processes, real temp dir.
 * A mocked child_process cannot fail on the bug that matters.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

import { runCode, sandboxEnv } from '../src/runner.js';
import { DEFAULT_RUN_LIMITS } from '../../core/src/index.js';

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'magoco-s3-'));
  await writeFile(path.join(root, 'hello.py'), "print('hi from python')\n");
  await writeFile(path.join(root, 'hello.mjs'), "console.log('hi from js')\n");
  return root;
}

async function drain(s: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const c of s) out.push(c);
  return out;
}

// ---- T-S1: env sanitisation — the single most important property ----
test('T-S1 leaks no parent secret into the child', () => {
  const env = sandboxEnv('/tmp/r');
  assert.equal(env.MS_TOKEN, undefined);
  assert.equal(env.MODELSCOPE_TOKEN_MAGOCO, undefined);
  assert.equal(env.GITHUB_TOKEN, undefined);
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.NODE_OPTIONS, undefined);
  assert.equal(env.PYTHONSTARTUP, undefined);
  assert.equal(env.HOME, '/tmp/r');
});
test('T-S1 exposes only the whitelist', () => {
  const env = sandboxEnv('/tmp/r');
  assert.deepEqual(Object.keys(env).sort(), ['HOME', 'LANG', 'LC_ALL', 'PATH']);
});

// ---- T-S5: both languages run, streams in order ----
test('T-S5 runs js and streams stdout', async () => {
  const root = await newRoot();
  try {
    const h = runCode(root, { path: 'hello.mjs', language: 'js' }, DEFAULT_RUN_LIMITS);
    const chunks = await drain(h.stdout);
    const info = await h.done;
    assert.equal(info.code, 0);
    assert.match(chunks.join(''), /hi from js/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('T-S5 js runs from a fresh root (no stale dir)', async () => {
  const root = await newRoot();
  try {
    const h = runCode(root, { source: "console.log('inline ok')", language: 'js' }, DEFAULT_RUN_LIMITS);
    const chunks = await drain(h.stdout);
    assert.match(chunks.join(''), /inline ok/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('T-S5 runs py and reports a non-zero exit code on failure', async () => {
  const root = await newRoot();
  try {
    const h = runCode(root, { source: 'raise SystemExit(3)', language: 'py' }, DEFAULT_RUN_LIMITS);
    const info = await h.done;
    assert.equal(info.code, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('T-S5 delivers stderr separately from stdout', async () => {
  const root = await newRoot();
  try {
    const h = runCode(
      root,
      { source: "import sys; sys.stderr.write('boom\\n'); sys.stdout.write('ok\\n')", language: 'py' },
      DEFAULT_RUN_LIMITS,
    );
    const err = await drain(h.stderr);
    const out = await drain(h.stdout);
    assert.match(err.join(''), /boom/);
    assert.match(out.join(''), /ok/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---- T-S4: the timeout is a hard wall ----
test('T-S4 kills a spin loop and reports killed: true', async () => {
  const root = await newRoot();
  try {
    const h = runCode(
      root,
      { source: 'while True: pass', language: 'py' },
      { ...DEFAULT_RUN_LIMITS, timeoutMs: 1500 },
    );
    const info = await h.done;
    assert.equal(info.killed, true, 'must report killed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('T-S4 leaves no orphan process behind', async () => {
  const root = await newRoot();
  try {
    const h = runCode(
      root,
      {
        source: [
          'import os, time',
          'if os.fork() == 0:',
          '    time.sleep(30)',
          'print("parent done")',
        ].join('\n'),
        language: 'py',
      },
      { ...DEFAULT_RUN_LIMITS, timeoutMs: 1000 },
    );
    await h.done;
    // The group SIGKILL plus the kernel process limit must mean nothing of
    // this run survives on the host.
    const leftover = execSync('ps -eo pid,args | grep -c "sleep 30" || true').toString().trim();
    assert.equal(leftover, '0', `orphan left behind: ${leftover}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---- T-S3: resource limits ----
test('T-S3 RLIMIT_AS stops a memory hog', async () => {
  const root = await newRoot();
  try {
    const h = runCode(
      root,
      { source: 'x = bytearray(10**9)\nprint("should not reach")', language: 'py' },
      { ...DEFAULT_RUN_LIMITS, memoryMB: 64, timeoutMs: 8000 },
    );
    const info = await h.done;
    assert.notEqual(info.code, 0);
    const out = await drain(h.stdout);
    assert.equal(/should not reach/.test(out.join('')), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('T-S3 RLIMIT_NPROC contains a fork bomb', async () => {
  const root = await newRoot();
  try {
    const h = runCode(
      root,
      { source: ['import os', 'while True:', '    try: os.fork()', 'except: pass'].join('\n'), language: 'py' },
      { ...DEFAULT_RUN_LIMITS, maxProcesses: 8, timeoutMs: 4000 },
    );
    const info = await h.done;
    assert.notEqual(info.code, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---- T-S11: streaming is real, not buffer-then-emit ----
test('T-S11 streams many lines as separate chunks', async () => {
  const root = await newRoot();
  try {
    const h = runCode(root, { source: 'for i in range(50): print(i)', language: 'py' }, DEFAULT_RUN_LIMITS);
    let n = 0;
    for await (const _c of h.stdout) n += 1;
    assert.ok(n > 20, `expected many chunks, got ${n}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
