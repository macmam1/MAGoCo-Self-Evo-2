/**
 * Experience capability — `magoco.experience` (Phase 3.6).
 */

import type { CapabilityDef, CapabilityContext } from './types.js';

export const EXPERIENCE_CAPABILITY = 'magoco.experience' as const;

export interface ExperienceProvider {
  /**
   * ENFORCED: capture a browser interaction as experience.
   * Call this AFTER any agent action in browser.
   */
  capture(context: string, action: string, outcome: string, metadata: Record<string, any>): Promise<string>;
  
  /**
   * ENFORCED: inject relevant experiences into agent context before decision.
   * Call this BEFORE any agent decision.
   */
  inject(task: string, topK: number): Promise<string[]>;
  
  /**
   * ENFORCED: evaluate and reflect after task completion.
   */
  reflect(taskId: string, success: boolean, details: string): Promise<void>;
}

export const experienceDef: CapabilityDef = {
  id: EXPERIENCE_CAPABILITY,
  name: 'Experience Engine',
  description: 'Capture, embed, retrieve, and inject browser interactions',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${EXPERIENCE_CAPABILITY} not registered`);
  },
};
