/**
 * Edit provider — uses Node fs module for atomic writes.
 */

import { mkdirSync, renameSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { EditRequest, EditResponse, EditResult } from '../../core/src/capabilities/edit.js';

function safeWrite(path: string, content: string): EditResult {
  try {
    // Create directory if needed
    const dir = path.substring(0, path.lastIndexOf('/'));
    if (dir) mkdirSync(dir, { recursive: true });

    // Write to temp file first (atomic)
    const tmp = join(tmpdir(), randomUUID());
    writeFileSync(tmp, content, 'utf-8');

    // Atomic rename
    renameSync(tmp, path);

    return { path, success: true };
  } catch (e) {
    return { path, success: false, error: (e as Error).message };
  }
}

export function createEditProvider(): { edit(request: EditRequest): Promise<EditResponse> } {
  return {
    async edit(request: EditRequest): Promise<EditResponse> {
      const results = request.files.map((file) => safeWrite(file.path, file.content));
      return { results };
    },
  };
}
