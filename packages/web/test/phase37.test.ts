/**
 * Phase 3.7 provider tests — viewport, human-assist, skill-capture,
 * action-preview, proxy.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createViewportProvider } from '../src/viewport-provider.js';
import { createHumanAssistProvider } from '../src/human-assist-provider.js';
import { createSkillCaptureProvider } from '../src/skill-capture-provider.js';
import { createActionPreviewProvider } from '../src/action-preview-provider.js';
import { createProxyProvider } from '../src/proxy-provider.js';

// ── Viewport ────────────────────────────────────────────────────────────────

test('T-V1 snapshot is null before any event', () => {
  const vp = createViewportProvider();
  assert.equal(vp.snapshot(), null);
});

test('T-V2 snapshot reflects latest event', () => {
  const vp = createViewportProvider();
  vp.onEvent({ type: 'scroll', scrollY: 200 });
  assert.deepEqual(vp.snapshot(), { type: 'scroll', scrollY: 200 });
  vp.onEvent({ type: 'mousemove', x: 10, y: 20 });
  assert.deepEqual(vp.snapshot(), { type: 'mousemove', x: 10, y: 20 });
});

test('T-V3 subscribers receive events and can unsubscribe', () => {
  const vp = createViewportProvider();
  const received: string[] = [];
  const unsub = vp.subscribe(e => received.push(e.type));
  vp.onEvent({ type: 'scroll', scrollY: 0 });
  unsub();
  vp.onEvent({ type: 'mousemove', x: 1, y: 1 });
  assert.deepEqual(received, ['scroll']);
});

test('T-V4 multiple subscribers each get the event', () => {
  const vp = createViewportProvider();
  let a = 0, b = 0;
  vp.subscribe(() => a++);
  vp.subscribe(() => b++);
  vp.onEvent({ type: 'scroll', scrollY: 50 });
  assert.equal(a, 1);
  assert.equal(b, 1);
});

// ── Human Assist ─────────────────────────────────────────────────────────────

test('T-H1 pending() is null initially', () => {
  const h = createHumanAssistProvider();
  assert.equal(h.pending(), null);
});

test('T-H2 onTask suspends and resolves on approved result', async () => {
  const h = createHumanAssistProvider();
  const task = { id: 't1', type: 'approval' as const, prompt: 'ok?', timeout: 5 };
  const p = h.onTask(task);
  assert.deepEqual(h.pending(), task);
  h.onResult({ task_id: 't1', status: 'approved' });
  await p; // must not throw
  assert.equal(h.pending(), null);
});

test('T-H3 onTask rejects on denied result', async () => {
  const h = createHumanAssistProvider();
  const task = { id: 't2', type: 'approval' as const, prompt: 'ok?', timeout: 5 };
  const p = h.onTask(task);
  h.onResult({ task_id: 't2', status: 'denied' });
  await assert.rejects(p, /denied/);
});

test('T-H4 onTask rejects on timeout', async () => {
  const h = createHumanAssistProvider();
  const task = { id: 't3', type: 'captcha' as const, prompt: 'solve', timeout: 0 };
  await assert.rejects(h.onTask(task), /timed out/);
});

test('T-H5 stale onResult for unknown task is ignored', () => {
  const h = createHumanAssistProvider();
  assert.doesNotThrow(() => h.onResult({ task_id: 'unknown', status: 'approved' }));
});

// ── Skill Capture ─────────────────────────────────────────────────────────────

test('T-SC1 record returns an id and find retrieves it', async () => {
  const sc = createSkillCaptureProvider();
  const seq = [{ action: 'click', selector: '#btn', payload: {} }];
  const id = await sc.record('login to site', seq);
  assert.ok(typeof id === 'string' && id.length > 0);
  const found = await sc.find('login');
  assert.equal(found.length, 1);
  assert.equal(found[0].id, id);
  assert.deepEqual(found[0].sequence, seq);
});

test('T-SC2 find returns empty array when no match', async () => {
  const sc = createSkillCaptureProvider();
  await sc.record('fill checkout form', []);
  const found = await sc.find('zzz-no-match');
  assert.equal(found.length, 0);
});

test('T-SC3 execute increments usageCount', async () => {
  const sc = createSkillCaptureProvider();
  const id = await sc.record('click submit', [{ action: 'click', selector: '#s', payload: {} }]);
  await sc.execute(id);
  const found = await sc.find('click submit');
  assert.equal(found[0].usageCount, 1);
});

test('T-SC4 execute throws for unknown skill', async () => {
  const sc = createSkillCaptureProvider();
  await assert.rejects(sc.execute('not-a-real-id'), /not found/);
});

// ── Action Preview ────────────────────────────────────────────────────────────

test('T-AP1 requestApproval resolves when approved', async () => {
  const frames: object[] = [];
  const ap = createActionPreviewProvider(f => frames.push(f));
  const req = { id: 'a1', action: { type: 'click' as const, description: 'Click submit' } };
  const p = ap.requestApproval(req);
  assert.equal((frames[0] as any).t, 'action/preview');
  ap.onResponse({ id: 'a1', approved: true });
  await p;
});

test('T-AP2 requestApproval rejects when denied', async () => {
  const ap = createActionPreviewProvider(() => {});
  const p = ap.requestApproval({
    id: 'a2', action: { type: 'delete' as const, description: 'Delete file' }
  });
  ap.onResponse({ id: 'a2', approved: false, correction: 'too risky' });
  await assert.rejects(p, /too risky/);
});

test('T-AP3 requestApproval rejects on timeout', async () => {
  const ap = createActionPreviewProvider(() => {});
  await assert.rejects(
    ap.requestApproval({ id: 'a3', action: { type: 'click' as const, description: 'x' }, timeout: 1 }),
    /timed out/
  );
});

test('T-AP4 stale onResponse is ignored', () => {
  const ap = createActionPreviewProvider(() => {});
  assert.doesNotThrow(() => ap.onResponse({ id: 'unknown', approved: true }));
});

// ── Proxy ─────────────────────────────────────────────────────────────────────

test('T-P1 getProxy returns null initially', async () => {
  const p = createProxyProvider();
  assert.equal(await p.getProxy(), null);
});

test('T-P2 setProxy and getProxy round-trip', async () => {
  const p = createProxyProvider();
  const cfg = { host: '127.0.0.1', port: 8080, protocol: 'http' as const };
  await p.setProxy(cfg);
  assert.deepEqual(await p.getProxy(), cfg);
});

test('T-P3 clearProxy resets to null', async () => {
  const p = createProxyProvider();
  await p.setProxy({ host: '1.2.3.4', port: 1080, protocol: 'socks5' as const });
  await p.clearProxy();
  assert.equal(await p.getProxy(), null);
});

test('T-P4 setIdentity and getIdentity round-trip', async () => {
  const p = createProxyProvider();
  const id = { userAgent: 'Mozilla/5.0', locale: 'en-US', timezone: 'UTC' };
  await p.setIdentity(id);
  assert.deepEqual(await p.getIdentity(), id);
});

test('T-P5 clearIdentity resets to null', async () => {
  const p = createProxyProvider();
  await p.setIdentity({ userAgent: 'test' });
  await p.clearIdentity();
  assert.equal(await p.getIdentity(), null);
});

test('T-P6 proxy and identity are independent', async () => {
  const p = createProxyProvider();
  await p.setProxy({ host: 'x', port: 9, protocol: 'http' as const });
  await p.clearIdentity();
  assert.notEqual(await p.getProxy(), null);
  assert.equal(await p.getIdentity(), null);
});
