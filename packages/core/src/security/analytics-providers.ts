/**
 * In-memory providers for Phase 12: Analytics & Monitoring
 */

import * as crypto from 'node:crypto';
import type {
  UsageMetric,
  UsageReport,
  UsageAnalyticsProvider,
  PerformanceMetric,
  PerformanceChart,
  PerformanceAnalyticsProvider,
  Span,
  TracingProvider,
  ErrorEvent,
  ErrorGroup,
  ErrorTrackingProvider,
  AlertRule,
  Alert,
  AlertingProvider,
  Quota,
  QuotaProvider
} from '../capabilities/analytics.js';

// 1. Usage Analytics Provider
export function createUsageAnalyticsProvider(): UsageAnalyticsProvider {
  const metrics: UsageMetric[] = [];

  return {
    track(metric: UsageMetric): void {
      metrics.push(metric);
    },

    async getReport(userId: string, workspaceId: string, start: number, end: number): Promise<UsageReport> {
      const filtered = metrics.filter(m =>
        m.userId === userId &&
        m.workspaceId === workspaceId &&
        m.timestamp >= start &&
        m.timestamp <= end
      );

      const breakdown: Record<string, { amount: number; cost: number }> = {};
      let totalCost = 0;

      for (const m of filtered) {
        if (!breakdown[m.resource]) {
          breakdown[m.resource] = { amount: 0, cost: 0 };
        }
        breakdown[m.resource]!.amount += m.amount;
        breakdown[m.resource]!.cost += m.cost;
        totalCost += m.cost;
      }

      return {
        userId,
        workspaceId,
        period: { start, end },
        breakdown,
        totalCost
      };
    },

    async getDailyCost(userId: string, workspaceId: string, date: number): Promise<number> {
      const dayStart = new Date(date).setHours(0, 0, 0, 0);
      const dayEnd = new Date(date).setHours(23, 59, 59, 999);
      const report = await this.getReport(userId, workspaceId, dayStart, dayEnd);
      return report.totalCost;
    }
  };
}

// 2. Performance Analytics Provider
export function createPerformanceAnalyticsProvider(): PerformanceAnalyticsProvider {
  const metrics: PerformanceMetric[] = [];

  return {
    record(metric: PerformanceMetric): void {
      metrics.push(metric);
    },

    async getChart(metricName: string, start: number, end: number, aggregation: PerformanceChart['aggregation']): Promise<PerformanceChart> {
      const filtered = metrics.filter(m =>
        m.name === metricName &&
        m.timestamp >= start &&
        m.timestamp <= end
      );

      const buckets = new Map<number, number[]>();
      const bucketSize = 60000; // 1 minute

      for (const m of filtered) {
        const bucket = Math.floor(m.timestamp / bucketSize) * bucketSize;
        if (!buckets.has(bucket)) buckets.set(bucket, []);
        buckets.get(bucket)!.push(m.value);
      }

      const dataPoints = Array.from(buckets.entries()).map(([timestamp, values]) => {
        let value = 0;
        if (aggregation === 'avg') value = values.reduce((a, b) => a + b, 0) / values.length;
        else if (aggregation === 'sum') value = values.reduce((a, b) => a + b, 0);
        else if (aggregation === 'min') value = Math.min(...values);
        else if (aggregation === 'max') value = Math.max(...values);
        else if (aggregation === 'p95') value = values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)] ?? 0;
        else if (aggregation === 'p99') value = values.sort((a, b) => a - b)[Math.floor(values.length * 0.99)] ?? 0;
        return { timestamp, value };
      }).sort((a, b) => a.timestamp - b.timestamp);

      return { metric: metricName, dataPoints, aggregation };
    },

    async getLatency(operation: string, percentile: number): Promise<number> {
      const filtered = metrics.filter(m => m.name === operation && m.unit === 'ms');
      if (filtered.length === 0) return 0;
      const sorted = filtered.map(m => m.value).sort((a, b) => a - b);
      const index = Math.floor(sorted.length * (percentile / 100));
      return sorted[index] ?? 0;
    }
  };
}

// 3. Tracing Provider
export function createTracingProvider(): TracingProvider {
  const spans = new Map<string, Span>();

  return {
    startSpan(name: string, traceId?: string, parentSpanId?: string): Span {
      const id = crypto.randomUUID();
      const span: Span = {
        id,
        traceId: traceId ?? crypto.randomUUID(),
        name,
        startTime: Date.now(),
        tags: {},
        logs: [],
        ...(parentSpanId ? { parentSpanId } : {})
      };
      spans.set(id, span);
      return span;
    },

    endSpan(spanId: string): void {
      const span = spans.get(spanId);
      if (span) {
        span.endTime = Date.now();
        span.duration = span.endTime - span.startTime;
      }
    },

    addLog(spanId: string, message: string): void {
      const span = spans.get(spanId);
      if (span) {
        span.logs.push({ timestamp: Date.now(), message });
      }
    },

    async getTrace(traceId: string): Promise<Span[]> {
      return Array.from(spans.values()).filter(s => s.traceId === traceId);
    }
  };
}

