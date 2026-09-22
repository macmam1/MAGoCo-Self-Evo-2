/**
 * Viewport capability — `magoco.viewport.track` (Phase 3.7).
 */

import type { CapabilityDef } from './types.js';

export const VIEWPORT_CAPABILITY = 'magoco.viewport.track' as const;

export interface ViewportEvent {
  /** 'mousemove' | 'scroll' */
  type: string;
  x?: number;
  y?: number;
  scrollY?: number;
}

export interface ViewportProvider {
  /** Called when viewport events are streamed in via websocket. */
  onEvent(event: ViewportEvent): void;
}

export const viewportDef: CapabilityDef = {
  id: VIEWPORT_CAPABILITY,
  name: 'Viewport',
  description: 'Track user viewport and mouse position',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${VIEWPORT_CAPABILITY} not registered`);
  },
};
