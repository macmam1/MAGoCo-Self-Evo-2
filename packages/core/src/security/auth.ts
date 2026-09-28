/**
 * Authentication System Types
 * Supports: OAuth, API keys, role-based access
 */

export type AuthProvider = 'oauth' | 'apikey' | 'local' | 'sso';

export interface AuthCredentials {
  provider: AuthProvider;
  token?: string;
  apiKey?: string;
  username?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface AuthContext {
  isAuthenticated: boolean;
  provider: AuthProvider | null;
  credentials: AuthCredentials | null;
  user: { id: string; name: string; roles: string[] } | null;
}

export interface AuthStore {
  login: (provider: AuthProvider, credentials: AuthCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  checkValidity: () => Promise<boolean>;
}
