/**
 * BrowserSessionManager tests — Phase 4.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBrowserSessionManager } from '../src/browser-session-manager.js';

test('T-SM1 list returns empty initially', () => {
  const sm = createBrowserSessionManager();
  assert.deepEqual(sm.list(), []);
});

test('T-SM2 create returns a session with correct name', async () => {
  const sm = createBrowserSessionManager();
  const s = await sm.create('main');
  assert.equal(s.name, 'main');
  assert.ok(s.state !== null);
  assert.ok(typeof s.createdAt === 'number');
  await sm.destroyAll();
});

test('T-SM3 list includes created session name', async () => {
  const sm = createBrowserSessionManager();
  await sm.create('a');
  assert.deepEqual(sm.list(), ['a']);
  await sm.destroyAll();
});

test('T-SM4 get returns existing session', async () => {
  const sm = createBrowserSessionManager();
  await sm.create('s1');
  const s = sm.get('s1');
  assert.ok(s !== null);
  assert.equal(s!.name, 's1');
  await sm.destroyAll();
});

test('T-SM5 get returns null for unknown session', () => {
  const sm = createBrowserSessionManager();
  assert.equal(sm.get('nope'), null);
});

test('T-SM6 create throws on duplicate name', async () => {
  const sm = createBrowserSessionManager();
  await sm.create('dup');
  await assert.rejects(sm.create('dup'), /already exists/);
  await sm.destroyAll();
});

test('T-SM7 destroy removes session from list', async () => {
  const sm = createBrowserSessionManager();
  await sm.create('x');
  await sm.destroy('x');
  assert.deepEqual(sm.list(), []);
});

test('T-SM8 destroy on unknown name is a no-op', async () => {
  const sm = createBrowserSessionManager();
  await assert.doesNotReject(sm.destroy('ghost'));
});

test('T-SM9 multiple sessions are independent', async () => {
  const sm = createBrowserSessionManager();
  await sm.create('p1');
  await sm.create('p2');
  await sm.get('p1')!.provider.navigate('https://one.com');
  await sm.get('p2')!.provider.navigate('https://two.com');
  assert.equal((await sm.get('p1')!.provider.getState())?.url, 'https://one.com');
  assert.equal((await sm.get('p2')!.provider.getState())?.url, 'https://two.com');
  await sm.destroyAll();
});

test('T-SM10 destroyAll clears all sessions', async () => {
  const sm = createBrowserSessionManager();
  await sm.create('a');
  await sm.create('b');
  await sm.create('c');
  await sm.destroyAll();
  assert.deepEqual(sm.list(), []);
});

test('T-SM11 refresh returns updated state', async () => {
  const sm = createBrowserSessionManager();
  await sm.create('r1');
  await sm.get('r1')!.provider.navigate('https://refreshed.com');
  const state = await sm.refresh('r1');
  assert.equal(state?.url, 'https://refreshed.com');
  await sm.destroyAll();
});

test('T-SM12 refresh on unknown session returns null', async () => {
  const sm = createBrowserSessionManager();
  assert.equal(await sm.refresh('missing'), null);
});
