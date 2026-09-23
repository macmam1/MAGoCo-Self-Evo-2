/**
 * Webhook capability — `magoco.webhook` (Phase 9).
 *
 * Enables inbound/outbound webhook communication with external services.
 */

import type { CapabilityDef } from './types.js';

export const WEBHOOK_CAPABILITY = 'magoco.webhook' as const;

export interface WebhookConfig {
  baseUrl: string;
  secret?: string;
  maxBodySize?: number;
  timeout?: number;
}

export interface IncomingWebhook {
  id: string;
  path: string;
  methods: readonly string[];
  headers: Record<string, string>;
  signatureHeader?: string;
}

export interface OutboundWebhook {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  retry?: { attempts: number; delayMs: number };
}

export interface WebhookPayload {
  event: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface WebhookRequest {
  id?: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface WebhookResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface WebhookProvider {
  /** Register incoming webhook endpoint */
  register(config: IncomingWebhook): Promise<void>;

  /** Unregister incoming webhook */
  unregister(id: string): Promise<void>;

  /** Send outbound webhook */
  send(webhookId: string, payload: WebhookPayload): Promise<boolean>;

  /** Verify signature of incoming webhook */
  verifySignature(id: string, payload: string, signature: string): Promise<boolean>;
}

export const webhookDef: CapabilityDef = {
  id: WEBHOOK_CAPABILITY,
  name: 'Webhook System',
  description: 'Inbound/outbound webhook communication with external services',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${WEBHOOK_CAPABILITY} not registered`);
  },
};
