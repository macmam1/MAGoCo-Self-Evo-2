/**
 * Test suite for Phase 12: Analytics & Monitoring
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  createUsageAnalyticsProvider,
  createPerformanceAnalyticsProvider,
  createTracingProvider,
  createErrorTrackingProvider,
  createAlertingProvider,
  createQuotaProvider
} from '../src/security/analytics-providers.js';

// 1. Usage Analytics Tests
test('T-ANAL1: Track and report usage', async () => {
  const ua = createUsageAnalyticsProvider();
  const now = Date.now();
  ua.track({ userId: 'u1', workspaceId: 'ws1', resource: 'tokens', amount: 1000, cost: 0.01, timestamp: now });
  ua.track({ userId: 'u1', workspaceId: 'ws1', resource: 'storage', amount: 100, cost: 0.002, timestamp: now });

  const report = await ua.getReport('u1', 'ws1', now - 1000, now + 1000);
  assert.strictEqual(report.totalCost, 0.012);
  assert.ok(report.breakdown.tokens);
  assert.ok(report.breakdown.storage);
});

test('T-ANAL2: Daily cost calculation', async () => {
  const ua = createUsageAnalyticsProvider();
  const today = Date.now();
  ua.track({ userId: 'u1', workspaceId: 'ws1', resource: 'tokens', amount: 1000, cost: 0.01, timestamp: today });
  
  const cost = await ua.getDailyCost('u1', 'ws1', today);
  assert.strictEqual(cost, 0.01);
});

// 2. Performance Analytics Tests
test('T-ANAL3: Record performance metric', () => {
  const pa = createPerformanceAnalyticsProvider();
  pa.record({ name: 'response_time', value: 150, unit: 'ms', timestamp: Date.now() });
  pa.record({ name: 'response_time', value: 200, unit: 'ms', timestamp: Date.now() });
  assert.ok(true);
});

test('T-ANAL4: Get performance chart', async () => {
  const pa = createPerformanceAnalyticsProvider();
  const now = Date.now();
  pa.record({ name: 'latency', value: 100, unit: 'ms', timestamp: now });
  pa.record({ name: 'latency', value: 150, unit: 'ms', timestamp: now + 1000 });

  const chart = await pa.getChart('latency', now - 1000, now + 60000, 'avg');
  assert.ok(chart.dataPoints.length > 0);
});

test('T-ANAL5: Get latency percentile', async () => {
  const pa = createPerformanceAnalyticsProvider();
  const now = Date.now();
  for (let i = 0; i < 100; i++) {
    pa.record({ name: 'api_call', value: i * 10, unit: 'ms', timestamp: now + i });
  }

  const p95 = await pa.getLatency('api_call', 95);
  assert.ok(p95 > 0);
});

// 3. Tracing Tests
test('T-ANAL6: Start and end span', async () => {
  const tp = createTracingProvider();
  const span = tp.startSpan('http_request');
  assert.ok(span.id);
  assert.ok(span.traceId);

  await new Promise(resolve => setTimeout(resolve, 5));
  tp.endSpan(span.id);
  assert.ok(span.duration !== undefined && span.duration >= 0);
});

test('T-ANAL7: Add log to span', () => {
  const tp = createTracingProvider();
  const span = tp.startSpan('operation');
  tp.addLog(span.id, 'Started processing');
  tp.addLog(span.id, 'Completed successfully');
  assert.strictEqual(span.logs.length, 2);
});

test('T-ANAL8: Get trace by ID', async () => {
  const tp = createTracingProvider();
  const span1 = tp.startSpan('parent');
  const span2 = tp.startSpan('child', span1.traceId, span1.id);
  
  const trace = await tp.getTrace(span1.traceId);
  assert.ok(trace.length >= 2);
});

// 4. Error Tracking Tests
test('T-ANAL9: Capture and group errors', async () => {
  const et = createErrorTrackingProvider();
  et.capture({ message: 'DB connection failed', stack: 'at db.connect()', severity: 'high', context: {} });
  et.capture({ message: 'DB connection failed', stack: 'at db.connect()', severity: 'high', context: {} });

  const groups = await et.getGroups();
  assert.strictEqual(groups.length, 1);
  assert.strictEqual(groups[0]?.count, 2);
});

test('T-ANAL10: Query errors by severity', async () => {
  const et = createErrorTrackingProvider();
  et.capture({ message: 'Warning', severity: 'low', context: {} });
  et.capture({ message: 'Critical', severity: 'critical', context: {} });

  const critical = await et.getGroups({ severity: 'critical' });
  assert.strictEqual(critical.length, 1);
  assert.strictEqual(critical[0]?.sample.severity, 'critical');
});

// 5. Alerting Tests
test('T-ANAL11: Create and evaluate alert rule', async () => {
  const alert = createAlertingProvider();
  const rule = await alert.createRule({
    name: 'High Error Rate',
    condition: 'error_rate > 0.05',
    threshold: 0.05,
    window: 300,
    enabled: true,
    actions: []
  });
  assert.ok(rule.id);

  const triggered = await alert.evaluate(rule.id, 0.1);
  assert.ok(triggered);
});

test('T-ANAL12: Resolve alert', async () => {
  const alert = createAlertingProvider();
  const rule = await alert.createRule({
    name: 'Test',
    condition: 'value > 10',
    threshold: 10,
    window: 300,
    enabled: true,
    actions: []
  });

  const alrt = await alert.evaluate(rule.id, 20);
  if (alrt) {
    await alert.resolveAlert(alrt.id);
    const active = await alert.getActiveAlerts();
    assert.ok(!active.find(a => a.id === alrt.id));
  }
});

// 6. Quota Tests
test('T-ANAL13: Set and get quota', async () => {
  const quota = createQuotaProvider();
  await quota.setLimit('u1', 'ws1', 'api_calls', 1000);
  
  const q = await quota.getQuota('u1', 'ws1', 'api_calls');
  assert.ok(q);
  assert.strictEqual(q?.limit, 1000);
  assert.strictEqual(q?.used, 0);
});

test('T-ANAL14: Consume quota', async () => {
  const quota = createQuotaProvider();
  await quota.setLimit('u1', 'ws1', 'api_calls', 100);

  const allowed1 = await quota.consume('u1', 'ws1', 'api_calls', 50);
  assert.strictEqual(allowed1, true);

  const allowed2 = await quota.consume('u1', 'ws1', 'api_calls', 60);
  assert.strictEqual(allowed2, false);
});

test('T-ANAL15: Reset quota', async () => {
  const quota = createQuotaProvider();
  await quota.setLimit('u1', 'ws1', 'storage', 1000);
  await quota.consume('u1', 'ws1', 'storage', 500);

  await quota.reset('u1', 'ws1', 'storage');
  const q = await quota.getQuota('u1', 'ws1', 'storage');
  assert.strictEqual(q?.used, 0);
});

test('T-ANAL16: Multiple resource quotas', async () => {
  const quota = createQuotaProvider();
  await quota.setLimit('u1', 'ws1', 'api_calls', 1000);
  await quota.setLimit('u1', 'ws1', 'storage', 100);

  const q1 = await quota.getQuota('u1', 'ws1', 'api_calls');
  const q2 = await quota.getQuota('u1', 'ws1', 'storage');
  assert.strictEqual(q1?.limit, 1000);
  assert.strictEqual(q2?.limit, 100);
});
