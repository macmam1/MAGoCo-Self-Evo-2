/**
 * Human Assist provider — `magoco.human.assist` (Phase 3.7).
 *
 * Suspends agent execution at critical points (captcha, approval, correction)
 * and waits for the user to resolve the task over WebSocket.
 */

import type { HumanProvider, HumanTask, HumanResult } from '../../core/src/capabilities/human-assist.js';

export function createHumanAssistProvider(): HumanProvider & {
  onResult(result: HumanResult): void;
  pending(): HumanTask | null;
} {
  let current: HumanTask | null = null;
  let resolver: ((r: HumanResult) => void) | null = null;

  return {
    /** Called by the agent to suspend and wait for user input. */
    async onTask(task: HumanTask): Promise<void> {
      current = task;
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          current = null;
          resolver = null;
          reject(new Error(`human task ${task.id} timed out after ${task.timeout}s`));
        }, task.timeout * 1000);

        resolver = (result: HumanResult) => {
          clearTimeout(timer);
          current = null;
          resolver = null;
          if (result.status === 'denied') {
            reject(new Error(`human task ${task.id} denied`));
          } else {
            resolve();
          }
        };
      });
    },

    /** Called by the WebSocket handler when a human/result frame arrives. */
    onResult(result: HumanResult): void {
      resolver?.(result);
    },

    /** The currently pending task, or null. */
    pending(): HumanTask | null {
      return current;
    },
  };
}
