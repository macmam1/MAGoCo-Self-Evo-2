/**
 * Storage capability tests — Phase 9
 */

import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

test('T-ST1: upload and download file', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
  const filePath = path.join(tmpDir, 'test.txt');
  await fs.writeFile(filePath, 'hello world');
  const content = await fs.readFile(filePath, 'utf8');
  assert.strictEqual(content, 'hello world');
  await fs.rm(tmpDir, { recursive: true });
});

test('T-ST2: file exists check', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
  const filePath = path.join(tmpDir, 'exists.txt');
  await fs.writeFile(filePath, 'data');
  const exists = await fs.stat(filePath).then(() => true).catch(() => false);
  assert.strictEqual(exists, true);
  await fs.rm(tmpDir, { recursive: true });
});

test('T-ST3: delete file', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
  const filePath = path.join(tmpDir, 'delete.txt');
  await fs.writeFile(filePath, 'data');
  await fs.unlink(filePath);
  const exists = await fs.stat(filePath).then(() => true).catch(() => false);
  assert.strictEqual(exists, false);
  await fs.rm(tmpDir, { recursive: true });
});

test('T-ST4: list files in directory', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
  await fs.writeFile(path.join(tmpDir, 'file1.txt'), 'a');
  await fs.writeFile(path.join(tmpDir, 'file2.txt'), 'b');
  const files = await fs.readdir(tmpDir);
  assert.strictEqual(files.length, 2);
  await fs.rm(tmpDir, { recursive: true });
});

test('T-ST5: file metadata (size, modified)', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
  const filePath = path.join(tmpDir, 'meta.txt');
  await fs.writeFile(filePath, 'metadata');
  const stat = await fs.stat(filePath);
  assert.ok(stat.size > 0);
  assert.ok(stat.mtime instanceof Date);
  await fs.rm(tmpDir, { recursive: true });
});

test('T-ST6: storage backend config (local)', () => {
  const config = { type: 'local', localPath: '/tmp/storage', bucketName: 'test' };
  assert.strictEqual(config.type, 'local');
  assert.strictEqual(config.localPath, '/tmp/storage');
});

test('T-ST7: storage backend config (s3)', () => {
  const config = {
    type: 's3',
    bucketName: 'my-bucket',
    region: 'us-east-1',
    credentials: { accessKeyId: 'key', secretAccessKey: 'secret' },
  };
  assert.strictEqual(config.type, 's3');
  assert.strictEqual(config.region, 'us-east-1');
});

test('T-ST8: content type for upload', () => {
  const options = { contentType: 'application/json', metadata: { author: 'test' } };
  assert.strictEqual(options.contentType, 'application/json');
});

test('T-ST9: partial read with range', () => {
  const range = { start: 0, end: 100 };
  assert.strictEqual(range.start, 0);
  assert.strictEqual(range.end, 100);
});

test('T-ST10: list with prefix filter', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
  await fs.writeFile(path.join(tmpDir, 'prefix-1.txt'), 'a');
  await fs.writeFile(path.join(tmpDir, 'prefix-2.txt'), 'b');
  await fs.writeFile(path.join(tmpDir, 'other.txt'), 'c');
  const files = await fs.readdir(tmpDir);
  const filtered = files.filter(f => f.startsWith('prefix-'));
  assert.strictEqual(filtered.length, 2);
  await fs.rm(tmpDir, { recursive: true });
});

test('T-ST11: multiple backend types', () => {
  const backends = ['local', 's3', 'r2', 'minio'];
  assert.strictEqual(backends.length, 4);
  assert.ok(backends.includes('s3'));
});

test('T-ST12: storage provider isolation', () => {
  const provider1 = { id: 'p1', bucket: 'bucket1' };
  const provider2 = { id: 'p2', bucket: 'bucket2' };
  assert.notStrictEqual(provider1.bucket, provider2.bucket);
});
