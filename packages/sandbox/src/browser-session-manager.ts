/**
 * Browser Session Manager — Phase 4.
 *
 * Manages multiple named browser sessions. Each session is an isolated
 * BrowserProvider instance. Sessions can be created, retrieved, listed,
 * and destroyed by name.
 */

import { createBrowserProvider } from './browser.js';
import type { BrowserConfig, BrowserState, BrowserProvider } from '../../core/src/capabilities/browser.js';

export interface BrowserSession {
  readonly name: string;
  readonly provider: BrowserProvider;
  readonly createdAt: number;
  state: BrowserState | null;
}

export function createBrowserSessionManager() {
  const sessions = new Map<string, BrowserSession>();

  return {
    /** Create and launch a new named session. Throws if name already exists. */
    async create(name: string, config: BrowserConfig = {}): Promise<BrowserSession> {
      if (sessions.has(name)) throw new Error(`session '${name}' already exists`);
      const provider = createBrowserProvider();
      const state = await provider.launch(config);
      const session: BrowserSession = { name, provider, createdAt: Date.now(), state };
      sessions.set(name, session);
      return session;
    },

    /** Get an existing session by name, or null. */
    get(name: string): BrowserSession | null {
      return sessions.get(name) ?? null;
    },

    /** List all active session names. */
    list(): string[] {
      return [...sessions.keys()];
    },

    /** Destroy a session — closes the browser and removes it. */
    async destroy(name: string): Promise<void> {
      const session = sessions.get(name);
      if (!session) return;
      await session.provider.close();
      sessions.set(name, { ...session, state: null });
      sessions.delete(name);
    },

    /** Destroy all sessions. */
    async destroyAll(): Promise<void> {
      for (const name of [...sessions.keys()]) {
        await this.destroy(name);
      }
    },

    /** Refresh the cached state for a session. */
    async refresh(name: string): Promise<BrowserState | null> {
      const session = sessions.get(name);
      if (!session) return null;
      const state = await session.provider.getState();
      (session as any).state = state;
      return state;
    },
  };
}

export type BrowserSessionManager = ReturnType<typeof createBrowserSessionManager>;
