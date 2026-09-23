/**
 * Storage backend capability — `magoco.storage` (Phase 9).
 *
 * Unified interface for multiple storage backends (local, S3, R2, MinIO).
 */

import type { CapabilityDef } from './types.js';

export const STORAGE_CAPABILITY = 'magoco.storage' as const;

export type StorageBackend = 'local' | 's3' | 'r2' | 'minio';

export interface StorageConfig {
  type: StorageBackend;
  localPath?: string;
  bucketName: string;
  endpoint?: string;
  region?: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export interface FileInfo {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  metadata?: Record<string, string>;
}

export interface ReadOptions {
  range?: { start: number; end: number };
  encoding?: 'utf8' | 'binary';
}

export interface WriteOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageProvider {
  /** Upload file to storage */
  upload(key: string, content: Buffer | string, options?: WriteOptions): Promise<void>;

  /** Download file from storage */
  download(key: string, options?: ReadOptions): Promise<Buffer | string>;

  /** Delete file from storage */
  delete(key: string): Promise<void>;

  /** List files with optional prefix */
  list(prefix?: string, maxKeys?: number): Promise<FileInfo[]>;

  /** Get file metadata */
  head(key: string): Promise<FileInfo | null>;

  /** Check if file exists */
  exists(key: string): Promise<boolean>;
}

export const storageDef: CapabilityDef = {
  id: STORAGE_CAPABILITY,
  name: 'Storage Backends',
  description: 'Unified storage interface supporting local, S3, R2, MinIO',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${STORAGE_CAPABILITY} not registered`);
  },
};
