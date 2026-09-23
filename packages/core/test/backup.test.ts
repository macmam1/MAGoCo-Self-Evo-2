/**
 * Test suite for Phase 14: Backup & Migration
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { createBackupProvider } from '../src/security/backup-providers.js';

test('T-BKP1: Export data returns buffer', async () => {
  const bp = createBackupProvider();
  const data = await bp.export('json');
  assert.ok(data instanceof Buffer);
  assert.ok(data.length > 0);
});

test('T-BKP2: Import restored data', async () => {
  const bp = createBackupProvider();
  const exported = await bp.export('json');
  const result = await bp.import(exported);
  assert.strictEqual(result.success, true);
  assert.ok(result.restoredCount >= 0);
});

test('T-BKP3: Overwrite flag prevents duplicate import', async () => {
  const bp = createBackupProvider();
  const exported = await bp.export('json');
  await bp.import(exported);
  const result = await bp.import(exported);
  assert.strictEqual(result.success, false);
});

test('T-BKP4: Overwrite allows duplicate import', async () => {
  const bp = createBackupProvider();
  const exported = await bp.export('json');
  await bp.import(exported);
  const result = await bp.import(exported, true);
  assert.strictEqual(result.success, true);
});

test('T-BKP5: Migration exists', () => {
  const bp = createBackupProvider();
  const migrations = bp.getMigrations();
  assert.ok(migrations.length > 0);
  assert.strictEqual(migrations[0]?.fromVersion, '0.1.0');
});

test('T-BKP6: Migrate step runs', async () => {
  const bp = createBackupProvider();
  const result = await bp.migrate('0.1.0', '0.2.0');
  assert.strictEqual(result, true);
});

test('T-BKP7: Invalid migration returns false', async () => {
  const bp = createBackupProvider();
  const result = await bp.migrate('0.1.0', '9.9.9');
  assert.strictEqual(result, false);
});

test('T-BKP8: Invalid import fails', async () => {
  const bp = createBackupProvider();
  const result = await bp.import(Buffer.from('not valid json'));
  assert.strictEqual(result.success, false);
});
