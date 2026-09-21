/**
 * T-S13 — plugin registration (spec §6.5).
 *
 * The contract between packages/sandbox and the runtime: register must expose
 * `forSession`/`closeSession` through the registry, a second call for the same
 * session must hand back the *same* root (a reconnecting client must not get a
 * fresh empty tree), and sessions must be isolated from each other.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as nodeFs from 'node:fs/promises';
import * as nodePath from 'node:path';
import { register } from '../src/plugin.js';
import { FS_CAPABILITY } from '../../core/src/index.js';
import type { FileSystemCapability } from '../../core/src/capabilities/fs.js';

const REAL_TMP = await nodeFs.realpath('/tmp');
const base = await nodeFs.mkdtemp(nodePath.join(REAL_TMP, 'magoco-plugin-'));

const emitted: { capability: string; type: string }[] = [];
let provided: unknown = null;

await register({
  registry: {
    registerDef: () => {},
    provide: (_cap: string, _name: string, impl: unknown) => {
      provided = impl;
    },
  },
  config: { [FS_CAPABILITY]: { baseDir: base } },
  emit: (capability: string, type: string) => {
    emitted.push({ capability, type });
  },
} as never);

const impl = provided as {
  forSession(id: string): Promise<FileSystemCapability>;
  closeSession(id: string): Promise<void>;
};

test('register exposes forSession through the registry', () => {
  assert.equal(typeof impl?.forSession, 'function');
  assert.equal(typeof impl?.closeSession, 'function');
});

test('a second call for the same session returns the same root', async () => {
  const fs1 = await impl.forSession('s-dup');
  const fs2 = await impl.forSession('s-dup');
  assert.equal(fs2.root, fs1.root, 'reconnect must not create a new tree');
});

test('two different sessions are isolated', async () => {
  const mine = await impl.forSession('s-mine');
  const yours = await impl.forSession('s-yours');
  assert.notEqual(mine.root, yours.root);
  await mine.write('mine.txt', 'a', {});
  await yours.write('yours.txt', 'b', {});
  const mineTree = await mine.listTree('.');
  const yourTree = await yours.listTree('.');
  assert.ok(mineTree.some((e) => e.path === 'mine.txt'));
  assert.ok(!mineTree.some((e) => e.path === 'yours.txt'));
  assert.ok(yourTree.some((e) => e.path === 'yours.txt'));
  await impl.closeSession('s-yours');
});

test('the root is on disk and writable from plain node', async () => {
  const fs = await impl.forSession('s-disk');
  await fs.write('a.txt', 'content', {});
  assert.equal(
    await nodeFs.readFile(nodePath.join(fs.root, 'a.txt'), 'utf-8'),
    'content',
  );
});

test('the plugin emits root.created and root.closed', async () => {
  assert.ok(
    emitted.some((e) => e.capability === FS_CAPABILITY && e.type === 'root.created'),
  );
  await impl.forSession('s-events');
  await impl.closeSession('s-events');
  assert.ok(
    emitted.some((e) => e.capability === FS_CAPABILITY && e.type === 'root.closed'),
  );
});

test('closeSession is idempotent', async () => {
  await impl.forSession('s-idem');
  await impl.closeSession('s-idem');
  await impl.closeSession('s-idem'); // must not throw
});

test('teardown', async () => {
  for (const id of ['s-dup', 's-mine', 's-disk']) {
    await impl.closeSession(id);
  }
});
