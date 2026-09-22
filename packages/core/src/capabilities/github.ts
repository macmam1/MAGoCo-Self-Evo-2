/**
 * GitHub Sync capability — `magoco.github` (Phase 3.7).
 *
 * Enables bidirectional sync for user ownership.
 */

import type { CapabilityDef, CapabilityContext } from './types.js';

export const GITHUB_CAPABILITY = 'magoco.github' as const;

export interface GitHubConfig {
  repoUrl: string;
  token?: string; // Optional OAuth token
  branch?: string;
  localPath?: string;
}

export interface SyncResult {
  success: boolean;
  commits?: string[];
  changes?: { added: string[]; modified: string[]; deleted: string[] };
  error?: string;
}

export interface GitHubProvider {
  /** Initialize local repo and pull remote changes */
  pull(config: GitHubConfig): Promise<SyncResult>;
  
  /** Commit and push local changes */
  push(config: GitHubConfig, changes: Record<string, string>): Promise<SyncResult>;
  
  /** Full bidirectional sync */
  sync(config: GitHubConfig, changes: Record<string, string>): Promise<SyncResult>;
}

export const githubDef: CapabilityDef = {
  id: GITHUB_CAPABILITY,
  name: 'GitHub Sync',
  description: 'Bidirectional repo sync for user ownership (pull/push)',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${GITHUB_CAPABILITY} not registered`);
  },
};
