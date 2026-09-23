/**
 * In-memory / pure providers for Phase 10: Security & Auth
 */

import * as crypto from 'node:crypto';
import type {
  JwtProvider,
  JwtPayload,
  TotpProvider,
  TotpSecret,
  SecretStoreProvider,
  RateLimiterProvider,
  RateLimitResult,
  SessionManagerProvider,
  UserSession
} from '../capabilities/auth.js';

// 1. JWT Provider (HMAC-SHA256 based)
export function createJwtProvider(secret: string = 'magoco-super-secret-key'): JwtProvider {
  function base64UrlEncode(str: string): string {
    return Buffer.from(str).toString('base64url');
  }

  function base64UrlDecode(str: string): string {
    return Buffer.from(str, 'base64url').toString('utf8');
  }

  return {
    async sign(payload: JwtPayload, expiresInSeconds: number = 3600): Promise<string> {
      const header = { alg: 'HS256', typ: 'JWT' };
      const now = Math.floor(Date.now() / 1000);
      const fullPayload = {
        ...payload,
        iat: payload.iat ?? now,
        exp: payload.exp ?? now + expiresInSeconds,
      };

      const headerB64 = base64UrlEncode(JSON.stringify(header));
      const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
      const signature = crypto
        .createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      return `${headerB64}.${payloadB64}.${signature}`;
    },

    async verify(token: string): Promise<JwtPayload | null> {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const [headerB64, payloadB64, signature] = parts;
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(`${headerB64}.${payloadB64}`)
          .digest('base64url');

        if (signature !== expectedSignature) return null;

        const payload: JwtPayload = JSON.parse(base64UrlDecode(payloadB64!));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) return null;

        return payload;
      } catch {
        return null;
      }
    },

    decode(token: string): JwtPayload | null {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        return JSON.parse(base64UrlDecode(parts[1]!));
      } catch {
        return null;
      }
    }
  };
}

// 2. TOTP Provider (Simple RFC 6238 implementation)
export function createTotpProvider(): TotpProvider {
  return {
    generateSecret(accountName: string, issuer: string = 'MAGoCo'): TotpSecret {
      const secret = crypto.randomBytes(20).toString('hex').slice(0, 32);
      const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
      return { secret, uri };
    },

    verifyToken(token: string, secret: string, window: number = 1): boolean {
      if (!/^\d{6}$/.test(token)) return false;
      const timeStep = 30;
      const currentCounter = Math.floor(Math.floor(Date.now() / 1000) / timeStep);

      for (let offset = -window; offset <= window; offset++) {
        const counter = currentCounter + offset;
        const buf = Buffer.alloc(8);
        buf.writeBigInt64BE(BigInt(counter));
        const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'utf8')).update(buf).digest();
        const offsetVal = hmac[hmac.length - 1]! & 0x0f;
        const code = ((hmac.readUInt32BE(offsetVal) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
        if (code === token) return true;
      }
      return false;
    }
  };
}

// 3. Encrypted Secret Store Provider (AES-256-GCM)
export function createSecretStoreProvider(masterKey: string = 'master-encryption-key-32-chars!!'): SecretStoreProvider {
  const store = new Map<string, string>();
  const key = crypto.createHash('sha256').update(masterKey).digest();

  return {
    async set(k: string, v: string): Promise<void> {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(v, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag();
      const payload = `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
      store.set(k, payload);
    },

    async get(k: string): Promise<string | null> {
      const payload = store.get(k);
      if (!payload) return null;
      try {
        const [ivHex, tagHex, encrypted] = payload.split(':');
        const iv = Buffer.from(ivHex!, 'hex');
        const tag = Buffer.from(tagHex!, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted!, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch {
        return null;
      }
    },

    async delete(k: string): Promise<boolean> {
      return store.delete(k);
    },

    async listKeys(): Promise<string[]> {
      return Array.from(store.keys());
    }
  };
}

// 4. Rate Limiter Provider (Token Bucket)
export function createRateLimiterProvider(defaultPoints: number = 5, durationSeconds: number = 60): RateLimiterProvider {
  interface Bucket {
    tokens: number;
    lastRefill: number;
  }
  const buckets = new Map<string, Bucket>();

  return {
    async consume(key: string, points: number = 1): Promise<RateLimitResult> {
      const now = Date.now();
      let bucket = buckets.get(key);

      if (!bucket) {
        bucket = { tokens: defaultPoints, lastRefill: now };
        buckets.set(key, bucket);
      } else {
        const elapsed = (now - bucket.lastRefill) / 1000;
        const tokensToAdd = Math.floor(elapsed * (defaultPoints / durationSeconds));
        if (tokensToAdd > 0) {
          bucket.tokens = Math.min(defaultPoints, bucket.tokens + tokensToAdd);
          bucket.lastRefill = now;
        }
      }

      if (bucket.tokens >= points) {
        bucket.tokens -= points;
        return {
          allowed: true,
          remaining: bucket.tokens,
          resetTimeMs: bucket.lastRefill + durationSeconds * 1000
        };
      } else {
        return {
          allowed: false,
          remaining: 0,
          resetTimeMs: bucket.lastRefill + durationSeconds * 1000
        };
      }
    },

    async reset(key: string): Promise<void> {
      buckets.delete(key);
    }
  };
}

// 5. Session Manager Provider
export function createSessionManagerProvider(): SessionManagerProvider {
  const sessions = new Map<string, UserSession>();

  return {
    async createSession(userId: string, metadata?: Record<string, unknown>): Promise<UserSession> {
      const id = crypto.randomUUID();
      const session: UserSession = {
        id,
        userId,
        createdAt: Date.now(),
        lastActive: Date.now(),
        ...(metadata ? { metadata } : {})
      };
      sessions.set(id, session);
      return session;
    },

    async getSession(sessionId: string): Promise<UserSession | null> {
      return sessions.get(sessionId) ?? null;
    },

    async touchSession(sessionId: string): Promise<void> {
      const session = sessions.get(sessionId);
      if (session) {
        session.lastActive = Date.now();
      }
    },

    async revokeSession(sessionId: string): Promise<void> {
      sessions.delete(sessionId);
    },

    async revokeAllUserSessions(userId: string): Promise<void> {
      for (const [id, session] of sessions.entries()) {
        if (session.userId === userId) {
          sessions.delete(id);
        }
      }
    },

    validateIp(ip: string, allowlist: string[]): boolean {
      if (allowlist.length === 0) return true;
      return allowlist.includes(ip);
    }
  };
}
