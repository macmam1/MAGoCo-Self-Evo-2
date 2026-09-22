/**
 * Edit provider tests (PR #46).
 */

import { test, describe, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createEditProvider } from '../src/edit.js';

const TMP = join(process.cwd(), 'test-edit-tmp');

function setup() {
  try { rmSync(TMP, { recursive: true }); } catch {}
}

function teardown() {
  try { rmSync(TMP, { recursive: true }); } catch {}
}

function resolve(p: string): string {
  return join(TMP, p);
}

describe('edit', () => {
  before(() => setup());
  after(() => teardown());

  test('single file', async () => {
    const provider = createEditProvider();
    const result = await provider.edit({ files: [{ path: resolve('a.txt'), content: 'hello' }] });
    assert.equal(result.results[0].success, true);
    assert.equal(readFileSync(resolve('a.txt'), 'utf-8'), 'hello');
  });

  test('multiple files', async () => {
    const provider = createEditProvider();
    const result = await provider.edit({
      files: [
        { path: resolve('a.txt'), content: 'a' },
        { path: resolve('b.txt'), content: 'b' },
      ],
    });
    assert.equal(result.results.length, 2);
    assert.equal(result.results[0].success, true);
    assert.equal(result.results[1].success, true);
  });

  test('nested dir', async () => {
    const provider = createEditProvider();
    const result = await provider.edit({ files: [{ path: resolve('sub/c.txt'), content: 'c' }] });
    assert.equal(result.results[0].success, true);
    assert.equal(readFileSync(resolve('sub/c.txt'), 'utf-8'), 'c');
  });
});
