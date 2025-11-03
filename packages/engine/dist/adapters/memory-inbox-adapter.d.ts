/**
 * Memory Inbox Adapter - In-memory implementation for testing and development
 */
import { InboxIntegration, InboxFilter } from '../services/inbox-service.js';
import { InboxItem } from '../types/ritual.js';
export declare class MemoryInboxAdapter implements InboxIntegration {
    private items;
    saveItem(item: InboxItem): Promise<void>;
    saveItems(items: InboxItem[]): Promise<void>;
    getItems(filter?: InboxFilter): Promise<InboxItem[]>;
    updateItem(id: string, updates: Partial<InboxItem>): Promise<void>;
    deleteItem(id: string): Promise<void>;
    searchItems(query: string): Promise<InboxItem[]>;
    /**
     * Get all items (for testing)
     */
    getAllItems(): InboxItem[];
    /**
     * Clear all items (for testing)
     */
    clear(): void;
    /**
     * Get item count (for testing)
     */
    getItemCount(): number;
    private applyFilter;
}
