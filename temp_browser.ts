/**
 * Browser provider implementation using Playwright.
 *
 * Enables collaborative browser control between user and agent.
 */

import type {
  BrowserConfig,
  BrowserState,
  BrowserProvider,
} from '../../core/src/capabilities/browser.js';

// ============================================================================
// SESSION STATE
// ============================================================================

let currentSession: BrowserState | null = null;
let playwright: any = null;

// Try to load playwright (optional dependency)
try {
  playwright = require('playwright');
} catch (e) {
  console.warn('⚠️ Playwright not installed. Using mock browser for testing.');
  console.warn('Install with: npx playwright install');
}

// ============================================================================
// MOCK FALLBACK (if playwright not installed)
// ============================================================================

let mockUrl = 'about:blank';
let mockTitle = 'New Tab';

// ============================================================================

 // Mock browser state (extends BrowserState with Playwright-specific fields)
interface MockBrowserState {
  sessionId: string;
  url: string;
  title: string;
  page?: any;
  browser?: any;
}
