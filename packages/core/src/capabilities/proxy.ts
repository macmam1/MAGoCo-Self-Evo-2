/**
 * Proxy & Identity Masking capability — `magoco.proxy` (Phase 3.7).
 *
 * Enables session-level proxy configuration for anonymity.
 */

import type { CapabilityDef, CapabilityContext } from './types.js';

export const PROXY_CAPABILITY = 'magoco.proxy' as const;

export interface ProxyConfig {
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
}

export interface IdentityConfig {
  userAgent?: string;
  locale?: string;
  timezone?: string;
  screen?: {
    width: number;
    height: number;
  };
}

export interface ProxyProvider {
  /** Set session-level proxy */
  setProxy(config: ProxyConfig): Promise<void>;
  
  /** Clear current proxy */
  clearProxy(): Promise<void>;
  
  /** Get current proxy */
  getProxy(): Promise<ProxyConfig | null>;
  
  /** Apply identity mask */
  setIdentity(config: IdentityConfig): Promise<void>;
  
  /** Clear identity mask */
  clearIdentity(): Promise<void>;
  
  /** Get current identity mask */
  getIdentity(): Promise<IdentityConfig | null>;
}

export const proxyDef: CapabilityDef = {
  id: PROXY_CAPABILITY,
  name: 'Proxy & Identity',
  description: 'Session-level proxy and identity masking',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${PROXY_CAPABILITY} not registered`);
  },
};
