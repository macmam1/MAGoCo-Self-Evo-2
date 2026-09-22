/**
 * Terminal capability — `magoco.term.start` (Phase 3, spec §4.3).
 */

import type { CapabilityDef, CapabilityContext } from './types.js';
import { EventBus } from '../eventbus/bus.js';

export const TERMINAL_CAPABILITY = 'magoco.term.start' as const;

export interface TermSize { rows: number; cols: number; }

export interface TermRequest {
  readonly command?: string; // shell path or command
  readonly args?: readonly string[];
  readonly env?: Record<string, string>;
  readonly size?: TermSize;
}

export interface TermSession {
  readonly id: string;
  readonly onOutput: (listener: (data: string) => void) => void;
  readonly onData: (data: string) => void;
  readonly resize: (size: TermSize) => void;
  readonly kill: () => void;
}

export interface TermProvider {
  start(request: TermRequest): TermSession;
}

export const termDef: CapabilityDef = {
  id: TERMINAL_CAPABILITY,
  name: 'Terminal',
  description: 'Interactive terminal sessions',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${TERMINAL_CAPABILITY} not registered`);
  },
};
