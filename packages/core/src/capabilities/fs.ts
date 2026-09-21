/**
 * The filesystem capability — `magoco.fs.*`.
 *
 * A "project root" is a directory the framework is permitted to touch, scoped
 * to a session, created under a configurable base. Everything the editor, the
 * terminal and the sandbox write lands here — nothing escapes it (see
 * paths.ts and the `E_*` error codes).
 *
 * The contract lives in core so both `@magoco/sandbox` (the provider) and
 * `@magoco/web`/`@magoco/ui` (the consumers) agree on it without importing
 * each other. Same rule as `magoco.web.serve`.
 */

/** Refusal reasons. These are part of the contract, not debugging detail. */
export type FsError =
  /** A path resolved outside the project root (or to a symlink pointing out). */
  | 'E_PATH_ESCAPE'
  | 'E_SYMLINK_ESCAPE'
  | 'E_NOT_FOUND'
  | 'E_IS_DIRECTORY'
  | 'E_IS_FILE'
  | 'E_TOO_LARGE'
  | 'E_WRITE_OUTSIDE_ROOT';

export interface FsEntry {
  readonly path: string;
  readonly name: string;
  /** 'file' | 'dir' | 'symlink' */
  readonly kind: 'file' | 'dir' | 'symlink';
  /** Bytes, for files only. */
  readonly size?: number;
  /** mtime in ms epoch, for files only. */
  readonly mtime?: number;
}

export interface FsReadResult {
  /** Text, when the file was small and decodes as UTF-8. */
  readonly text?: string;
  /** Base64, when the caller asked for binary or the file is not UTF-8. */
  readonly base64?: string;
  readonly bytes: number;
  readonly encoding: 'utf-8' | 'base64';
}

export interface FsWriteOptions {
  /** Create missing parent directories (default true). */
  readonly createParents?: boolean;
  /** Fail if the file already exists (default false). */
  readonly failIfExists?: boolean;
}

export interface FsListOptions {
  /** Return files too, not just directories (default true). */
  readonly includeFiles?: boolean;
  /** Hard stop on entries beyond this (default 10000) — a giant tree must not hang the UI. */
  readonly maxEntries?: number;
}

export interface FsChangeEvent {
  readonly root: string;
  readonly path: string;
  readonly kind: 'create' | 'modify' | 'delete';
}

/**
 * The shape a `magoco.fs.*` provider implements. Returned by the capability
 * `create()`; consumers hold this handle and never construct one.
 *
 * All paths are relative to the root. Absolute paths and `..` are refused with
 * `E_PATH_ESCAPE` rather than being interpreted — silent interpretation is how
 * escapes happen.
 */
export interface FileSystemCapability {
  readonly root: string;

  read(path: string, opts?: { binary?: boolean }): Promise<FsReadResult>;
  write(path: string, content: string | Buffer, opts?: FsWriteOptions): Promise<void>;
  /** Non-recursive listing of one directory. */
  list(path: string, opts?: FsListOptions): Promise<readonly FsEntry[]>;
  /**
   * Recursive listing of a subtree, as a flat array. The UI renders lazily by
   * calling `list` per directory, but a programmatic consumer (the agent's
   * tool layer) wants the whole subtree at once.
   */
  listTree(path: string, opts?: FsListOptions): Promise<readonly FsEntry[]>;
  remove(path: string): Promise<void>;
  /** Subscribe to changes. Returns an unsubscribe function. */
  watch(listener: (e: FsChangeEvent) => void): () => void;
  /** Stop the watcher and release the root. Idempotent. */
  close(): Promise<void>;
}

export const FS_CAPABILITY = 'magoco.fs';

export const fsDef = {
  id: FS_CAPABILITY,
  name: 'Project filesystem',
  description:
    'A session-scoped project directory with read/write/list/watch. ' +
    'Paths outside the root are refused, never interpreted. ' +
    'Tier-1 isolation only — no network, no access to other sessions.',
  version: '1.0.0',
  create: () => {
    throw new Error(
      'magoco.fs requires the @magoco/sandbox package; it is created by ' +
        'the sandbox plugin, not by the bare def',
    );
  },
} as const;
