/**
 * Backup & Migration capability — Phase 14
 *
 * Capabilities:
 * - magoco.backup (export/import state, migrations)
 */

import type { CapabilityDef } from './types.js';

export const BACKUP_CAPABILITY = 'magoco.backup' as const;

// Data structures
export interface SessionState {
  id: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  context: Record<string, unknown>;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  settings: Record<string, unknown>;
}

export interface WorkspaceState {
  id: string;
  name: string;
  settings: Record<string, unknown>;
  members: Array<{ userId: string; role: string }>;
}

export interface BackupData {
  version: string;
  createdAt: number;
  exportType: 'full' | 'session' | 'workspace' | 'profile';
  data: {
    sessions?: SessionState[];
    profiles?: UserProfile[];
    workspaces?: WorkspaceState[];
  };
}

export interface MigrationStep {
  fromVersion: string;
  toVersion: string;
  description: string;
  run: () => Promise<void>;
}

// Provider
export interface BackupProvider {
  export(format: 'json' | 'zip'): Promise<Buffer>;
  import(data: Buffer, overwrite?: boolean): Promise<{ success: boolean; restoredCount: number }>;
  migrate(fromVersion: string, toVersion: string): Promise<boolean>;
  getMigrations(): MigrationStep[];
}

// Capability
export const backupDef: CapabilityDef = {
  id: BACKUP_CAPABILITY,
  name: 'Backup & Migration',
  description: 'Export, import, and migrate data between installations',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};
