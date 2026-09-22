/**
 * Browser provider tests — Phase 4 (computer-use).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBrowserProvider } from '../src/browser.js';

// ── Basic lifecycle ───────────────────────────────────────────────────────────

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
  await assert.doesNotReject(b.navigate('https://example.com'));
});

// ── Computer-use actions ──────────────────────────────────────────────────────

test('T-B11 type does not throw', async () => {
  const b = createBrowserProvider();
  await b.launch({ headless: true });
  await assert.doesNotReject(b.type('hello world'));
});

test('T-B12 press does not throw', async () => {
  const b = createBrowserProvider();
  await b.launch({ headless: true });
  await assert.doesNotReject(b.press('Enter'));
});

test('T-B13 scroll does not throw', async () => {
  const b = createBrowserProvider();
  await b.launch({ headless: true });
  await assert.doesNotReject(b.scroll(0, 0, 0, 300));
});

test('T-B14 drag does not throw', async () => {
  const b = createBrowserProvider();
  await b.launch({ headless: true });
  await assert.doesNotReject(b.drag(10, 10, 100, 100));
});

// ── Content extraction ────────────────────────────────────────────────────────

test('T-B15 extractContent returns ExtractedContent shape', async () => {
  const b = createBrowserProvider();
  await b.launch({ headless: true });
  await b.navigate('https://example.com');
  const content = await b.extractContent();
  assert.ok(typeof content.text === 'string');
  assert.ok(typeof content.html === 'string');
  assert.ok(Array.isArray(content.links));
  assert.ok(typeof content.title === 'string');
});

test('T-B16 extractContent before navigate returns mock content', async () => {
  const b = createBrowserProvider();
  await b.launch({ headless: true });
  const content = await b.extractContent();
  assert.ok(typeof content.text === 'string');
  assert.ok(content.html.includes('<html>') || content.html.includes('<body>'));
});

test('T-B17 type and press without launch do not crash', async () => {
  const b = createBrowserProvider();
  // mock has no page, so these are no-ops
  await assert.doesNotReject(b.type('test'));
  await assert.doesNotReject(b.press('Tab'));
});
