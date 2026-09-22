/**
 * Skill Capture provider.
 */

import type { Skill, SkillProvider } from '../../core/src/capabilities/skill-capture.js';

let skills: Map<string, Skill> = new Map();

function generateId(): string {
  return `skill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Record a successful user interaction as a skill.
 */
export async function recordSkill(task: string, sequence: Skill['sequence']): Promise<string> {
  const id = generateId();
  const skill: Skill = {
    id,
    name: `skill_${task.replace(/[^a-z]/gi, '_')}`,
    trigger: {
      pattern: task,
      context: 'browser_interaction',
    },
    sequence,
    createdAt: Date.now(),
    usageCount: 0,
  };
  
  skills.set(id, skill);
  console.log('✓ Skill recorded:', id, '=', skill.name);
  return id;
}

/**
 * Find matching skills for a given task.
 */
export async function findSkills(task: string): Promise<Skill[]> {
  const results = Array.from(skills.values()).filter(s => 
    task.toLowerCase().includes(s.trigger.pattern.toLowerCase()) ||
    s.trigger.pattern.toLowerCase().includes(task.toLowerCase())
  );
  
  // Sort by relevance (usage count + recency)
  return results.sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Execute a skill.
 */
export async function executeSkill(skillId: string): Promise<void> {
  const skill = skills.get(skillId);
  if (!skill) {
    throw new Error(`Skill ${skillId} not found`);
  }
  
  console.log('✓ Executing skill:', skill.name);
  
  // Update usage count
  skill.usageCount += 1;
  
  // TODO: Actually execute the sequence in the browser
  // This would interact with the browser DOM via Playwright
  for (const step of skill.sequence) {
    console.log(`  - ${step.action} on ${step.selector}`);
    // await browser[step.action](step.selector, step.payload);
  }
}

/**
 * Get all recorded skills.
 */
export async function getAllSkills(): Promise<Skill[]> {
  return Array.from(skills.values());
}

export function createSkillProvider(): SkillProvider {
  return {
    record: recordSkill,
    find: findSkills,
    execute: executeSkill,
  };
}
