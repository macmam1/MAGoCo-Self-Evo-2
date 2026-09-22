/**
 * Human-assist capability — `magoco.human.assist` (Phase 3.7).
 */

import type { CapabilityDef, CapabilityContext } from './types.js';

export const HUMAN_ASSIST_CAPABILITY = 'magoco.human.assist' as const;

export interface HumanTask {
  id: string;
  type: 'captcha' | 'approval' | 'correction';
  prompt: string;
  payload?: {
    action?: { type: 'click' | 'type'; selector?: string; value?: string };
    screenshot?: string; // base64 snapshot
  };
  timeout: number; // seconds
}

export interface HumanResult {
  task_id: string;
  status: 'approved' | 'denied' | 'correction';
  data?: { input?: string; changes?: any };
}

export interface HumanProvider {
  onTask(task: HumanTask): Promise<void>;
  onResult(result: HumanResult): void;
}

export const humanDef: CapabilityDef = {
  id: HUMAN_ASSIST_CAPABILITY,
  name: 'Human Assist',
  description: 'Human-in-the-loop interventions (CAPTCHA, approval, correction)',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${HUMAN_ASSIST_CAPABILITY} not registered`);
  },
};
