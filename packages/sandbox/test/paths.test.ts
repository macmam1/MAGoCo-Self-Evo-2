/**
 * T-S2 - resolveInRoot: the root-escape guard (spec §6.2).
 *
 * The single security boundary of the filesystem surface: every other
 * operation is only safe because this throws E_PATH_ESCAPE / E_SYMLINK_ESCAPE
 * instead of returning a path outside the root. A bypass here exposes the
 * host, so this file has more tests than the rest of the capability combined.
 *
 * Real temp directories only; no path strings are invented.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as nodeFs from 'node:fs/promises';
import * as nodePath from 'node:path';
import { resolveInRoot } from '../src/paths.js';

const REAL_TMP = await nodeFs.realpath('/tmp');

async function newRoot(): Promise<string> {
  return await nodeFs.mkdtemp(nodePath.join(REAL_TMP, 'magoco-s2-'));
}

async function newOutside(): Promise<string> {
  return await nodeFs.mkdtemp(nodePath.join(REAL_TMP, 'magoco-out-'));
}

test('root itself resolves to the root', async () => {
  const root = await newRoot();
  try {
    assert.equal(await resolveInRoot(root, '.'), root);
    assert.equal(await resolveInRoot(root, '/'), root);
    assert.equal(await resolveInRoot(root, '.'), root);
  } finally {
    await nodeFs.rm(root, { recursive: true, force: true });
  }
});

test('a plain relative path is joined under the root', async () => {
  const root = await newRoot();
  try {
    assert.equal(
      await resolveInRoot(root, 'a/b/c.txt'),
      nodePath.join(root, 'a/b/c.txt'),
    );
  } finally {
    await nodeFs.rm(root, { recursive: true, force: true });
  }
});

test('rejects .. traversal above the root', async () => {
  const root = await newRoot();
  try {
    for (const bad of ['../secret', 'a/../../secret', '..//..//etc/passwd']) {
      await assert.rejects(
        () => resolveInRoot(root, bad),
        /E_PATH_ESCAPE/,
        `expected ${bad} to be rejected`,
      );
    }
  } finally {
    await nodeFs.rm(root, { recursive: true, force: true });
  }
});

test('rejects an absolute path outside the root', async () => {
  const root = await newRoot();
  try {
    await assert.rejects(() => resolveInRoot(root, '/etc/passwd'), /E_ABSOLUTE/);
  } finally {
    await nodeFs.rm(root, { recursive: true, force: true });
  }
});

test('rejects a symlink that points outside the root', async () => {
  const root = await newRoot();
  const outside = await newOutside();
  try {
    await nodeFs.writeFile(nodePath.join(outside, 'secret.txt'), 'host data');
    await nodeFs.symlink(outside, nodePath.join(root, 'link'));
    await assert.rejects(
      () => resolveInRoot(root, 'link/secret.txt'),
      (e: Error) => (e as NodeJS.ErrnoException).code === 'E_SYMLINK_ESCAPE',
    );
  } finally {
    await nodeFs.rm(root, { recursive: true, force: true });
    await nodeFs.rm(outside, { recursive: true, force: true });
  }
});

test('accepts a symlink whose target stays inside the root', async () => {
  const root = await newRoot();
  try {
    await nodeFs.mkdir(nodePath.join(root, 'real'));
    await nodeFs.writeFile(nodePath.join(root, 'real', 'a.txt'), 'ok');
    await nodeFs.symlink('real', nodePath.join(root, 'alias'));
    const p = await resolveInRoot(root, 'alias/a.txt');
    assert.equal(await nodeFs.readFile(p, 'utf-8'), 'ok');
  } finally {
    await nodeFs.rm(root, { recursive: true, force: true });
  }
});

test('rejects a nested symlink chain that escapes', async () => {
  const root = await newRoot();
  const outside = await newOutside();
  try {
    await nodeFs.writeFile(nodePath.join(outside, 'x.txt'), 'host');
    await nodeFs.symlink(outside, nodePath.join(root, 'l1'));
    await nodeFs.symlink(nodePath.join(root, 'l1'), nodePath.join(root, 'l2'));
    await assert.rejects(
      () => resolveInRoot(root, 'l2/x.txt'),
      (e: Error) => (e as NodeJS.ErrnoException).code === 'E_SYMLINK_ESCAPE',
    );
  } finally {
    await nodeFs.rm(root, { recursive: true, force: true });
    await nodeFs.rm(outside, { recursive: true, force: true });
  }
});

test('a deep path under a fresh directory resolves (write target)', async () => {
  const root = await newRoot();
  try {
    const p = await resolveInRoot(root, 'src/pkg/deep/file.ts');
    assert.equal(p, nodePath.join(root, 'src/pkg/deep/file.ts'));
    // nothing exists yet, but the resolution must not fail
    await nodeFs.mkdir(nodePath.dirname(p), { recursive: true });
    await nodeFs.writeFile(p, 'x');
    assert.equal(await nodeFs.readFile(p, 'utf-8'), 'x');
  } finally {
    await nodeFs.rm(root, { recursive: true, force: true });
  }
});
