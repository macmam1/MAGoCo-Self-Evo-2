/**
 * Secure Secret Store
 * Supports: encryption, credential management, secure storage
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export interface SecretEntry {
  id: string;
  name: string;
  encryptedValue: string;
  iv: string;
  tag: string;
  createdAt: number;
  updatedAt: number;
}

export class SecretStore {
  private masterKey: Buffer;
  private storage: Map<string, SecretEntry> = new Map();

  constructor(masterKey: string) {
    this.masterKey = crypto.createHash('sha256').update(masterKey).digest();
  }

  save(name: string, value: string): void {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    this.storage.set(name, {
      id: crypto.randomUUID(),
      name,
      encryptedValue: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  load(name: string): string | null {
    const entry = this.storage.get(name);
    if (!entry) return null;

    const iv = Buffer.from(entry.iv, 'hex');
    const tag = Buffer.from(entry.tag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(entry.encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  delete(name: string): boolean {
    return this.storage.delete(name);
  }

  list(): { id: string; name: string }[] {
    return Array.from(this.storage.values()).map(({ id, name }) => ({ id, name }));
  }
}
