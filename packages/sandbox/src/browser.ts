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
let mockUrl = 'about:blank';
let mockTitle = 'New Tab';

// Try to load playwright (optional dependency)
try {
  playwright = require('playwright');
} catch (e) {
  console.warn('⚠️ Playwright not installed. Using mock browser for testing.');
  console.warn('Install with: npx playwright install');
}

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
        currentSession = {
          sessionId,
          url: 'about:blank',
          title: 'New Tab',
        };
        // Store page/browser in session for later use
        (currentSession as any).page = page;
        (currentSession as any).browser = browser;
        return currentSession;
      } else {
        // Mock implementation
        currentSession = {
          sessionId,
          url: 'about:blank',
          title: 'New Tab',
        };
        return currentSession;
      }
    },
    
    async navigate(url: string): Promise<void> {
      if (playwright && currentSession) {
        // Real Playwright navigation
        const page = (currentSession as any).page;
        await page.goto(url);
        mockUrl = url;
        mockTitle = await page.title();
        currentSession.url = url;
        currentSession.title = mockTitle;
      } else {
        // Mock navigation
        mockUrl = url;
        currentSession = currentSession || { sessionId: 'mock', url: '', title: '' };
        currentSession.url = url;
        currentSession.title = `Page: ${url}`;
      }
    },
    
    async screenshot(): Promise<string> {
      if (playwright && currentSession) {
        const page = (currentSession as any).page;
        const screenshot = await page.screenshot({ encoding: 'base64' });
        return `data:image/png;base64,${screenshot}`;
      } else {
        // Return placeholder
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IiM5OTkiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPjNvdXNoPC90ZXh0Pjwvc3ZnPg==';
      }
    },
    
    async mouseMove(x: number, y: number): Promise<void> {
      if (playwright && currentSession) {
        const page = (currentSession as any).page;
        await page.mouse.move(x, y);
      }
    },
    
    async click(x: number, y: number): Promise<void> {
      if (playwright && currentSession) {
        const page = (currentSession as any).page;
        await page.mouse.click(x, y);
      }
    },
    
    async close(): Promise<void> {
      if (playwright && currentSession) {
        const browser = (currentSession as any).browser;
        if (browser) await browser.close();
      }
      currentSession = null;
    },
    
    async getState(): Promise<BrowserState | null> {
      return currentSession;
    },
  };
}
