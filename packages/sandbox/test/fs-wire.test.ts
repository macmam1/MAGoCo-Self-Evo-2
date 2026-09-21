/**
 * T-S4 — the wire bridge (spec §6.4).
 *
 * Each frame on the socket becomes a capability call and back. The point of
 * this suite is the failure vocabulary: a missing file and a traversal refusal
 * must arrive as *distinguishable* codes, because the UI renders them
 * differently and the AI agent reacts to them differently.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as nodeFs from 'node:fs/promises';
import * as nodePath from 'node:path';
import { createFs } from '../src/fs.js';
import { handleFsCommand } from '../src/fs-wire.js';
import type { FsCommand, FsFrame } from '../src/fs-protocol.js';
import type { FileSystemCapability } from '../../core/src/capabilities/fs.js';

const REAL_TMP = await nodeFs.realpath('/tmp');
const base = await nodeFs.mkdtemp(nodePath.join(REAL_TMP, 'magoco-wire-'));
const fs: FileSystemCapability = await createFs('s-wire', { baseDir: base });
const sent: FsFrame[] = [];

function send(f: FsFrame): void {
  sent.push(f);
}

function run(cmd: FsCommand): Promise<FsFrame[]> {
  sent.length = 0;
  handleFsCommand(fs, cmd, send);
  return new Promise((resolve) => {
    // the handlers are async internally; flush on next tick
    setTimeout(() => resolve([...sent]), 60);
  });
}

test('fs_init replies with the root', async () => {
  const replies = await run({ t: 'fs_init' });
  assert.equal(replies.length, 1);
  assert.equal(replies[0].t, 'fs_ready');
  assert.equal(replies[0].root, fs.root);
});

test('fs_write then fs_read round-trips over the wire', async () => {
  await run({ t: 'fs_write', path: 'a.txt', content: 'hello' });
  const replies = await run({ t: 'fs_read', path: 'a.txt' });
  assert.equal(replies[0].t, 'fs_content');
  assert.equal(replies[0].text, 'hello');
});

test('fs_list_tree returns entries', async () => {
  await run({ t: 'fs_write', path: 'pkg/main.js', content: 'x' });
  const replies = await run({ t: 'fs_list_tree', path: '.' });
  const frame = replies[0];
  assert.equal(frame.t, 'fs_entries');
  const names = frame.entries.map((e) => e.path).sort();
  assert.ok(names.includes('pkg/main.js'));
});

test('a missing file arrives as E_NOT_FOUND, not a broken frame', async () => {
  const replies = await run({ t: 'fs_read', path: 'nope.txt' });
  assert.equal(replies[0].t, 'fs_error');
  assert.equal(replies[0].code, 'E_NOT_FOUND');
});

test('a traversal attempt arrives as E_PATH_ESCAPE', async () => {
  const replies = await run({ t: 'fs_read', path: '../../etc/passwd' });
  assert.equal(replies[0].t, 'fs_error');
  assert.equal(replies[0].code, 'E_PATH_ESCAPE');
});

test('fs_delete removes a file and the next read is E_NOT_FOUND', async () => {
  await run({ t: 'fs_write', path: 'gone.txt', content: 'x' });
  await run({ t: 'fs_remove', path: 'gone.txt' });
  const replies = await run({ t: 'fs_read', path: 'gone.txt' });
  assert.equal(replies[0].code, 'E_NOT_FOUND');
});

test('an unknown frame type is answered, never dropped', async () => {
  const replies = await run({ t: 'fs_bogus' } as unknown as FsCommand);
  assert.equal(replies[0].t, 'fs_error');
  assert.equal(replies[0].code, 'E_BAD_FRAME');
});

test('the whole surface is still byte-identical on disk', async () => {
  await run({ t: 'fs_write', path: 'real.txt', content: 'disk check' });
  const abs = nodePath.join(fs.root, 'real.txt');
  assert.equal(await nodeFs.readFile(abs, 'utf-8'), 'disk check');
});

// teardown
test('teardown', async () => {
  await fs.close();
});
