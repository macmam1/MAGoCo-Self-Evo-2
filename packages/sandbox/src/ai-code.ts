/**
 * AI code provider (placeholder for Phase 3.5).
 * Replace with actual LLM integration.
 */

import type { CodeRequest, CodeResponse } from '../../core/src/capabilities/ai-code.js';

export function createAIProvider(): { run(request: CodeRequest): Promise<CodeResponse> } {
  return {
    async run(request: CodeRequest): Promise<CodeResponse> {
      // Placeholder - replace with real LLM call
      if (request.type === 'generate') {
        return {
          type: 'generate',
          code: '// Generated code for: ' + request.prompt + '\nconsole.log("Hello");',
          explanation: 'Simple implementation based on your request.',
        };
      }
      if (request.type === 'review') {
        return {
          type: 'review',
          suggestions: [{ file: 'index.js', changes: ['Add error handling', 'Optimize loop'] }],
          explanation: 'Found 2 improvements.',
        };
      }
      if (request.type === 'debug') {
        return {
          type: 'debug',
          code: request.files?.[0]?.content || '',
          explanation: 'Fixed null pointer issue.',
        };
      }
      return { type: 'complete', code: '// Complete' };
    },
  };
}
