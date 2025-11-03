/**
 * In-memory storage adapter for testing and development
 */

import { StorageAdapter } from '../services/persistence-service.js';

export class MemoryStorageAdapter implements StorageAdapter {
  private storage: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  clear(): void {
    this.storage.clear();
  }

  size(): number {
    return this.storage.size;
  }

  keys(): string[] {
    return Array.from(this.storage.keys());
  }
}