/**
 * Root watcher — dependency-free, recursive-ish (spec §6.3).
 *
 * Node's `fs.watch` is not recursive on Linux. We poll the tree instead: every
 * `intervalMs` we walk the root, hash (path,size,mtime) into a set, and diff
 * against the previous snapshot. Changed/added/removed entries produce events.
 *
 * Why not a native recursive watcher (chokidar, nsfw)? Phase 2's rule applies
 * here too: one dependency is one thing that can break on a user's machine,
 * and a polling watcher is ~40 lines and correct on every platform. The
 * project trees this phase handles are small (source, not node_modules — the
 * root's own node_modules is excluded from the walk, see below).
 *
 * Why not `fs.watch` per-directory? Directory churn (git operations, `mv`)
 * leaves dangling watchers and duplicated events; polling degrades to the
 * same latency with none of the bookkeeping.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export type WatchKind = 'create' | 'modify' | 'delete';

interface Snapshot {
  readonly path: string;
  readonly size: number;
  readonly mtime: number;
  readonly dir: boolean;
}

/**
 * Watch `root` and call `cb` for every change. Returns a stop function; the
 * caller must call it on close (the capability's `close()` does).
 */
export function watch(
  root: string,
  cb: (kind: WatchKind, abs: string) => void,
  opts: { intervalMs?: number } = {},
): () => void {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let prev: Snapshot[] = [];

  // Excluded always — big, noisy, and never edited by hand.
  const EXCLUDE = new Set(['node_modules', '.git', '.cache', 'dist']);

  const snapshot = async (): Promise<Snapshot[]> => {
    const out: Snapshot[] = [];
    const stack: string[] = [root];
    while (stack.length) {
      const cur = stack.pop();
      if (!cur) continue;
      let entries: import('node:fs').Dirent[];
      try {
        entries = await fs.readdir(cur, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const de of entries) {
        if (EXCLUDE.has(de.name)) continue;
        const abs = path.join(cur, de.name);
        try {
          const st = await fs.stat(abs);
          out.push({
            path: abs,
            size: st.size,
            mtime: st.mtimeMs,
            dir: st.isDirectory(),
          });
          if (st.isDirectory()) stack.push(abs);
        } catch {
          /* raced away — skip this tick */
        }
      }
    }
    return out;
  };

  const tick = async () => {
    if (stopped) return;
    let next: Snapshot[];
    try {
      next = await snapshot();
    } catch {
      return;
    }
    const prevMap = new Map(prev.map((s) => [s.path, s]));
    const nextMap = new Map(next.map((s) => [s.path, s]));
    for (const [p, s] of nextMap) {
      const old = prevMap.get(p);
      if (!old) cb('create', p);
      else if (old.size !== s.size || old.mtime !== s.mtime) cb('modify', p);
    }
    for (const p of prevMap.keys()) if (!nextMap.has(p)) cb('delete', p);
    prev = next;
    if (!stopped) timer = setTimeout(tick, opts.intervalMs ?? 500) as NodeJS.Timeout;
  };

  void tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
