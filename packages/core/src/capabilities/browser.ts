/**
 * Browser capability — `magoco.browser` (Phase 3.7).
 *
 * Enables Playwright integration for collaborative browsing.
 */

import type { CapabilityDef, CapabilityContext } from './types.js';

export const BROWSER_CAPABILITY = 'magoco.browser' as const;

export interface BrowserConfig {
  headless?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
}

export interface BrowserState {
  sessionId: string;
  url: string;
  title: string;
}

export interface BrowserProvider {
  /** Launch browser session */
  launch(config: BrowserConfig): Promise<BrowserState>;
  
  /** Navigate to URL */
  navigate(url: string): Promise<void>;
  
  /** Take screenshot */
  screenshot(): Promise<string>; // base64 or path
  
  /** Mouse movement */
  mouseMove(x: number, y: number): Promise<void>;
  
  /** Click at position */
  click(x: number, y: number): Promise<void>;
  
  /** Close browser */
  close(): Promise<void>;
  
  /** Get current state */
  getState(): Promise<BrowserState | null>;
}

export const browserDef: CapabilityDef = {
  id: BROWSER_CAPABILITY,
  name: 'Collaborative Browsing',
  description: 'Live Playwright integration for shared browser control',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${BROWSER_CAPABILITY} not registered`);
  },
};
