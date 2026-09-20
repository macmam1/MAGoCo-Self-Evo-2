import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { SessionLog } from '../src/session/log.js';

async function tmp(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'magoco-'));
}

test('append then read round-trips in order', async () => {
  const dir = await tmp();
  const log = new SessionLog('s1', dir);
  await log.append({ seq: 1, ts: 1, capability: 'a', type: 'one', payload: { n: 1 } });
  await log.append({ seq: 2, ts: 2, capability: 'a', type: 'two', payload: { n: 2 } });

  const read = [];
  for await (const e of log.read()) read.push(e);
  assert.deepEqual(
    read.map((e) => [e.seq, e.type]),
    [
      [1, 'one'],
      [2, 'two'],
    ],
  );
  await fs.rm(dir, { recursive: true });
});

test('concurrent appends stay ordered', async () => {
  const dir = await tmp();
  const log = new SessionLog('s2', dir);
  for (let i = 0; i < 50; i++) {
    void log.append({ seq: i, ts: i, capability: 'a', type: `t${i}`, payload: null });
  }
  await log.append({ seq: 999, ts: 999, capability: 'a', type: 'final', payload: null });

  const read = [];
  for await (const e of log.read()) read.push(e.type);
  assert.equal(read.length, 51);
  assert.equal(read[50], 'final');
  await fs.rm(dir, { recursive: true });
});
