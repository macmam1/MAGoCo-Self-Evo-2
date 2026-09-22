/**
 * Browser provider tests — Phase 4.
 *
 * Uses the mock fallback (no Playwright installed in CI).
 * Tests cover the full BrowserProvider contract.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBrowserProvider } from '../src/browser.js';

test('T-B1 getState returns null before launch', async () => {
  const b = createBrowserProvider();
  assert.equal(await b.getState(), null);
});

test('T-B2 launch returns a valid BrowserState', async () => {
  const b = createBrowserProvider();
  const state = await b.launch({ headless: true });
  assert.ok(typeof state.sessionId === 'string' && state.sessionId.length > 0);
  assert.equal(state.url, 'about:blank');
  assert.ok(typeof state.title === 'string');
});

test('T-B3 getState returns state after launch', async () => {
  const b = createBrowserProvider();
  await b.launch({ headless: true });
  const state = await b.getState();
  assert.ok(state !== null);
  assert.ok(typeof state!.sessionId === 'string');
});

test('T-B4 navigate updates url in state', async () => {
  const b = createBrowserProvider();
  await b.launch({ headless: true });
  await b.navigate('https://example.com');
  const state = await b.getState();
  assert.equal(state?.url, 'https://example.com');
});

test('T-B5 screenshot returns a data URI string', async () => {
  const b = createBrowserProvider();
  await b.launch({ headless: true });
  const shot = await b.screenshot();
  assert.ok(typeof shot === 'string' && shot.startsWith('data:'));
});

test('T-B6 mouseMove does not throw', async () => {
  const b = createBrowserProvider();
  await b.launch({ headless: true });
  await assert.doesNotReject(b.mouseMove(100, 200));
});

test('T-B7 click does not throw', async () => {
  const b = createBrowserProvider();
  await b.launch({ headless: true });
  await assert.doesNotReject(b.click(50, 50));
});

test('T-B8 close resets state to null', async () => {
  const b = createBrowserProvider();
  await b.launch({ headless: true });
  await b.close();
  assert.equal(await b.getState(), null);
});

test('T-B9 each provider instance has independent state', async () => {
  const b1 = createBrowserProvider();
  const b2 = createBrowserProvider();
  await b1.launch({ headless: true });
  await b1.navigate('https://a.com');
  await b2.launch({ headless: true });
  await b2.navigate('https://b.com');
  assert.equal((await b1.getState())?.url, 'https://a.com');
  assert.equal((await b2.getState())?.url, 'https://b.com');
});

test('T-B10 navigate without launch does not crash', async () => {
  const b = createBrowserProvider();
  // Mock should create session on navigate even without launch
  await assert.doesNotReject(b.navigate('https://example.com'));
});
