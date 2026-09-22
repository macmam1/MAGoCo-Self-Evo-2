/**
 * Proxy & Identity Masking provider — `magoco.proxy` (Phase 3.7).
 *
 * Stores per-session proxy config and identity mask.
 * Actual proxy injection into Playwright/browser-use happens at session start.
 */

import type { ProxyProvider, ProxyConfig, IdentityConfig } from '../../core/src/capabilities/proxy.js';

export function createProxyProvider(): ProxyProvider {
  let proxy: ProxyConfig | null = null;
  let identity: IdentityConfig | null = null;

  return {
    async setProxy(config: ProxyConfig): Promise<void> {
      proxy = { ...config };
    },

    async clearProxy(): Promise<void> {
      proxy = null;
    },

    async getProxy(): Promise<ProxyConfig | null> {
      return proxy;
    },

    async setIdentity(config: IdentityConfig): Promise<void> {
      identity = { ...config };
    },

    async clearIdentity(): Promise<void> {
      identity = null;
    },

    async getIdentity(): Promise<IdentityConfig | null> {
      return identity;
    },
  };
}
