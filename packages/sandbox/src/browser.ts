/**
 * Browser provider implementation — Phase 4 (computer-use).
 *
 * Each createBrowserProvider() call returns an isolated instance.
 * Falls back to a mock when Playwright is not installed (CI).
 */

import type {
  BrowserConfig,
  BrowserState,
  BrowserProvider,
  ExtractedContent,
} from '../../core/src/capabilities/browser.js';

let playwrightMod: any = null;
try { playwrightMod = require('playwright'); } catch { /* mock fallback */ }

export function createBrowserProvider(): BrowserProvider {
  let session: (BrowserState & { page?: any; browser?: any }) | null = null;

  function ensureSession(): void {
    if (!session) {
      session = { sessionId: `browser_${Date.now()}`, url: 'about:blank', title: 'New Tab' };
    }
  }

  return {
    async launch(config: BrowserConfig): Promise<BrowserState> {
      const sessionId = `browser_${Date.now()}`;
      if (playwrightMod) {
        const browser = await playwrightMod.chromium.launch({ headless: config.headless ?? true });
        const page = await browser.newPage();
        if (config.viewport) await page.setViewportSize(config.viewport);
        session = { sessionId, url: 'about:blank', title: 'New Tab', page, browser };
      } else {
        session = { sessionId, url: 'about:blank', title: 'New Tab' };
      }
      return { sessionId: session.sessionId, url: session.url, title: session.title };
    },

    async navigate(url: string): Promise<void> {
      ensureSession();
      if (session!.page) {
        await session!.page.goto(url);
        session!.url = url;
        session!.title = await session!.page.title();
      } else {
        session!.url = url;
        session!.title = `Page: ${url}`;
      }
    },

    async screenshot(): Promise<string> {
      if (session?.page) {
        const buf: string = await session.page.screenshot({ encoding: 'base64' });
        return `data:image/png;base64,${buf}`;
      }
      // 1×1 transparent PNG placeholder
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    },

    async mouseMove(x: number, y: number): Promise<void> {
      if (session?.page) await session.page.mouse.move(x, y);
    },

    async click(x: number, y: number): Promise<void> {
      if (session?.page) await session.page.mouse.click(x, y);
    },

    async type(text: string): Promise<void> {
      if (session?.page) await session.page.keyboard.type(text);
    },

    async press(key: string): Promise<void> {
      if (session?.page) await session.page.keyboard.press(key);
    },

    async scroll(x: number, y: number, deltaX: number, deltaY: number): Promise<void> {
      if (session?.page) {
        await session.page.mouse.move(x, y);
        await session.page.mouse.wheel(deltaX, deltaY);
      }
    },

    async drag(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
      if (session?.page) {
        await session.page.mouse.move(fromX, fromY);
        await session.page.mouse.down();
        await session.page.mouse.move(toX, toY);
        await session.page.mouse.up();
      }
    },

    async extractContent(): Promise<ExtractedContent> {
      if (session?.page) {
        const [text, html, links, title] = await session.page.evaluate(/* istanbul ignore next */ () => {
          const doc = (globalThis as any).document;
          const anchors: any[] = Array.from(doc.querySelectorAll('a[href]'));
          return [
            doc.body?.innerText ?? '',
            doc.documentElement.outerHTML,
            anchors.map((a: any) => ({ text: a.innerText.trim(), href: a.href })),
            doc.title,
          ];
        });
        return { text, html, links, title };
      }
      // Mock: return current state info
      return {
        text: session?.title ?? '',
        html: `<html><body>${session?.title ?? ''}</body></html>`,
        links: [],
        title: session?.title ?? '',
      };
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
