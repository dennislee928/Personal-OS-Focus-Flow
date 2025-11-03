/**
 * In-memory storage adapter for testing and development
 */
export class MemoryStorageAdapter {
    storage = new Map();
    async get(key) {
        return this.storage.get(key) || null;
    }
    async set(key, value) {
        this.storage.set(key, value);
    }
    async delete(key) {
        this.storage.delete(key);
    }
    async exists(key) {
        return this.storage.has(key);
    }
    clear() {
        this.storage.clear();
    }
    size() {
        return this.storage.size;
    }
    keys() {
        return Array.from(this.storage.keys());
    }
}
