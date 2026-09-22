/**
 * AI code capability — `magoco.ai.code` (Phase 3.5).
 */

import type { CapabilityDef, CapabilityContext } from './types.js';

export const AI_CODE_CAPABILITY = 'magoco.ai.code' as const;

export interface CodeRequest {
  /** 'generate' | 'review' | 'debug' | 'complete' */
  readonly type: 'generate' | 'review' | 'debug' | 'complete';
  readonly prompt: string;
  readonly files?: { path: string; content: string }[];
  readonly context?: string;
}

export interface CodeResponse {
  readonly type: string;
  readonly code?: string;
  readonly suggestions?: { file: string; changes: string[] }[];
  readonly explanation?: string;
}

export interface AIProvider {
  run(request: CodeRequest): Promise<CodeResponse>;
}

export const aiCodeDef: CapabilityDef = {
  id: AI_CODE_CAPABILITY,
  name: 'AI Code',
  description: 'AI-powered code generation, review, and debugging',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${AI_CODE_CAPABILITY} not registered`);
  },
};
