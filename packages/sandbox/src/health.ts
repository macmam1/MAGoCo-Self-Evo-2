/**
 * Health provider implementation.
 */

import type { HealthProvider, HealthStatus } from '../../core/src/capabilities/health.js';

export function createHealthProvider(): HealthProvider {
  const startTime = Date.now();
  const version = '0.0.1';

  return {
    getStatus(): HealthStatus {
      const now = Date.now();
      const uptime = Math.floor((now - startTime) / 1000);

      return {
        status: 'healthy',
        uptime,
        version,
        timestamp: now,
      };
    },
  };
}
