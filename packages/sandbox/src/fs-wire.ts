/**
 * Wire bridge between the `magoco.fs.*` capability and a WebSocket client.
 *
 * Routes a parsed `FsCommand` frame to the capability and turns the result
 * into `FsFrame` replies. Every failure mode — an unsafe path, a missing file,
 * a budget overrun — becomes one `fs_error` frame with a stable `code`. The UI
 * never has to guess; a missing file and a traversal refusal are distinguishable.
 */

import type { FileSystemCapability } from '../../core/src/capabilities/fs.js';
import type { FsCommand, FsFrame } from './fs-protocol.js';

/** Map an thrown error's `code` onto the contract's vocabulary. */
function errCode(e: unknown): string {
  const code = (e as NodeJS.ErrnoException)?.code;
  if (typeof code === 'string' && code.startsWith('E_')) return code;
  if (code === 'ENOENT') return 'E_NOT_FOUND';
  if (code === 'EACCES') return 'E_PERMISSION';
  return 'E_INTERNAL';
}

export function handleFsCommand(
  fs: FileSystemCapability,
  cmd: FsCommand,
  reply: (f: FsFrame) => void,
  // Fire-and-forget change broadcasts: when the watcher fires, the server
  // pushes this to every client on the socket. It is a function, not a
  // callback field, so a caller that wants no broadcasts passes a no-op.
  broadcast?: (f: FsFrame) => void,
): void {
  switch (cmd.t) {
    case 'fs_init':
      reply({ t: 'fs_ready', root: fs.root });
      break;
    case 'fs_list':
      void fs.list(cmd.path, { includeFiles: cmd.includeFiles ?? true }).then(
        (entries) =>
          reply({ t: 'fs_entries', path: cmd.path, entries }),
        (e) =>
          reply({
            t: 'fs_error',
            path: cmd.path,
            code: errCode(e),
            message: String((e as Error).message ?? e),
          }),
      );
      break;
    case 'fs_list_tree':
      void fs.listTree(cmd.path, { includeFiles: cmd.includeFiles ?? true }).then(
        (entries) =>
          reply({ t: 'fs_entries', path: cmd.path, entries }),
        (e) =>
          reply({
            t: 'fs_error',
            path: cmd.path,
            code: errCode(e),
            message: String((e as Error).message ?? e),
          }),
      );
      break;
    case 'fs_read':
      void fs.read(cmd.path, { binary: cmd.binary ?? false }).then(
        (r) => {
          if (r.encoding === 'utf-8') {
            reply({ t: 'fs_content', path: cmd.path, text: r.text ?? '', bytes: r.bytes, encoding: 'utf-8' });
          } else {
            reply({ t: 'fs_content', path: cmd.path, base64: r.base64 ?? '', bytes: r.bytes, encoding: 'base64' });
          }
        },
        (e) =>
          reply({
            t: 'fs_error',
            path: cmd.path,
            code: errCode(e),
            message: String((e as Error).message ?? e),
          }),
      );
      break;
    case 'fs_write':
      void fs
        .write(
          cmd.path,
          cmd.base64 ? Buffer.from(cmd.content, 'base64') : cmd.content,
          { failIfExists: cmd.failIfExists ?? false },
        )
        .then(
          () => reply({ t: 'fs_written', path: cmd.path }),
          (e) =>
            reply({
              t: 'fs_error',
              path: cmd.path,
              code: errCode(e),
              message: String((e as Error).message ?? e),
            }),
        );
      break;
    case 'fs_remove':
      void fs.remove(cmd.path).then(
        () => reply({ t: 'fs_removed', path: cmd.path }),
        (e) =>
          reply({
            t: 'fs_error',
            path: cmd.path,
            code: errCode(e),
            message: String((e as Error).message ?? e),
          }),
      );
      break;
    default: {
      // An unknown frame must be answered, never dropped: a silent gap turns
      // into a hung UI that is much harder to diagnose than a refused frame.
      const c = (cmd as { t?: string }).t ?? 'unknown';
      reply({
        t: 'fs_error',
        code: 'E_BAD_FRAME',
        message: `unknown fs frame: ${c}`,
      });
    }
  }
}

/** Attach the change watcher to the broadcast channel. Returns a stop fn. */
export function attachFsWatcher(
  fs: FileSystemCapability,
  broadcast: (f: FsFrame) => void,
): () => void {
  return fs.watch((e) => {
    broadcast({ t: 'fs_changed', path: e.path, kind: e.kind });
  });
}
