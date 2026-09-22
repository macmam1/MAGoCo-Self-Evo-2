/**
 * Skill Capture — `magoco.skill.capture` (Phase 3.7).
 *
 * Automatically learns from successful user interactions and creates reusable skills.
 */

import type { CapabilityDef } from './types.js';

export const SKILL_CAPTURE_CAPABILITY = 'magoco.skill.capture' as const;

export interface Skill {
  id: string;
  name: string;
  trigger: {
    pattern: string;
    context: string;
  };
  sequence: Array<{
    action: string;
    selector: string;
    payload: Record<string, any>;
  }>;
  createdAt: number;
  usageCount: number;
}

export interface SkillProvider {
  /**
   * Record a successful user interaction as a skill.
   */
  record(task: string, sequence: Skill['sequence']): Promise<string>;
  
  /**
   * Find matching skills for a given task.
   */
  find(task: string): Promise<Skill[]>;
  
  /**
   * Execute a skill.
   */
  execute(skillId: string): Promise<void>;
}

export const skillCaptureDef: CapabilityDef = {
  id: SKILL_CAPTURE_CAPABILITY,
  name: 'Skill Capture',
  description: 'Learn from successful interactions and create reusable skills',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${SKILL_CAPTURE_CAPABILITY} not registered`);
  },
};
