/**
 * GitHub Sync provider implementation.
 *
 * Enables bidirectional repo sync for user ownership.
 */

import { execSync, exec } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  GitHubConfig,
  GitHubProvider,
  SyncResult,
} from '../../core/src/capabilities/github.js';

// ============================================================================
// GIT OPERATIONS
// ============================================================================

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

function execGit(args: string[], cwd: string, token?: string): string {
  const env = token ? { ...process.env, GIT_ASKPASS: 'echo' } : process.env;
  const url = cwd.includes('https://') ? cwd : `https://github.com/${cwd}`;
  const cmd = `git ${args.join(' ')} 2>&1`;
  return execSync(cmd, { cwd, env }).toString().trim();
}

async function diff(cwd: string): Promise<Record<string, string>> {
  try {
    const output = execGit(['diff', 'HEAD'], cwd);
    const lines = output.split('\n');
    const changes: Record<string, string> = {};
    let currentFile: string | null = null;

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        const parts = line.split(' ').pop();
        if (parts) {
          currentFile = parts.replace('b/', '');
        }
      } else if (line.startsWith('+') && currentFile) {
        changes[currentFile] = (changes[currentFile] || '') + line.substring(1);
      }
    }
    return changes;
  } catch (e) {
    return {};
  }
}

// ============================================================================
// PROVIDER IMPLEMENTATION
// ============================================================================

export function createGitHubProvider(): GitHubProvider {
  return {
    async pull(config: GitHubConfig): Promise<SyncResult> {
      const dir = config.localPath || './repo';
      await ensureDir(dir);
      try {
        const url = config.repoUrl.includes('https://') ? config.repoUrl : `https://github.com/${config.repoUrl}`;
        execGit(['clone', url, dir], process.cwd(), config.token);
        return { success: true, changes: { added: [], modified: [], deleted: [] } };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },

    async push(config: GitHubConfig, changes: Record<string, string>): Promise<SyncResult> {
      const dir = config.localPath || './repo';
      try {
        execGit(['add', '.'], dir, config.token);
        execGit(['commit', '-m', 'Auto commit'], dir, config.token);
        execGit(['push', 'origin', 'main'], dir, config.token);
        return { success: true, changes: { added: [], modified: Object.keys(changes), deleted: [] } };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },

    async sync(config: GitHubConfig, changes: Record<string, string>): Promise<SyncResult> {
      const pullResult = await this.pull(config);
      if (!pullResult.success) return pullResult;

      const pushResult = await this.push(config, changes);
      return pushResult;
    },
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export async function cloneRepo(url: string, token?: string): Promise<string> {
  const dir = `./repo_${Date.now()}`;
  execGit(['clone', url, dir], process.cwd(), token);
  return dir;
}

export async function commitAndPush(dir: string, message = 'Auto commit', token?: string): Promise<void> {
  execGit(['add', '.'], dir, token);
  execGit(['commit', '-m', message], dir, token);
  execGit(['push', 'origin', 'main'], dir, token);
}
