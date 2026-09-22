/**
 * Browser provider implementation using Playwright.
 *
 * Each call to createBrowserProvider() returns an isolated instance
 * with its own session state — no shared module-level mutable state.
 */

import type {
  BrowserConfig,
  BrowserState,
  BrowserProvider,
} from '../../core/src/capabilities/browser.js';

// Try to load playwright (optional dependency — falls back to mock in CI)
let playwrightMod: any = null;
try {
  playwrightMod = require('playwright');
} catch {
  // mock fallback — no warning spam in tests
}

export function createBrowserProvider(): BrowserProvider {
  // All state is instance-local
  let session: (BrowserState & { page?: any; browser?: any }) | null = null;

  return {
    async launch(config: BrowserConfig): Promise<BrowserState> {
      const sessionId = `browser_${Date.now()}`;

      if (playwrightMod) {
        const browser = await playwrightMod.chromium.launch({
          headless: config.headless ?? true,
        });
        const page = await browser.newPage();
        if (config.viewport) await page.setViewportSize(config.viewport);
        if (config.userAgent) await page.setExtraHTTPHeaders({ 'user-agent': config.userAgent });

        session = { sessionId, url: 'about:blank', title: 'New Tab', page, browser };
      } else {
        session = { sessionId, url: 'about:blank', title: 'New Tab' };
      }

      return { sessionId: session.sessionId, url: session.url, title: session.title };
    },

    async navigate(url: string): Promise<void> {
      if (!session) {
        // auto-init a mock session so navigate-without-launch doesn't crash
        session = { sessionId: `browser_${Date.now()}`, url: 'about:blank', title: 'New Tab' };
      }
      if (session.page) {
        await session.page.goto(url);
        session.url = url;
        session.title = await session.page.title();
      } else {
        session.url = url;
        session.title = `Page: ${url}`;
      }
    },

    async screenshot(): Promise<string> {
      if (session?.page) {
        const buf: string = await session.page.screenshot({ encoding: 'base64' });
        return `data:image/png;base64,${buf}`;
      }
      // Minimal 1×1 transparent PNG as placeholder
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    },

    async mouseMove(x: number, y: number): Promise<void> {
      if (session?.page) await session.page.mouse.move(x, y);
    },

    async click(x: number, y: number): Promise<void> {
      if (session?.page) await session.page.mouse.click(x, y);
    },

    async close(): Promise<void> {
      if (session?.browser) await session.browser.close();
      session = null;
    },

    async getState(): Promise<BrowserState | null> {
      if (!session) return null;
      return { sessionId: session.sessionId, url: session.url, title: session.title };
    },
  };
}
