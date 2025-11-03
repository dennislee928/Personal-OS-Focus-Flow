/**
 * In-memory storage adapter for testing and development
 */
import { StorageAdapter } from '../services/persistence-service.js';
export declare class MemoryStorageAdapter implements StorageAdapter {
    private storage;
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    clear(): void;
    size(): number;
    keys(): string[];
}
