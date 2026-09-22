/**
 * Fixer Agent capability — `magoco.fix` (Phase 3.7).
 *
 * Enables self-healing when selectors fail.
 */

import type { CapabilityDef, CapabilityContext } from './types.js';

export const FIXER_CAPABILITY = 'magoco.fix' as const;

export interface SelectorRecoveryPlan {
  originalSelector: string;
  alternativeSelector: string;
  confidence: number; // 0.0 - 1.0
  method: 'text' | 'attribute' | 'position' | 'semantic';
  description: string;
}

export interface FailureContext {
  selector: string;
  error: string;
  context?: {
    text: string;
    ariaLabel: string;
    role: string;
    visibleText: string;
  };
}

export interface FixerProvider {
  /**
   * Analyze why an action failed and propose recovery.
   */
  analyzeFailure(ctx: FailureContext): Promise<SelectorRecoveryPlan | null>;
  
  /**
   * Attempt to recover and return the new selector.
   */
  recover(ctx: FailureContext, domSnapshot: any): Promise<SelectorRecoveryPlan | null>;
}

export const fixerDef: CapabilityDef = {
  id: FIXER_CAPABILITY,
  name: 'Fixer Agent',
  description: 'Self-healing when selectors fail (selector recovery)',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${FIXER_CAPABILITY} not registered`);
  },
};
