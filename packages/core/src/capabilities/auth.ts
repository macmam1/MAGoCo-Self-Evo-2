/**
 * Security & Auth capability definitions — Phase 10
 *
 * Capabilities:
 * - magoco.auth.jwt (JWT creation, verification, refresh)
 * - magoco.auth.totp (2FA / TOTP generation and validation)
 * - magoco.auth.secret (Encrypted secret storage with envelope encryption)
 * - magoco.security.ratelimit (Token bucket rate limiting)
 * - magoco.auth.session (Session state, revocation, IP allowlist)
 */

import type { CapabilityDef } from './types.js';

export const JWT_CAPABILITY = 'magoco.auth.jwt' as const;
export const TOTP_CAPABILITY = 'magoco.auth.totp' as const;
export const SECRET_CAPABILITY = 'magoco.auth.secret' as const;
export const RATELIMIT_CAPABILITY = 'magoco.security.ratelimit' as const;
export const SESSION_CAPABILITY = 'magoco.auth.session' as const;

// 1. JWT Interfaces
export interface JwtPayload {
  sub: string;
  role: string;
  permissions?: string[];
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export interface JwtProvider {
  sign(payload: JwtPayload, expiresInSeconds?: number): Promise<string>;
  verify(token: string): Promise<JwtPayload | null>;
  decode(token: string): JwtPayload | null;
}

// 2. TOTP Interfaces
export interface TotpSecret {
  secret: string;
  uri: string;
  qrCodeUrl?: string;
}

export interface TotpProvider {
  generateSecret(accountName: string, issuer?: string): TotpSecret;
  verifyToken(token: string, secret: string, window?: number): boolean;
}

// 3. Secret Store Interfaces
export interface SecretStoreProvider {
  set(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<boolean>;
  listKeys(): Promise<string[]>;
}

// 4. Rate Limiter Interfaces
export interface RateLimitConfig {
  points: number; // Max requests
  durationSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTimeMs: number;
}

export interface RateLimiterProvider {
  consume(key: string, points?: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

// 5. Session Management Interfaces
export interface UserSession {
  id: string;
  userId: string;
  createdAt: number;
  lastActive: number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionManagerProvider {
  createSession(userId: string, metadata?: Record<string, unknown>): Promise<UserSession>;
  getSession(sessionId: string): Promise<UserSession | null>;
  touchSession(sessionId: string): Promise<void>;
  revokeSession(sessionId: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
  validateIp(ip: string, allowlist: string[]): boolean;
}

// Capability Definitions
export const jwtDef: CapabilityDef = {
  id: JWT_CAPABILITY,
  name: 'JWT Auth',
  description: 'JWT issuance and verification',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const totpDef: CapabilityDef = {
  id: TOTP_CAPABILITY,
  name: 'TOTP 2FA',
  description: 'Time-based one-time passwords for 2FA',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const secretDef: CapabilityDef = {
  id: SECRET_CAPABILITY,
  name: 'Secret Store',
  description: 'Encrypted secret storage',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const rateLimitDef: CapabilityDef = {
  id: RATELIMIT_CAPABILITY,
  name: 'Rate Limiter',
  description: 'Token bucket rate limiting',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const sessionDef: CapabilityDef = {
  id: SESSION_CAPABILITY,
  name: 'Session Manager',
  description: 'User session tracking and revocation',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};
