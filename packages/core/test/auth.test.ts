/**
 * Test suite for Phase 10: Security & Auth Providers
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  createJwtProvider,
  createTotpProvider,
  createSecretStoreProvider,
  createRateLimiterProvider,
  createSessionManagerProvider
} from '../src/security/auth-providers.js';

// 1. JWT Provider Tests
test('T-SEC1: JWT sign and verify', async () => {
  const jwt = createJwtProvider('test-secret');
  const token = await jwt.sign({ sub: 'user123', role: 'admin' });
  assert.ok(token);

  const payload = await jwt.verify(token);
  assert.ok(payload);
  assert.strictEqual(payload?.sub, 'user123');
  assert.strictEqual(payload?.role, 'admin');
});

test('T-SEC2: JWT invalid signature returns null', async () => {
  const jwt1 = createJwtProvider('secret-1');
  const jwt2 = createJwtProvider('secret-2');
  const token = await jwt1.sign({ sub: 'user123', role: 'admin' });

  const payload = await jwt2.verify(token);
  assert.strictEqual(payload, null);
});

test('T-SEC3: JWT decode without verification', async () => {
  const jwt = createJwtProvider('secret');
  const token = await jwt.sign({ sub: 'user456', role: 'user' });

  const decoded = jwt.decode(token);
  assert.strictEqual(decoded?.sub, 'user456');
});

// 2. TOTP Provider Tests
test('T-SEC4: TOTP generate secret and URI', () => {
  const totp = createTotpProvider();
  const res = totp.generateSecret('user@example.com', 'MAGoCo');
  assert.ok(res.secret);
  assert.ok(res.uri.includes('otpauth://totp/MAGoCo:user%40example.com'));
});

test('T-SEC5: TOTP invalid token fails validation', () => {
  const totp = createTotpProvider();
  const secret = 'test-secret-key';
  const isValid = totp.verifyToken('000000', secret);
  assert.strictEqual(isValid, false);
});

// 3. Secret Store Tests
test('T-SEC6: Encrypted Secret Store set and get', async () => {
  const store = createSecretStoreProvider('my-master-key');
  await store.set('db_pass', 'super-secret-password');

  const val = await store.get('db_pass');
  assert.strictEqual(val, 'super-secret-password');
});

test('T-SEC7: Encrypted Secret Store list and delete keys', async () => {
  const store = createSecretStoreProvider('my-master-key');
  await store.set('k1', 'v1');
  await store.set('k2', 'v2');

  let keys = await store.listKeys();
  assert.strictEqual(keys.length, 2);

  await store.delete('k1');
  keys = await store.listKeys();
  assert.strictEqual(keys.length, 1);
  assert.strictEqual(keys[0], 'k2');
});

// 4. Rate Limiter Tests
test('T-SEC8: Rate Limiter consumption within limits', async () => {
  const limiter = createRateLimiterProvider(2, 60);
  const res1 = await limiter.consume('user-ip');
  assert.strictEqual(res1.allowed, true);

  const res2 = await limiter.consume('user-ip');
  assert.strictEqual(res2.allowed, true);

  const res3 = await limiter.consume('user-ip');
  assert.strictEqual(res3.allowed, false);
});

test('T-SEC9: Rate Limiter reset key', async () => {
  const limiter = createRateLimiterProvider(1, 60);
  await limiter.consume('key1');
  let res = await limiter.consume('key1');
  assert.strictEqual(res.allowed, false);

  await limiter.reset('key1');
  res = await limiter.consume('key1');
  assert.strictEqual(res.allowed, true);
});

// 5. Session Manager Tests
test('T-SEC10: Session create and get', async () => {
  const sm = createSessionManagerProvider();
  const session = await sm.createSession('user1', { role: 'admin' });
  assert.ok(session.id);

  const fetched = await sm.getSession(session.id);
  assert.strictEqual(fetched?.userId, 'user1');
});

test('T-SEC11: Session revoke and revoke all', async () => {
  const sm = createSessionManagerProvider();
  const s1 = await sm.createSession('u1');
  const s2 = await sm.createSession('u1');
  const s3 = await sm.createSession('u2');

  await sm.revokeSession(s1.id);
  assert.strictEqual(await sm.getSession(s1.id), null);

  await sm.revokeAllUserSessions('u1');
  assert.strictEqual(await sm.getSession(s2.id), null);
  assert.ok(await sm.getSession(s3.id));
});

test('T-SEC12: Session IP allowlist validation', () => {
  const sm = createSessionManagerProvider();
  assert.strictEqual(sm.validateIp('192.168.1.1', ['192.168.1.1', '10.0.0.1']), true);
  assert.strictEqual(sm.validateIp('172.16.0.1', ['192.168.1.1', '10.0.0.1']), false);
  assert.strictEqual(sm.validateIp('172.16.0.1', []), true); // Empty allowlist allows all
});
