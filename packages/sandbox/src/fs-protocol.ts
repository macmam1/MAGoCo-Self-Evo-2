/**
 * The `magoco.fs.*` frame vocabulary.
 *
 * This file is the ONLY coupling point between packages/sandbox and
 * packages/web for the filesystem surface. Both import it; neither imports
 * the other. A change here is a wire-protocol change and must be called out
 * in the commit message — same rule as protocol.ts for chat (spec §6.1).
 *
 * The UI never sees a filesystem handle. It sends FsCommand frames and renders
 * FsFrame replies. The server is the only thing that holds the root.
 */

// ---------------------------------------------------------------------------
// Commands: client → server
// ---------------------------------------------------------------------------

export type FsCommand =
  | { readonly t: 'fs_init' }
  | { readonly t: 'fs_list'; readonly path: string; readonly includeFiles?: boolean }
  | { readonly t: 'fs_list_tree'; readonly path: string; readonly includeFiles?: boolean }
  | { readonly t: 'fs_read'; readonly path: string; readonly binary?: boolean }
  | { readonly t: 'fs_write'; readonly path: string; readonly content: string; readonly base64?: boolean; readonly failIfExists?: boolean }
  | { readonly t: 'fs_remove'; readonly path: string };

// ---------------------------------------------------------------------------
// Replies: server → client
// ---------------------------------------------------------------------------

export interface FsEntryView {
  readonly path: string;
  readonly name: string;
  readonly kind: 'file' | 'dir' | 'symlink';
  readonly size?: number;
  readonly mtime?: number;
}

export type FsFrame =
  | { readonly t: 'fs_ready'; readonly root: string }
  | { readonly t: 'fs_entries'; readonly path: string; readonly entries: readonly FsEntryView[] }
  | { readonly t: 'fs_content'; readonly path: string; readonly text?: string; readonly base64?: string; readonly bytes: number; readonly encoding: 'utf-8' | 'base64' }
  | { readonly t: 'fs_written'; readonly path: string }
  | { readonly t: 'fs_removed'; readonly path: string }
  | { readonly t: 'fs_changed'; readonly path: string; readonly kind: 'create' | 'modify' | 'delete' }
  | { readonly t: 'fs_error'; readonly path?: string; readonly code: string; readonly message: string };

/** Runtime predicate for incoming frames. Rejects anything malformed loudly. */
export function isFsCommand(x: unknown): x is FsCommand {
  if (typeof x !== 'object' || x === null) return false;
  const cmd = x as Record<string, unknown>;
  const t = cmd['t'];
  switch (t) {
    case 'fs_init':
      return true;
    case 'fs_list':
    case 'fs_list_tree':
      return typeof cmd['path'] === 'string';
    case 'fs_read':
      return typeof cmd['path'] === 'string';
    case 'fs_write':
      return (
        typeof cmd['path'] === 'string' &&
        typeof cmd['content'] === 'string' &&
        (cmd['base64'] === undefined || typeof cmd['base64'] === 'boolean') &&
        (cmd['failIfExists'] === undefined || typeof cmd['failIfExists'] === 'boolean')
      );
    case 'fs_remove':
      return typeof cmd['path'] === 'string';
    default:
      return false;
  }
}
