/**
 * OAuth flow capability — `magoco.oauth` (Phase 9).
 *
 * Handles OAuth 2.0 flows for external service authentication.
 */

import type { CapabilityDef } from './types.js';

export const OAUTH_CAPABILITY = 'magoco.oauth' as const;

export interface OAuthProvider {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthConfig {
  providers: Record<string, OAuthProvider>;
  secretStore: {
    store(key: string, value: string): Promise<void>;
    retrieve(key: string): Promise<string | null>;
  };
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
}

export interface OAuthRequest {
  provider: string;
  scopes?: string[];
  state?: string;
}

export interface OAuthCallback {
  provider: string;
  code: string;
  state?: string;
}

export interface OAuthProviderInstance {
  /** Generate authorization URL */
  getAuthUrl(request: OAuthRequest): Promise<string>;

  /** Exchange code for tokens */
  exchangeCode(callback: OAuthCallback): Promise<OAuthToken>;

  /** Refresh access token */
  refreshToken(provider: string, refreshToken: string): Promise<OAuthToken>;

  /** Check if token is valid */
  validateToken(provider: string, accessToken: string): Promise<boolean>;

  /** Revoke token */
  revokeToken(provider: string, accessToken: string): Promise<void>;
}

export const oauthDef: CapabilityDef = {
  id: OAUTH_CAPABILITY,
  name: 'OAuth 2.0 Client',
  description: 'OAuth 2.0 authentication flow for external services',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${OAUTH_CAPABILITY} not registered`);
  },
};
