/**
 * Custom connector capability — `magoco.connector` (Phase 9).
 *
 * Generic HTTP connector for REST/GraphQL APIs with custom authentication.
 */

import type { CapabilityDef } from './types.js';

export const CONNECTOR_CAPABILITY = 'magoco.connector' as const;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ConnectorConfig {
  baseUrl: string;
  version?: string;
  auth?: {
    type: 'bearer' | 'basic' | 'apikey' | 'custom';
    header?: string;
    value?: string;
    param?: string;
    fn?: (request: unknown) => Promise<string>;
  };
  headers?: Record<string, string>;
  timeout?: number;
  retry?: { attempts: number; delayMs: number };
}

export interface ConnectorRequest {
  method: HttpMethod;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  contentType?: string;
}

export interface ConnectorResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface ConnectorProvider {
  /** Make HTTP request to configured API */
  request(req: ConnectorRequest): Promise<ConnectorResponse>;

  /** Update connector configuration */
  configure(config: Partial<ConnectorConfig>): Promise<void>;

  /** Set credentials securely */
  setAuth(credentials: Record<string, string>): Promise<void>;
}

export const connectorDef: CapabilityDef = {
  id: CONNECTOR_CAPABILITY,
  name: 'Custom Connector',
  description: 'Generic REST/GraphQL HTTP connector with auth',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${CONNECTOR_CAPABILITY} not registered`);
  },
};
