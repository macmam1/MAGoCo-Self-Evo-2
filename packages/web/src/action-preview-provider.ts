/**
 * Action Preview provider — `magoco.preview` extended for Phase 3.7.
 *
 * Before executing any irreversible browser action, the agent calls
 * `requestApproval`. The provider suspends and sends an `action/preview`
 * frame to the client; the user approves or denies via `action/response`.
 */

import type { PreviewProvider, PreviewConfig, PreviewState } from '../../core/src/capabilities/preview.js';

export interface ActionPreviewRequest {
  id: string;
  action: {
    type: 'click' | 'type' | 'submit' | 'navigate' | 'delete';
    description: string;   // human-readable summary shown in the UI
    selector?: string;
    value?: string;
    url?: string;
  };
  /** ms to wait before auto-deny; default 30000 */
  timeout?: number;
}

export interface ActionPreviewResponse {
  id: string;
  approved: boolean;
  correction?: string;
}

type SendFn = (frame: object) => void;

export function createActionPreviewProvider(send: SendFn): {
  requestApproval(req: ActionPreviewRequest): Promise<void>;
  onResponse(res: ActionPreviewResponse): void;
} {
  const pending = new Map<string, {
    resolve: () => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();

  return {
    async requestApproval(req: ActionPreviewRequest): Promise<void> {
      const timeout = req.timeout ?? 30_000;
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(req.id);
          reject(new Error(`action preview ${req.id} timed out`));
        }, timeout);
        pending.set(req.id, { resolve, reject, timer });
        send({ t: 'action/preview', ...req });
      });
    },

    onResponse(res: ActionPreviewResponse): void {
      const p = pending.get(res.id);
      if (!p) return;
      clearTimeout(p.timer);
      pending.delete(res.id);
      if (res.approved) {
        p.resolve();
      } else {
        p.reject(new Error(`action denied by user${res.correction ? ': ' + res.correction : ''}`));
      }
    },
  };
}
