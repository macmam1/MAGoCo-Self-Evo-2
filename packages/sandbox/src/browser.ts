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
// PROVIDER IMPLEMENTATION
// ============================================================================

export function createBrowserProvider(): BrowserProvider {
  return {
    async launch(config: BrowserConfig): Promise<BrowserState> {
      const sessionId = `browser_${Date.now()}`;
      
      if (playwright) {
        // Real Playwright implementation
        const browser = await playwright.chromium.launch({
          headless: config.headless ?? false,
        });
        const page = await browser.newPage();
        if (config.viewport) {
          await page.setViewportSize(config.viewport);
        }
        if (config.userAgent) {
          await page.setUserAgent(config.userAgent);
        }
        currentSession = { sessionId, url: 'about:blank', title: 'New Tab' };
        return currentSession;
      } else {
        // Mock implementation for testing
        mockUrl = 'about:blank';
        mockTitle = 'New Tab';
        currentSession = { sessionId, url: 'about:blank', title: 'New Tab' };
        return currentSession;
      }
    },

    async navigate(url: string): Promise<void> {
      if (playwright && currentSession) {
        // Real Playwright navigation
        const page = await currentSession.page;
        await page.goto(url);
        mockUrl = url;
        mockTitle = await page.title();
        if (currentSession) {
          currentSession.url = url;
          currentSession.title = mockTitle;
        }
      } else {
        // Mock
        mockUrl = url;
        mockTitle = 'Page';
        if (currentSession) {
          currentSession.url = url;
          currentSession.title = mockTitle;
        }
      }
    },

    async screenshot(): Promise<string> {
      if (playwright && currentSession) {
        const page = await currentSession.page;
        const buffer = await page.screenshot({ encoding: 'base64' });
        return buffer;
      } else {
        // Mock placeholder
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAAYAAAAgZg9AAAAABkRSTlMA8w2z9wAAAB1JREFUCB1jYGBgYGBkYGBgYAAANwAB+Xq03QAAAABJRU5ErkJggg==';
      }
    },

    async mouseMove(x: number, y: number): Promise<void> {
      if (playwright && currentSession) {
        const page = await currentSession.page;
        await page.mouse.move(x, y);
      }
      // Mock: no-op
    },

    async click(x: number, y: number): Promise<void> {
      if (playwright && currentSession) {
        const page = await currentSession.page;
        await page.mouse.click(x, y);
      }
      // Mock: no-op
    },

    async close(): Promise<void> {
      if (playwright && currentSession) {
        await currentSession.browser.close();
        currentSession = null;
      } else {
        // Mock
        currentSession = null;
        mockUrl = 'about:blank';
        mockTitle = 'New Tab';
      }
    },

    async getState(): Promise<BrowserState | null> {
      return currentSession;
    },
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/** Check if playwright is installed */
export function hasPlaywright(): boolean {
  return !!playwright;
}

/** Install playwright if not available */
export async function ensurePlaywrightInstalled(): Promise<void> {
  if (!playwright) {
    console.log('🔧 Installing Playwright...');
    const { execSync } = require('child_process');
    execSync('npx playwright install', { stdio: 'inherit' });
    // Reload
    try {
      playwright = require('playwright');
    } catch (e) {
      console.error('❌ Failed to install Playwright. Please install manually.');
    }
  }
}
