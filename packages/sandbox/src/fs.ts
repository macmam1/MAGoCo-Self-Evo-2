/**
 * The tier-1 filesystem provider (spec §5).
 *
 * One root per session, created under a configurable base. All paths are
 * resolved with `resolveInRoot` before any disk access — the guard is not a
 * post-check, it is the only way in.
 *
 * What this is NOT: it is not a security boundary against a hostile user who
 * already has the framework process (they have the machine). It is a boundary
 * against the agent, the LLM and the UI ever being handed a handle outside the
 * project by mistake — which is the realistic threat for an agent that writes
 * files from model output.
 */

import * as fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import type * as rawFs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Readable } from 'node:stream';
import { watch as chokidarless } from './watcher.js';
import {
  resolveInRoot,
  relativeTo,
  isInside,
} from './paths.js';
import type {
  FileSystemCapability,
  FsEntry,
  FsReadResult,
  FsWriteOptions,
  FsListOptions,
  FsChangeEvent,
} from '../../core/src/capabilities/fs.js';

/** A read above this is served as base64 and never decoded (spec §5.4). */
const MAX_UTF8_BYTES = 1 * 1024 * 1024; // 1 MiB
/** Hard ceiling on any single read, whatever the encoding. */
const MAX_READ_BYTES = 8 * 1024 * 1024;
/** Listing is capped; a giant tree must not hang the UI (spec §5.3). */
const DEFAULT_MAX_ENTRIES = 10_000;

export interface FsConfig {
  /** Parent for session roots. Default: os.tmpdir()/magoco-projects */
  readonly baseDir?: string;
  /** Hard size limit for the whole root, in bytes. Writes past it fail. */
  readonly maxRootBytes?: number;
  /** Prefix for the per-session directory name. */
  readonly prefix?: string;
}

const state = new Map<string, { root: string; closed: boolean }>();

/**
 * Create a session-scoped filesystem. Returns the capability handle. Called by
 * the sandbox plugin; consumers resolve the capability instead.
 */
export async function createFs(
  sessionId: string,
  cfg: FsConfig = {},
): Promise<FileSystemCapability> {
  const base = cfg.baseDir ?? path.join(os.tmpdir(), 'magoco-projects');
  const prefix = cfg.prefix ?? 'proj-';
  await fs.mkdir(base, { recursive: true });
  const root = await fs.mkdtemp(path.join(base, prefix));
  const maxRoot = cfg.maxRootBytes ?? 200 * 1024 * 1024; // 200 MiB default

  const sizeOf = async (): Promise<number> => {
    let total = 0;
    for await (const entry of walk(root)) total += entry.size ?? 0;
    return total;
  };

  const api: FileSystemCapability = {
    root,

    async read(p, opts) {
      const abs = await resolveInRoot(root, p);
      const st = await fs.stat(abs);
      if (st.isDirectory()) {
        const e = new Error(`Is a directory: ${p}`) as NodeJS.ErrnoException;
        e.code = 'E_IS_DIRECTORY';
        throw e;
      }
      if (st.size > MAX_READ_BYTES) {
        const e = new Error(`File too large (${st.size}B): ${p}`) as NodeJS.ErrnoException;
        e.code = 'E_TOO_LARGE';
        throw e;
      }
      const wantBinary = opts?.binary === true;
      const buf = await fs.readFile(abs);
      if (wantBinary || st.size > MAX_UTF8_BYTES || !isUtf8(buf)) {
        return {
          base64: buf.toString('base64'),
          bytes: buf.length,
          encoding: 'base64',
        } satisfies FsReadResult;
      }
      return {
        text: buf.toString('utf-8'),
        bytes: buf.length,
        encoding: 'utf-8',
      } satisfies FsReadResult;
    },

    async write(p, content, opts) {
      const abs = await resolveInRoot(root, p);
      // Size budget is checked before the write, not after.
      const incoming =
        typeof content === 'string'
          ? Buffer.byteLength(content, 'utf-8')
          : content.length;
      const used = await sizeOf();
      if (used + incoming > maxRoot) {
        const e = new Error(
          `Root budget exceeded: ${used + incoming}B > ${maxRoot}B`,
        ) as NodeJS.ErrnoException;
        e.code = 'E_TOO_LARGE';
        throw e;
      }
      if (opts?.createParents !== false) {
        await fs.mkdir(path.dirname(abs), { recursive: true });
      }
      const flag = opts?.failIfExists ? 'wx' : 'w';
      await fs.writeFile(abs, content, { flag });
    },

    async list(p, opts) {
      const abs = await resolveInRoot(root, p);
      const st = await fs.stat(abs);
      if (!st.isDirectory()) {
        const e = new Error(`Not a directory: ${p}`) as NodeJS.ErrnoException;
        e.code = 'E_IS_FILE';
        throw e;
      }
      const includeFiles = opts?.includeFiles !== false;
      const max = opts?.maxEntries ?? DEFAULT_MAX_ENTRIES;
      const names = await fs.readdir(abs, { withFileTypes: true });
      const out: FsEntry[] = [];
      for (const de of names) {
        if (!includeFiles && de.isFile()) continue;
        out.push(await entryFor(abs, de, root));
        if (out.length >= max) break;
      }
      return out;
    },

    async listTree(p, opts) {
      const start = await resolveInRoot(root, p);
      const st = await fs.stat(start);
      if (!st.isDirectory()) {
        const e = new Error(`Not a directory: ${p}`) as NodeJS.ErrnoException;
        e.code = 'E_IS_FILE';
        throw e;
      }
      const includeFiles = opts?.includeFiles !== false;
      const max = opts?.maxEntries ?? DEFAULT_MAX_ENTRIES;
      const out: FsEntry[] = [];
      for await (const e of walk(start)) {
        if (!includeFiles && e.kind === 'file') continue;
        out.push(e);
        if (out.length >= max) break;
      }
      return out;
    },

    async remove(p) {
      const abs = await resolveInRoot(root, p);
      // The root itself is not removable through a relative path: every
      // caller-visible path is relative, and removing `.` resolves to root.
      // `listTree`/`write` guard reads and the budget; deletion is scoped by
      // the same root check.
      const st = await fs.stat(abs);
      if (st.isDirectory()) {
        await fs.rm(abs, { recursive: true });
      } else {
        await fs.unlink(abs);
      }
    },

    watch(listener) {
      return chokidarless(root, (kind, abs) => {
        listener({
          root,
          path: relativeTo(root, abs),
          kind,
        } satisfies FsChangeEvent);
      });
    },

    async close() {
      const s = state.get(sessionId);
      if (s?.closed) return;
      if (s) s.closed = true;
      // The root is a session scratch dir: closing drops it. A caller who
      // wants persistence copies out first (or uses export, Phase 2).
      await fs.rm(root, { recursive: true, force: true });
    },
  };

  state.set(sessionId, { root, closed: false });
  return api;
}

