/**
 * Proxy & Identity provider implementation.
 *
 * Enables session-level proxy and identity masking for browser automation.
 */

import type {
  ProxyConfig,
  IdentityConfig,
  ProxyProvider,
} from '../../core/src/capabilities/proxy.js';

// ============================================================================
// SESSION STATE
// ============================================================================

let currentProxy: ProxyConfig | null = null;
let currentIdentity: IdentityConfig | null = null;

// ============================================================================
// PROVIDER IMPLEMENTATION
// ============================================================================

export function createProxyProvider(): ProxyProvider {
  return {
    async setProxy(config: ProxyConfig): Promise<void> {
      currentProxy = config;
      console.log(`✅ Proxy set: ${config.protocol}://${config.host}:${config.port}`);
    },

    async clearProxy(): Promise<void> {
      currentProxy = null;
      console.log('❌ Proxy cleared');
    },

    async getProxy(): Promise<ProxyConfig | null> {
      return currentProxy;
    },

    async setIdentity(config: IdentityConfig): Promise<void> {
      currentIdentity = config;
      console.log('✅ Identity mask set');
    },

    async clearIdentity(): Promise<void> {
      currentIdentity = null;
      console.log('❌ Identity mask cleared');
    },

    async getIdentity(): Promise<IdentityConfig | null> {
      return currentIdentity;
    },
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Apply proxy + identity to Playwright launch options.
 */
export function toPlaywrightArgs(config: ProxyConfig, identity: IdentityConfig | null): Record<string, any> {
  const args: Record<string, any> = {
    args: [
      `--proxy-server=${config.protocol}://${config.host}:${config.port}`,
      ...(config.auth ? [`--proxy-auth=${config.auth.username}:${config.auth.password}`] : []),
    ],
  };

  if (identity) {
    args.env = {
      ...process.env,
      USER_AGENT: identity.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      LANG: identity.locale || 'en-US',
    };
  }

  return args;
}

/**
 * Generate identity mask based on common patterns.
 */
export function generateIdentityMask(): IdentityConfig {
  return {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezone: 'America/New_York',
    screen: { width: 1920, height: 1080 },
  };
}
