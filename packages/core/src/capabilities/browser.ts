/**
 * Browser capability — `magoco.browser` (Phase 4).
 *
 * Full computer-use surface: click/type/scroll/drag/key + content extraction.
 */

import type { CapabilityDef } from './types.js';

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

export interface ExtractedContent {
  text: string;
  html: string;
  links: Array<{ text: string; href: string }>;
  title: string;
}

export interface BrowserProvider {
  /** Launch browser session */
  launch(config: BrowserConfig): Promise<BrowserState>;

  /** Navigate to URL */
  navigate(url: string): Promise<void>;

  /** Take screenshot — returns data URI */
  screenshot(): Promise<string>;

  /** Mouse movement */
  mouseMove(x: number, y: number): Promise<void>;

  /** Click at position */
  click(x: number, y: number): Promise<void>;

  /** Type text (keyboard input) */
  type(text: string): Promise<void>;

  /** Press a key (e.g. 'Enter', 'Tab', 'Escape') */
  press(key: string): Promise<void>;

  /** Scroll by delta pixels */
  scroll(x: number, y: number, deltaX: number, deltaY: number): Promise<void>;

  /** Drag from one position to another */
  drag(fromX: number, fromY: number, toX: number, toY: number): Promise<void>;

  /** Extract page content for RAG ingestion */
  extractContent(): Promise<ExtractedContent>;

  /** Close browser */
  close(): Promise<void>;

  /** Get current state */
  getState(): Promise<BrowserState | null>;
}

export const browserDef: CapabilityDef = {
  id: BROWSER_CAPABILITY,
  name: 'Collaborative Browsing',
  description: 'Live Playwright integration for shared browser control',
  version: '0.2.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${BROWSER_CAPABILITY} not registered`);
  },
};
