/**
 * Run provider implementation using runner.ts.
 */

import { spawn } from 'node:child_process';
import type { RunRequest, RunResult, RunProvider } from '../../core/src/capabilities/run.js';

export function createRunProvider(): RunProvider {
  return {
    async run(request: RunRequest): Promise<RunResult> {
      let cmd: string;
      const args: string[] = [];
      let cwd = process.cwd();

      if (request.lang === 'js') {
        cmd = 'node';
        const tmpFile = `/tmp/run-${Date.now()}.js`;
        require('fs').writeFileSync(tmpFile, request.code);
        args.push(tmpFile);
        cwd = '/tmp';
      } else if (request.lang === 'py') {
        cmd = 'python3';
        const tmpFile = `/tmp/run-${Date.now()}.py`;
        require('fs').writeFileSync(tmpFile, request.code);
        args.push(tmpFile);
        cwd = '/tmp';
      } else if (request.lang === 'sh') {
        cmd = 'bash';
        const tmpFile = `/tmp/run-${Date.now()}.sh`;
        require('fs').writeFileSync(tmpFile, request.code);
        args.push(tmpFile);
        cwd = '/tmp';
      } else {
        return { stdout: '', stderr: 'Unsupported language', exitCode: 1 };
      }

      const timeout = request.timeoutMs || 30000;
      const child = spawn(cmd, args, { cwd, timeout });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (d) => { stdout += d.toString(); });
      child.stderr?.on('data', (d) => { stderr += d.toString(); });

      await new Promise<void>((resolve, reject) => {
        child.on('exit', (code) => {
          if (code !== null) resolve();
        });
        child.on('error', (err) => {
          stderr += err.message;
          reject(err);
        });
      });

      return {
        stdout,
        stderr,
        exitCode: child.exitCode ?? 1,
      };
    },
  };
}
