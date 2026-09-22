/**
 * Health & Monitoring capability — `magoco.health` (Phase 4).
 */

import type { CapabilityDef, CapabilityContext } from './types.js';

export const HEALTH_CAPABILITY = 'magoco.health' as const;

export interface HealthStatus {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly uptime: number; // seconds
  readonly version: string;
  readonly timestamp: number;
}

export interface HealthProvider {
  getStatus(): HealthStatus;
}

export const healthDef: CapabilityDef = {
  id: HEALTH_CAPABILITY,
  name: 'Health Monitor',
  description: 'Application health status and monitoring',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${HEALTH_CAPABILITY} not registered`);
  },
};
