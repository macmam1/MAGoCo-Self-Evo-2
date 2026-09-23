/**
 * Analytics & Monitoring capability definitions — Phase 12
 *
 * Capabilities:
 * - magoco.analytics.usage (usage tracking and cost calculation)
 * - magoco.analytics.performance (performance metrics and charts)
 * - magoco.analytics.tracing (distributed tracing)
 * - magoco.analytics.errors (error tracking and aggregation)
 * - magoco.analytics.alerts (alerting system)
 * - magoco.analytics.quotas (rate limits and quotas)
 */

import type { CapabilityDef } from './types.js';

export const USAGE_ANALYTICS_CAPABILITY = 'magoco.analytics.usage' as const;
export const PERFORMANCE_ANALYTICS_CAPABILITY = 'magoco.analytics.performance' as const;
export const TRACING_CAPABILITY = 'magoco.analytics.tracing' as const;
export const ERROR_TRACKING_CAPABILITY = 'magoco.analytics.errors' as const;
export const ALERTING_CAPABILITY = 'magoco.analytics.alerts' as const;
export const QUOTA_CAPABILITY = 'magoco.analytics.quotas' as const;

// 1. Usage Analytics
export interface UsageMetric {
  userId: string;
  workspaceId: string;
  resource: 'tokens' | 'storage' | 'compute' | 'api_calls';
  amount: number;
  cost: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface UsageReport {
  userId: string;
  workspaceId: string;
  period: { start: number; end: number };
  breakdown: Record<string, { amount: number; cost: number }>;
  totalCost: number;
}

export interface UsageAnalyticsProvider {
  track(metric: UsageMetric): void;
  getReport(userId: string, workspaceId: string, start: number, end: number): Promise<UsageReport>;
  getDailyCost(userId: string, workspaceId: string, date: number): Promise<number>;
}

// 2. Performance Analytics
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: number;
  tags?: Record<string, string>;
}

export interface PerformanceChart {
  metric: string;
  dataPoints: Array<{ timestamp: number; value: number }>;
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'p95' | 'p99';
}

export interface PerformanceAnalyticsProvider {
  record(metric: PerformanceMetric): void;
  getChart(metricName: string, start: number, end: number, aggregation: PerformanceChart['aggregation']): Promise<PerformanceChart>;
  getLatency(operation: string, percentile: number): Promise<number>;
}

// 3. Distributed Tracing
export interface Span {
  id: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, string>;
  logs: Array<{ timestamp: number; message: string }>;
}

export interface TracingProvider {
  startSpan(name: string, traceId?: string, parentSpanId?: string): Span;
  endSpan(spanId: string): void;
  addLog(spanId: string, message: string): void;
  getTrace(traceId: string): Promise<Span[]>;
}

// 4. Error Tracking
export interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  userId?: string;
  context: Record<string, unknown>;
  fingerprint: string;
}

export interface ErrorGroup {
  fingerprint: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  sample: ErrorEvent;
}

export interface ErrorTrackingProvider {
  capture(error: Omit<ErrorEvent, 'id' | 'timestamp' | 'fingerprint'>): void;
  getGroups(filters?: { severity?: string; start?: number; end?: number }): Promise<ErrorGroup[]>;
  getEventById(id: string): Promise<ErrorEvent | null>;
}

// 5. Alerting
export interface AlertRule {
  id: string;
  name: string;
  condition: string; // e.g., "error_rate > 0.05"
  threshold: number;
  window: number; // time window in seconds
  enabled: boolean;
  actions: Array<{ type: 'email' | 'webhook' | 'slack'; config: Record<string, string> }>;
}

export interface Alert {
  id: string;
  ruleId: string;
  triggeredAt: number;
  value: number;
  message: string;
  resolved: boolean;
}

export interface AlertingProvider {
  createRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule>;
  evaluate(ruleId: string, value: number): Promise<Alert | null>;
  getActiveAlerts(): Promise<Alert[]>;
  resolveAlert(alertId: string): Promise<void>;
}

// 6. Quotas
export interface Quota {
  userId: string;
  workspaceId: string;
  resource: string;
  limit: number;
  used: number;
  resetAt: number;
}

export interface QuotaProvider {
  getQuota(userId: string, workspaceId: string, resource: string): Promise<Quota | null>;
  consume(userId: string, workspaceId: string, resource: string, amount: number): Promise<boolean>;
  reset(userId: string, workspaceId: string, resource: string): Promise<void>;
  setLimit(userId: string, workspaceId: string, resource: string, limit: number): Promise<void>;
}

// Capability Definitions
export const usageAnalyticsDef: CapabilityDef = {
  id: USAGE_ANALYTICS_CAPABILITY,
  name: 'Usage Analytics',
  description: 'Track usage and calculate costs',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const performanceAnalyticsDef: CapabilityDef = {
  id: PERFORMANCE_ANALYTICS_CAPABILITY,
  name: 'Performance Analytics',
  description: 'Performance metrics and charts',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const tracingDef: CapabilityDef = {
  id: TRACING_CAPABILITY,
  name: 'Distributed Tracing',
  description: 'Trace requests across services',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const errorTrackingDef: CapabilityDef = {
  id: ERROR_TRACKING_CAPABILITY,
  name: 'Error Tracking',
  description: 'Capture and aggregate errors',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const alertingDef: CapabilityDef = {
  id: ALERTING_CAPABILITY,
  name: 'Alerting',
  description: 'Rule-based alerting system',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const quotaDef: CapabilityDef = {
  id: QUOTA_CAPABILITY,
  name: 'Quota Management',
  description: 'Resource quotas and limits',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};