// 4. Error Tracking Provider
export function createErrorTrackingProvider(): ErrorTrackingProvider {
  const events = new Map<string, ErrorEvent>();
  const groups = new Map<string, ErrorGroup>();

  function generateFingerprint(message: string, stack?: string): string {
    const input = message + (stack?.split('\n')[0] ?? '');
    return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
  }

  return {
    capture(error: Omit<ErrorEvent, 'id' | 'timestamp' | 'fingerprint'>): void {
      const id = crypto.randomUUID();
      const timestamp = Date.now();
      const fingerprint = generateFingerprint(error.message, error.stack);
      const event: ErrorEvent = { ...error, id, timestamp, fingerprint };
      events.set(id, event);

      if (!groups.has(fingerprint)) {
        groups.set(fingerprint, {
          fingerprint,
          count: 0,
          firstSeen: timestamp,
          lastSeen: timestamp,
          sample: event
        });
      }
      const group = groups.get(fingerprint)!;
      group.count++;
      group.lastSeen = timestamp;
    },

    async getGroups(filters?: { severity?: string; start?: number; end?: number }): Promise<ErrorGroup[]> {
      let result = Array.from(groups.values());
      if (filters?.severity) result = result.filter(g => g.sample.severity === filters.severity);
      if (filters?.start !== undefined) result = result.filter(g => g.lastSeen >= filters.start!);
      if (filters?.end !== undefined) result = result.filter(g => g.firstSeen <= filters.end!);
      return result;
    },

    async getEventById(id: string): Promise<ErrorEvent | null> {
      return events.get(id) ?? null;
    }
  };
}

// 5. Alerting Provider
export function createAlertingProvider(): AlertingProvider {
  const rules = new Map<string, AlertRule>();
  const alerts = new Map<string, Alert>();

  return {
    async createRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule> {
      const id = crypto.randomUUID();
      const fullRule: AlertRule = { ...rule, id };
      rules.set(id, fullRule);
      return fullRule;
    },

    async evaluate(ruleId: string, value: number): Promise<Alert | null> {
      const rule = rules.get(ruleId);
      if (!rule || !rule.enabled) return null;

      if (value > rule.threshold) {
        const id = crypto.randomUUID();
        const alert: Alert = {
          id,
          ruleId,
          triggeredAt: Date.now(),
          value,
          message: `${rule.name}: value ${value} exceeded threshold ${rule.threshold}`,
          resolved: false
        };
        alerts.set(id, alert);
        return alert;
      }
      return null;
    },

    async getActiveAlerts(): Promise<Alert[]> {
      return Array.from(alerts.values()).filter(a => !a.resolved);
    },

    async resolveAlert(alertId: string): Promise<void> {
      const alert = alerts.get(alertId);
      if (alert) alert.resolved = true;
    }
  };
}

// 6. Quota Provider
export function createQuotaProvider(): QuotaProvider {
  const quotas = new Map<string, Quota>();

  function getKey(userId: string, workspaceId: string, resource: string): string {
    return `${userId}:${workspaceId}:${resource}`;
  }

  return {
    async getQuota(userId: string, workspaceId: string, resource: string): Promise<Quota | null> {
      return quotas.get(getKey(userId, workspaceId, resource)) ?? null;
    },

    async consume(userId: string, workspaceId: string, resource: string, amount: number): Promise<boolean> {
      const key = getKey(userId, workspaceId, resource);
      const quota = quotas.get(key);
      if (!quota) return false;
      if (quota.used + amount > quota.limit) return false;
      quota.used += amount;
      return true;
    },

    async reset(userId: string, workspaceId: string, resource: string): Promise<void> {
      const key = getKey(userId, workspaceId, resource);
      const quota = quotas.get(key);
      if (quota) {
        quota.used = 0;
        quota.resetAt = Date.now() + 86400000; // 24 hours
      }
    },

    async setLimit(userId: string, workspaceId: string, resource: string, limit: number): Promise<void> {
      const key = getKey(userId, workspaceId, resource);
      const existing = quotas.get(key);
      if (existing) {
        existing.limit = limit;
      } else {
        quotas.set(key, {
          userId,
          workspaceId,
          resource,
          limit,
          used: 0,
          resetAt: Date.now() + 86400000
        });
      }
    }
  };
}
