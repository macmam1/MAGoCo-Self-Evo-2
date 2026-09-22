/**
 * Run capability — `magoco.run` (Phase 3.4).
 */

import type { CapabilityDef, CapabilityContext } from './types.js';

export const RUN_CAPABILITY = 'magoco.run' as const;

export interface RunRequest {
  readonly lang: 'js' | 'py' | 'sh';
  readonly code: string;
  readonly timeoutMs?: number;
}

export interface RunResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export interface RunProvider {
  run(request: RunRequest): Promise<RunResult>;
}

export const runDef: CapabilityDef = {
  id: RUN_CAPABILITY,
  name: 'Run Code',
  description: 'Execute code in sandbox with streaming output',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${RUN_CAPABILITY} not registered`);
  },
};
