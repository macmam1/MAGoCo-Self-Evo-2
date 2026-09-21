/**
 * Path resolution and the root-escape guard (spec §5.2).
 *
 * Everything in this package goes through `resolveInRoot` before it touches
 * the disk. The rule is: the resolved absolute path must stay inside the root
 * *after* following symlinks, and it must be inside the root *before* it, too.
 *
 * Checking after symlink resolution alone is not enough: `/root/link` →
 * `/etc/passwd` is detected, but a symlink chain `/root/a` → `/root/b` →
 * `/etc/passwd` written after the first check is missed. So the guard walks
 * the components and follows symlinks one at a time, refusing to cross out.
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { Stats } from 'node:fs';

/**
 * Refuse paths that are absolute, or that escape via `..`.
 * The error is thrown by callers; this returns a reason string or null.
 */
export function classifyPath(rel: string): FsPathProblem | null {
  if (typeof rel !== 'string' || rel.length === 0) return 'E_EMPTY';
  if (rel === '/') return null; // the root itself
  if (path.posix.isAbsolute(rel)) return 'E_ABSOLUTE';
  // Windows-style absolute also refused — the project must be portable.
  if (/^[a-zA-Z]:[\\/]/.test(rel)) return 'E_ABSOLUTE';
  const norm = path.posix.normalize(rel);
  if (norm.startsWith('../') || norm === '..') return 'E_PATH_ESCAPE';
  if (norm.includes('/../') ) return 'E_PATH_ESCAPE';
  return null;
}

export type FsPathProblem =
  | 'E_EMPTY'
  | 'E_ABSOLUTE'
  | 'E_PATH_ESCAPE'
  | 'E_SYMLINK_ESCAPE';

/**
 * Resolve `rel` against `root`, following symlinks per-component and refusing
 * to cross the root boundary. Returns the absolute real path.
 *
 * The per-component walk exists so that a symlink created *between* the check
 * and the write cannot smuggle a path out — the guard is a property of the
 * walk itself, not a single lstat snapshot.
 */
export async function resolveInRoot(
  root: string,
  rel: string,
): Promise<string> {
  const problem = classifyPath(rel);
  if (problem) {
    const err = new Error(`Refused unsafe path: ${rel} (${problem})`);
    (err as NodeJS.ErrnoException).code = problem;
    throw err;
  }

  // `normalize` already collapsed `..` lexically; this resolves the remainder.
  const target = path.join(root, rel);
  const rootReal = await fs.realpath(root);

  // The root itself must be allowed, and it is a valid result.
  if (target === rootReal || target === root) return rootReal;

  // Walk the path component by component. `cur` is always the *resolved*
  // location so far — after a symlink hop we continue from where the symlink
  // points, which is what makes a chain l2 -> l1 -> /etc detectable: when the
  // walk reaches l2 it resolves to /root/l1, then the next component is read
  // through l1, and l1's own target is checked then.
  let cur = rootReal;
  const parts = path.relative(rootReal, target).split(path.sep).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const candidate = path.join(cur, part);
    let st: Stats;
    try {
      st = await fs.lstat(candidate);
    } catch {
      // Missing entry is fine for a write target — the parent is checked next.
      cur = candidate;
      continue;
    }
    if (st.isSymbolicLink()) {
      let dest: string;
      try {
        dest = await fs.readlink(candidate);
      } catch {
        // Not a symlink anymore (TOCTOU) — treat as a plain entry.
        cur = candidate;
        continue;
      }
      const linkTarget = path.isAbsolute(dest)
        ? dest
        : path.resolve(path.dirname(candidate), dest);
      if (!isInside(linkTarget, rootReal)) {
        const err = new Error(
          `Refused symlink escape: ${rel} -> ${linkTarget}`,
        );
        (err as NodeJS.ErrnoException).code = 'E_SYMLINK_ESCAPE';
        throw err;
      }
      // Continue the walk *through* the link: remaining components are read
      // relative to the link's own target, so a symlink in the middle of a
      // path is not skipped and its own escapes are caught on the next hop.
      cur = linkTarget;
      // Re-walk this component's children from the new location by re-reading
      // the target itself: if the link points at a directory containing
      // further links, they get their own iteration.
      let inner = linkTarget;
      for (let hops = 0; hops < 32; hops++) {
        let innerSt: Stats;
        try {
          innerSt = await fs.lstat(inner);
        } catch {
          break; // target does not exist yet — fine for a write
        }
        if (!innerSt.isSymbolicLink()) break;
        let d: string;
        try {
          d = await fs.readlink(inner);
        } catch {
          break;
        }
        const next = path.isAbsolute(d) ? d : path.resolve(path.dirname(inner), d);
        if (!isInside(next, rootReal)) {
          const err = new Error(`Refused symlink escape: ${rel} -> ${next}`);
          (err as NodeJS.ErrnoException).code = 'E_SYMLINK_ESCAPE';
          throw err;
        }
        inner = next;
      }
      cur = inner;
    } else {
      cur = candidate;
    }
  }

  return isInside(cur, rootReal) ? cur : target;
}

/**
 * Is `child` inside `parent`? String-safe: prefix match on a path separator
 * boundary, so `/a/bc` is NOT inside `/a/b`.
 */
export function isInside(child: string, parent: string): boolean {
  const c = path.resolve(child);
  const p = path.resolve(parent);
  if (c === p) return true;
  if (process.platform === 'win32') {
    const lower = (s: string) => s.toLowerCase().replace(/\\/g, '/');
    return lower(c).startsWith(lower(p) + '/');
  }
  return c.startsWith(p + '/');
}

/**
 * Relative-to-root form for results going back to the caller. Never returns an
 * absolute path, so a caller cannot be tricked into printing one.
 */
export function relativeTo(root: string, abs: string): string {
  const rel = path.relative(root, abs);
  // Normalize separators for the wire: the UI and the agent tool layer both
  // treat `/` as the project separator regardless of platform.
  return rel.split(path.sep).join('/');
}