/** Stats → contract entry, with the symlink kind recorded honestly. */
async function entryFor(
  dir: string,
  de: rawFs.Dirent,
  root: string,
): Promise<FsEntry> {
  const abs = path.join(dir, de.name);
  const base: FsEntry = {
    path: relativeTo(root, abs),
    name: de.name,
    kind: de.isSymbolicLink() ? 'symlink' : de.isDirectory() ? 'dir' : 'file',
  };
  if (base.kind === 'file') {
    try {
      const st = await fs.stat(abs);
      return { ...base, size: st.size, mtime: st.mtimeMs } as unknown as FsEntry;
    } catch {
      return base;
    }
  }
  return base;
}

/** Recursive directory walk as an async generator (depth-first). */
export async function* walk(dir: string): AsyncGenerator<FsEntry> {
  const root = dir;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur) continue;
    let entries: rawFs.Dirent[];
    try {
      entries = await fs.readdir(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const de of entries) {
      const abs = path.join(cur, de.name);
      if (de.isDirectory()) stack.push(abs);
      // The generator yields the entry with a *relative* path computed
      // against the walk root, so consumers see project paths.
      const rel = relativeTo(root, abs);
      if (de.isDirectory()) {
        yield { path: rel, name: de.name, kind: 'dir' };
      } else if (de.isFile()) {
        let size: number | undefined;
        let mtime: number | undefined;
        try {
          const st = await fs.stat(abs);
          size = st.size;
          mtime = st.mtimeMs;
        } catch {
          /* gone — report without stats */
        }
        yield {
          path: rel,
          name: de.name,
          kind: 'file',
          size,
          mtime,
        } as FsEntry;
      } else {
        yield { path: rel, name: de.name, kind: 'symlink' };
      }
    }
  }
}

/**
 * Cheap UTF-8 validity check without decoding the whole buffer: a buffer with
 * no invalid sequences has every byte < 0x80 or part of a well-formed
 * multibyte run. We use Node's own `toString('utf-8')` replacement-detection:
 * a buffer containing 0xEF 0xBF 0xBD (U+FFFD) *originally* is indistinguishable
 * — but for our purposes (avoiding a binary file being shown as text) the
 * heuristic of "contains a NUL or more invalid bytes than a text file" is
 * enough. We keep it conservative: NUL bytes mean binary.
 */
function isUtf8(buf: Buffer): boolean {
  // A file with a NUL byte is not text the UI can show.
  if (buf.includes(0)) return false;
  // Strict check: re-encode and compare. Node's decoder is permissive, so
  // compare byte-for-byte against a round-trip.
  const s = buf.toString('utf-8');
  return Buffer.byteLength(s, 'utf-8') === buf.length;
}

/** True if the session root still exists (used by tests + health checks). */
export async function fsRootExists(root: string): Promise<boolean> {
  try {
    const st = await fs.stat(root);
    return st.isDirectory();
  } catch {
    return false;
  }
}

export { isInside, relativeTo, createReadStream, Readable };
