/**
 * Viewport provider — `magoco.viewport.track` (Phase 3.7).
 *
 * Receives mousemove/scroll events from the browser client over WebSocket
 * and fans them out to registered subscribers (e.g. the browser-use agent).
 */

import type { ViewportProvider, ViewportEvent } from '../../core/src/capabilities/view.js';

type Subscriber = (event: ViewportEvent) => void;

export function createViewportProvider(): ViewportProvider & {
  subscribe(fn: Subscriber): () => void;
  snapshot(): ViewportEvent | null;
} {
  const subscribers = new Set<Subscriber>();
  let last: ViewportEvent | null = null;

  return {
    onEvent(event: ViewportEvent) {
      last = event;
      for (const fn of subscribers) fn(event);
    },

    /** Register a subscriber; returns an unsubscribe function. */
    subscribe(fn: Subscriber) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },

    /** Latest known viewport state, or null if no events received yet. */
    snapshot() {
      return last;
    },
  };
}
