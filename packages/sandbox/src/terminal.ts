/**
 * Terminal sandbox provider — uses Node child_process with pipes.
 */

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { TermRequest, TermSession, TermSize } from '../../core/src/capabilities/terminal.js';

export function createTermProvider(): { start(request: TermRequest): TermSession } {
  const sessions = new Map<string, TermSession>();

  return {
    start(request: TermRequest): TermSession {
      const id = randomUUID();
      const cmd = request.command || 'bash';
      const args = request.args || ['-i'];
      const env = request.env || { ...process.env, TERM: 'xterm-256color' };
      const size = request.size || { rows: 24, cols: 80 };

      const child = spawn(cmd, args, {
        env,
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const listeners = new Set<(data: string) => void>();

      const session: TermSession = {
        id,
        onOutput: (listener) => listeners.add(listener),
        onData: (data: string) => child.stdin.write(data),
        resize: (size: TermSize) => {
          // TIOCSWINSZ via ioctl would be better; this is a placeholder
          child.kill('SIGWINCH');
        },
        kill: () => {
          child.kill('SIGTERM');
        },
      };

      child.stdout.on('data', (chunk) => {
        const data = chunk.toString();
        for (const listener of listeners) listener(data);
      });

      child.stderr.on('data', (chunk) => {
        const data = chunk.toString();
        for (const listener of listeners) listener(data);
      });

      sessions.set(id, session);

      child.on('exit', () => {
        sessions.delete(id);
      });

      return session;
    },
  };
}
