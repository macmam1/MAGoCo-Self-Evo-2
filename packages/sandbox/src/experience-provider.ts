/**
 * Experience provider — ENFORCED capture & injection.
 */

import type { ExperienceProvider } from '../../core/src/capabilities/experience.js';
import { MemoryExperienceStore, captureBrowserExperience, injectExperience } from './experience.js';

let store: MemoryExperienceStore | null = null;

function getStore(): MemoryExperienceStore {
  if (!store) {
    store = new MemoryExperienceStore();
  }
  return store;
}

/**
 * ENFORCED: capture experience AFTER agent action.
 */
export async function captureAction(
  context: string,
  action: string,
  outcome: string,
  metadata: Record<string, any>
): Promise<string> {
  const id = await captureBrowserExperience(getStore(), context, action, outcome, metadata);
  console.log('✓ Experience captured:', id);
  return id;
}

/**
 * ENFORCED: inject experience BEFORE agent decision.
 */
export async function getPriorExperience(task: string, topK = 5): Promise<string[]> {
  const exps = await injectExperience(getStore(), task, topK);
  console.log(`✓ Injected ${exps.length} prior experiences`);
  return exps as unknown as string[];
}

/**
 * ENFORCED: reflect AFTER task completion.
 */
export async function reflectOnTask(taskId: string, success: boolean, details: string): Promise<void> {
  await getStore().reflect(taskId, success, details);
  console.log('✓ Reflection complete');
}

/**
 * ENFORCED wrapper for agent decision-making.
 * Injects experience BEFORE calling agent, captures AFTER.
 */
export async function withExperience<T>(
  task: string,
  action: () => Promise<T>,
  context: string
): Promise<{ result: T; experienceId: string; priorExperiences: string[] }> {
  // ENFORCED: get prior experiences BEFORE action
  const priorExps = await getPriorExperience(task);
  
  // Execute action
  const result = await action();
  
  // ENFORCED: capture experience AFTER action
  const expId = await captureAction(
    context,
    task,
    'completed',
    { priorExperiences: priorExps.length }
  );
  
  return { result, experienceId: expId, priorExperiences: priorExps };
}

export function createExperienceProvider(): ExperienceProvider {
  return {
    capture: captureAction,
    inject: getPriorExperience,
    reflect: reflectOnTask,
  };
}
