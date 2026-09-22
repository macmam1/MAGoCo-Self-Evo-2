/**
 * Edit capability — `magoco.fs.edit` (Phase 3, spec §4.1).
 */

import type { CapabilityDef } from './types.js';

export const EDIT_CAPABILITY = 'magoco.fs.edit' as const;

export interface EditFile {
  readonly path: string;
  readonly content: string;
}

export interface EditRequest {
  readonly files: readonly EditFile[];
}

export interface EditResult {
  readonly path: string;
  readonly success: boolean;
  readonly error?: string;
}

export interface EditResponse {
  readonly results: readonly EditResult[];
}

export interface EditProvider {
  edit(request: EditRequest): Promise<EditResponse>;
}

export const editDef: CapabilityDef = {
  id: EDIT_CAPABILITY,
  name: 'File Edit',
  description: 'Atomic multi-file editing',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${EDIT_CAPABILITY} not registered`);
  },
};
