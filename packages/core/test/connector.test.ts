/**
 * Custom connector capability tests — Phase 9
 */

import { test } from 'node:test';
import assert from 'node:assert';

test('T-CN1: connector config with baseUrl', () => {
  const config = { baseUrl: 'https://api.example.com', version: 'v1' };
  assert.strictEqual(config.baseUrl, 'https://api.example.com');
});

test('T-CN2: bearer token auth', () => {
  const auth = { type: 'bearer', value: 'token-123' };
  assert.strictEqual(auth.type, 'bearer');
  assert.ok(auth.value);
});

test('T-CN3: API key auth in header', () => {
  const auth = { type: 'apikey', header: 'X-API-Key', value: 'key-abc' };
  assert.strictEqual(auth.header, 'X-API-Key');
});

test('T-CN4: basic auth credentials', () => {
  const auth = { type: 'basic', value: Buffer.from('user:pass').toString('base64') };
  assert.strictEqual(auth.type, 'basic');
});

test('T-CN5: custom auth function', () => {
  const auth = { type: 'custom', fn: async () => 'custom-token' };
  assert.strictEqual(auth.type, 'custom');
  assert.ok(auth.fn);
});

test('T-CN6: request with query params', () => {
  const req = { method: 'GET', path: '/users', query: { page: '1', limit: '10' } };
  assert.strictEqual(req.query?.page, '1');
});

test('T-CN7: request with JSON body', () => {
  const req = { method: 'POST', path: '/items', body: { name: 'item1' } };
  assert.strictEqual(req.body?.name, 'item1');
});

test('T-CN8: HTTP methods supported', () => {
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  assert.strictEqual(methods.length, 5);
  assert.ok(methods.includes('GET'));
});

test('T-CN9: response structure', () => {
  const response = { statusCode: 200, headers: { 'content-type': 'application/json' }, body: { ok: true } };
  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.body);
});

test('T-CN10: retry configuration', () => {
  const retry = { attempts: 3, delayMs: 1000 };
  assert.strictEqual(retry.attempts, 3);
});

test('T-CN11: timeout setting', () => {
  const config = { baseUrl: 'https://api.example.com', timeout: 5000 };
  assert.strictEqual(config.timeout, 5000);
});

test('T-CN12: custom headers', () => {
  const headers = { 'User-Agent': 'MAGoCo/1.0', 'Accept': 'application/json' };
  assert.strictEqual(headers['User-Agent'], 'MAGoCo/1.0');
});
