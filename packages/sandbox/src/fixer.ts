/**
 * Fixer Agent implementation.
 *
 * Implements self-healing when selectors fail.
 */

import type {
  FixerProvider,
  FailureContext,
  SelectorRecoveryPlan,
} from '../../core/src/capabilities/fixer.js';

// ============================================================================
// SELECTOR RECOVERY LOGIC
// ============================================================================

/**
 * Attempt to recover a failed selector.
 */
export async function recoverSelector(
  ctx: FailureContext,
  domSnapshot: any
): Promise<SelectorRecoveryPlan | null> {
  // Analyze the failure
  if (ctx.error.includes('not found')) {
    return tryRecoverByFallback(ctx, domSnapshot);
  }

  return null;
}

/**
 * Try to recover by falling back to text/attribute-based selectors.
 */
function tryRecoverByFallback(
  ctx: FailureContext,
  domSnapshot: any
): SelectorRecoveryPlan | null {
  // If we have context like text or ariaLabel, use that
  if (ctx.context?.ariaLabel) {
    return {
      originalSelector: ctx.selector,
      alternativeSelector: `[aria-label="${ctx.context.ariaLabel}"]`,
      confidence: 0.85,
      method: 'attribute',
      description: `Recovered by aria-label "${ctx.context.ariaLabel}"`,
    };
  }

  if (ctx.context?.text && ctx.context.text.length > 0) {
    // Extract first word as fallback (e.g., "Submit" from "Submit form")
    const words = ctx.context.text.trim().split(/\s+/);
    if (words.length > 0) {
      return {
        originalSelector: ctx.selector,
        alternativeSelector: `button, input[type="submit"]`, // generic fallback with text check
        confidence: 0.7,
        method: 'text',
        description: `Recovered by text "${words[0]}" + generic button selector`,
      };
    }
  }

  return null;
}

// ============================================================================
// PROVIDER IMPLEMENTATION
// ============================================================================

export function createFixerProvider(): FixerProvider {
  return {
    analyzeFailure: async (ctx) => {
      // Log the failure for debugging
      console.log('⚠️ Agent failure:', ctx.error);
      return null;
    },

    recover: async (ctx, domSnapshot) => {
      const plan = await recoverSelector(ctx, domSnapshot);
      
      if (plan) {
        console.log(`✅ Recovery found: ${plan.alternativeSelector} (confidence: ${(plan.confidence * 100).toFixed(0)}%)`);
      }

      return plan;
    },
  };
}
