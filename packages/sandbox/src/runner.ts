import { mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

import type { ExitInfo, RunHandle, RunLanguage, RunLimits, RunRequest } from '../../core/src/capabilities/code.js';

/** The languages Phase 3 ships. Adding one is an entry here + a test. */
interface Adapter {
  readonly interpreters: readonly string[];
  argv(script: string, limits: RunLimits): string[];
  readonly filename: string;
}

const ADAPTERS: Record<RunLanguage, Adapter> = {
  js: {
    interpreters: [process.execPath],
    argv: (script, limits) => [`--max-old-space-size=${Math.max(1, limits.memoryMB)}`, script],
    filename: 'run.mjs',
  },
  py: {
    interpreters: ['/usr/bin/python3', '/usr/bin/python'],
    argv: (script) => [script],
    filename: 'run.py',
  },
};

function extOf(file: string): RunLanguage {
  return file.endsWith('.py') ? 'py' : 'js';
}

export function resolveInterpreter(lang: RunLanguage): string | Error {
  const a = ADAPTERS[lang];
  if (!a) return new Error(`unknown language: ${lang}`);
  return a.interpreters[0];
}

function rlimitPrelude(limits: RunLimits, lang: RunLanguage): string {
  const parts: string[] = [];
  if (limits.cpuMs > 0) parts.push(`-t ${Math.ceil(limits.cpuMs / 1000)}`);
  if (limits.memoryMB > 0 && lang === 'py') parts.push(`-v ${limits.memoryMB * 1024}`);
  if (parts.length === 0) return 'exec "$0" "$@"';
  return `ulimit ${parts.join(' ')}; exec "$0" "$@"`;
}

export function sandboxEnv(root: string): Record<string, string> {
  const env = {
    PATH: '/usr/local/bin:/usr/bin:/bin',
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    HOME: root,
  };
  return env;
}

export function runCode(root: string, request: RunRequest, limits: RunLimits): RunHandle {
  const runId = randomUUID();
  const lang = request.language ?? (request.path ? extOf(request.path) : 'js');
  const adapter = ADAPTERS[lang];
  if (!adapter) {
      return failed(runId, `unknown language: ${String(lang)}`);
  }

  const found = resolveInterpreter(lang);
  if (found instanceof Error) {
      return failed(runId, found.message);
  }
  const interpreter: string = found;

  let source = request.source ?? '';
  if (!request.source && request.path) {
    const resolved = path.join(root, request.path);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      return failed(runId, `path escapes root: ${request.path}`);
    }
    try {
      source = readFileSync(resolved, 'utf8');
    } catch (e) {
      return failed(runId, `cannot read ${request.path}: ${(e as Error).message}`);
    }
  }

  const scriptDir = path.join(root, '.sandbox-tmp');
  const scriptFile = path.join(scriptDir, `${adapter.filename}-${runId.slice(0, 8)}`);

  try {
    mkdirSync(scriptDir, { recursive: true });
    writeFileSync(scriptFile, source, 'utf8');
  } catch (e) {
    return failed(runId, `cannot write script: ${(e as Error).message}`);
  }

  const args: string[] = [
    '/bin/bash', '-c', rlimitPrelude(limits, lang), interpreter,
    ...adapter.argv(scriptFile, limits),
  ];
  const child: ChildProcess = spawn(args[0] as string, args.slice(1), {
    cwd: root,
    env: sandboxEnv(root),
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let timedOut = false;
  let killed = false;
  let exitCode: number | null = null;

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  let outputBytes = 0;
  const maxBytes = limits.maxOutputBytes;

  child.stdout.on('data', (d: Buffer) => {
    if (outputBytes >= maxBytes) return;
    const chunk = d.toString();
    stdoutChunks.push(chunk);
    outputBytes += Math.min(d.byteLength, maxBytes - outputBytes);
  });

  child.stderr.on('data', (d: Buffer) => {
    if (outputBytes >= maxBytes) return;
    stderrChunks.push(d.toString());
  });

  const timer = limits.timeoutMs > 0
    ? setTimeout(() => { timedOut = true; killed = true; try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }, limits.timeoutMs)
    : null;

  return {
    done: new Promise((resolve) => {
          child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
              if (timer) clearTimeout(timer);
        exitCode = code;
              resolve({
          code: code ?? 1,
          signal: signal ?? undefined,
          timedOut,
          killed,
          limited: timedOut || killed,
          outputBytes,
        });
      });
      child.on('error', (err: Error) => {
            });
    }),
    stdout: {
      [Symbol.asyncIterator]() {
        let idx = 0;
        return {
          async next() {
            if (idx < stdoutChunks.length) {
              const chunk = stdoutChunks[idx++];
              return chunk.length > 0 ? { value: chunk, done: false } : this.next();
            }
            return new Promise((resolve) => {
              const check = () => {
                if (idx < stdoutChunks.length) {
                  const chunk = stdoutChunks[idx++];
                  if (chunk.length > 0) resolve({ value: chunk, done: false });
                  else check();
                } else if (timedOut || killed || exitCode !== null) resolve({ value: undefined, done: true });
                else child.once('close', check);
              };
              check();
            });
          },
        };
      },
    },
    stderr: {
      [Symbol.asyncIterator]() {
        let idx = 0;
        return {
          async next() {
            if (idx < stderrChunks.length) {
              const chunk = stderrChunks[idx++];
              return chunk.length > 0 ? { value: chunk, done: false } : this.next();
            }
            return new Promise((resolve) => {
              const check = () => {
                if (idx < stderrChunks.length) {
                  const chunk = stderrChunks[idx++];
                  if (chunk.length > 0) resolve({ value: chunk, done: false });
                  else check();
                } else if (timedOut || killed || exitCode !== null) resolve({ value: undefined, done: true });
                else child.once('close', check);
              };
              check();
            });
          },
        };
      },
    },
    kill(signal?: NodeJS.Signals) {
      killed = true;
      try { process.kill(-child.pid, signal ?? 'SIGTERM'); } catch { child.kill(signal ?? 'SIGTERM'); }
    },
  };
}

function failed(runId: string, msg: string): RunHandle {
  const done: Promise<ExitInfo> = Promise.resolve({
    code: 1,
    timedOut: false,
    killed: false,
    limited: false,
    outputBytes: 0,
  });
  return {
    done,
    stdout: {
      [Symbol.asyncIterator]() {
        return {
          next() {
            return new Promise((resolve) => {
              setTimeout(() => resolve({ value: undefined, done: true }), 0);
            });
          },
        };
      },
    },
    stderr: {
      [Symbol.asyncIterator]() {
        return {
          next() {
            return new Promise((resolve) => {
              setTimeout(() => resolve({ value: undefined, done: true }), 0);
            });
          },
        };
      },
    },
    kill() {},
  };
}
