/**
 * Live Preview capability — `magoco.preview` (Phase 3.6).
 *
 * Enables real-time app preview during development.
 */

import type { CapabilityDef, CapabilityContext } from './types.js';

export const PREVIEW_CAPABILITY = 'magoco.preview' as const;

export interface PreviewConfig {
  /** Port to serve the preview app */
  port?: number;
  /** Directory containing the app */
  rootPath: string;
  /** Hot reload enabled? */
  hotReload?: boolean;
  /** Preview URL template */
  urlTemplate?: string;
}

export interface PreviewState {
  url: string;
  port: number;
  status: 'stopped' | 'starting' | 'running' | 'error';
}

export interface PreviewProvider {
  /** Start preview server */
  start(config: PreviewConfig): Promise<PreviewState>;
  
  /** Stop preview server */
  stop(): Promise<void>;
  
  /** Get current state */
  getState(): Promise<PreviewState | null>;
  
  /** Trigger hot reload */
  reload(): Promise<void>;
}

export const previewDef: CapabilityDef = {
  id: PREVIEW_CAPABILITY,
  name: 'Live Preview',
  description: 'Real-time app preview during development',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${PREVIEW_CAPABILITY} not registered`);
  },
};
