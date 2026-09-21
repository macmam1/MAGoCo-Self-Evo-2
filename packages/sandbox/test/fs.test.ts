/**
 * T-S1, T-S3, T-S5..S8, T-S11 — the filesystem capability (spec §6).
 *
 * Everything runs against a real temporary directory: a file written by one
 * call must be readable by another, must be visible to `node` on disk, and
 * must survive an init round-trip. Nothing is stubbed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as nodeFs from 'node:fs/promises';
import * as nodePath from 'node:path';
import { createFs } from '../src/fs.js';
import type { FileSystemCapability } from '../../core/src/capabilities/fs.js';

const REAL_TMP = await nodeFs.realpath('/tmp');

async function newFs(): Promise<FileSystemCapability> {
  const base = await nodeFs.mkdtemp(nodePath.join(REAL_TMP, 'magoco-fs-'));
  return await createFs('s-test', { baseDir: base });
}

async function close(f: FileSystemCapability): Promise<void> {
  await f.close(); // close also removes the session root
}

test('T-S1 init creates a per-session root under the configured base', async () => {
  const fs = await newFs();
  try {
    const st = await nodeFs.stat(fs.root);
    assert.ok(st.isDirectory(), 'root exists on disk');
    assert.match(nodePath.basename(fs.root), /^proj-/);
  } finally {
    await close(fs);
  }
});

test('T-S3 write then read round-trips content', async () => {
  const fs = await newFs();
  try {
    await fs.write('a/b/c.txt', 'hello world');
    const r = await fs.read('a/b/c.txt');
    assert.equal(r.text, 'hello world');
    assert.equal(r.encoding, 'utf-8');
    assert.equal(r.bytes, 11);
    // and it is really on disk, visible to plain node
    const abs = nodePath.join(fs.root, 'a/b/c.txt');
    assert.equal(await nodeFs.readFile(abs, 'utf-8'), 'hello world');
  } finally {
    await close(fs);
  }
});

test('T-S5 listTree returns a recursive tree', async () => {
  const fs = await newFs();
  try {
    await fs.write('pkg/index.js', 'x');
    await fs.write('pkg/sub/deep.ts', 'y');
    await fs.write('README.md', 'z');
    const entries = await fs.listTree('.');
    const files = entries.filter((e) => e.kind === 'file').map((e) => e.path).sort();
    assert.deepEqual(files, ['README.md', 'pkg/index.js', 'pkg/sub/deep.ts']);
    const fileEntry = entries.find((e) => e.path === 'pkg/index.js');
    assert.equal(fileEntry?.kind, 'file');
    assert.equal(fileEntry?.size, 1);
    assert.equal(fileEntry?.name, 'index.js');
  } finally {
    await close(fs);
  }
});

test('T-S6 close removes the session root', async () => {
  const fs = await newFs();
  const root = fs.root;
  await fs.write('a/b/c.txt', 'data');
  await fs.close();
  await assert.rejects(() => nodeFs.stat(root), /ENOENT/);
});

test('T-S7 paths outside the root are refused', async () => {
  const fs = await newFs();
  try {
    await assert.rejects(() => fs.write('../escape.txt', 'x'), /E_PATH_ESCAPE/);
    await assert.rejects(() => fs.write('/etc/evil', 'x'), /E_ABSOLUTE/);
    await assert.rejects(() => fs.read('../escape.txt'), /E_PATH_ESCAPE/);
  } finally {
    await close(fs);
  }
});

test('T-S8 non-UTF-8 bytes are returned as base64, not silently corrupted', async () => {
  const fs = await newFs();
  try {
    const abs = nodePath.join(fs.root, 'bin.dat');
    await nodeFs.writeFile(abs, Buffer.from([0x00, 0xff, 0x80, 0x7f]));
    const r = await fs.read('bin.dat');
    assert.equal(r.encoding, 'base64', 'binary must not be decoded as utf-8');
    assert.equal(r.bytes, 4);
    // overwriting with text must work
    await fs.write('bin.dat', 'now text');
    assert.equal((await fs.read('bin.dat')).text, 'now text');
  } finally {
    await close(fs);
  }
});

test('T-S9 the size budget is enforced before the write', async () => {
  const base = await nodeFs.mkdtemp(nodePath.join(REAL_TMP, 'magoco-fs-'));
  const small = await createFs('s-budget', { baseDir: base, maxRootBytes: 10 });
  try {
    // a 10-byte write under a 10-byte budget must succeed
    await small.write('a.txt', '0123456789', {});
    // ...and a second one must be refused before it touches the disk
    let secondError: Error | null = null;
    try {
      await small.write('b.txt', '0123456789', {});
    } catch (e) {
      secondError = e as Error;
    }
    assert.ok(secondError, 'the second write must fail');
    assert.equal(secondError?.['code' as keyof Error], 'E_TOO_LARGE');
    // the refused write must not have landed
    await assert.rejects(() => small.read('b.txt'), /ENOENT/);
  } finally {
    await small.close();
  }
});

test('T-S10 watch fires on real changes', async () => {
  const fs = await newFs();
  try {
    const events: { kind: string; path: string }[] = [];
    const stop = fs.watch((e) => events.push({ kind: e.kind, path: e.path }));
    await fs.write('watched.txt', 'first');
    // the watcher polls, so give it a couple of ticks
    for (let i = 0; i < 20 && events.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 120));
    }
    stop();
    assert.ok(events.length > 0, 'watcher must see the write');
    assert.ok(events.some((e) => e.path === 'watched.txt'));
  } finally {
    await close(fs);
  }
});

test('T-S12 multi-byte utf8 round-trips', async () => {
  const fs = await newFs();
  try {
    const text = 'emoji ✓ and ümlaut — 中文';
    await fs.write('u.txt', text);
    assert.equal((await fs.read('u.txt')).text, text);
  } finally {
    await close(fs);
  }
});
