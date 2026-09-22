/**
 * Human provider — registers the HITL channel.
 */

import type { HumanProvider, HumanTask, HumanResult } from '../../core/src/capabilities/human-assist.js';

/** No actual backend implementation yet; acts as a placeholder. */
export function createHumanProvider(): HumanProvider {
  return {
    async onTask(task: HumanTask): Promise<void> {
      // TODO: send task to UI over WS
      console.log('Human task requested:', task);
    },
    onResult(result: HumanResult): void {
      // TODO: process result from UI
      console.log('Human result received:', result);
    },
  };
}
