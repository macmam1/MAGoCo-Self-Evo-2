/**
 * Skill Capture provider — `magoco.skill.capture` (Phase 3.7).
 *
 * Records successful user interaction sequences and makes them
 * retrievable for future automation.
 */

import type { SkillProvider, Skill } from '../../core/src/capabilities/skill-capture.js';
import { randomUUID } from 'node:crypto';

export function createSkillCaptureProvider(): SkillProvider {
  const store = new Map<string, Skill>();

  return {
    async record(task: string, sequence: Skill['sequence']): Promise<string> {
      const id = randomUUID();
      const skill: Skill = {
        id,
        name: task,
        trigger: { pattern: task.toLowerCase(), context: '' },
        sequence,
        createdAt: Date.now(),
        usageCount: 0,
      };
      store.set(id, skill);
      return id;
    },

    async find(task: string): Promise<Skill[]> {
      const q = task.toLowerCase();
      return [...store.values()].filter(s =>
        s.trigger.pattern.includes(q) || q.includes(s.trigger.pattern)
      );
    },

    async execute(skillId: string): Promise<void> {
      const skill = store.get(skillId);
      if (!skill) throw new Error(`skill ${skillId} not found`);
      skill.usageCount++;
      // Execution is delegated to the browser provider at runtime;
      // this provider only owns storage + retrieval.
    },
  };
}
