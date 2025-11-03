/**
 * Inbox Service - Manages task persistence and integration with main inbox system
 */
import { InboxItem } from '../types/ritual.js';
export interface InboxServiceConfig {
    batchSize: number;
    autoSaveInterval: number;
    enableOptimisticUpdates: boolean;
    maxRetries: number;
    retryDelay: number;
}
export interface BatchOperation {
    id: string;
    items: InboxItem[];
    operation: 'create' | 'update' | 'delete';
    timestamp: Date;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    retryCount: number;
}
export interface InboxIntegration {
    saveItem(item: InboxItem): Promise<void>;
    saveItems(items: InboxItem[]): Promise<void>;
    getItems(filter?: InboxFilter): Promise<InboxItem[]>;
    updateItem(id: string, updates: Partial<InboxItem>): Promise<void>;
    deleteItem(id: string): Promise<void>;
    searchItems(query: string): Promise<InboxItem[]>;
}
export interface InboxFilter {
    dateRange?: {
        start: Date;
        end: Date;
    };
    tags?: string[];
    source?: ('manual' | 'voice' | 'import')[];
    minPriority?: number;
    maxPriority?: number;
}
export interface CategoryRule {
    id: string;
    name: string;
    pattern: RegExp;
    tags: string[];
    priority?: number;
    estimatedDuration?: number;
}
export interface InboxMetrics {
    totalItems: number;
    itemsBySource: Record<string, number>;
    itemsByTag: Record<string, number>;
    averageProcessingTime: number;
    batchOperationsCount: number;
    failedOperationsCount: number;
}
export declare class InboxService {
    private config;
    private integration;
    private pendingOperations;
    private categoryRules;
    private autoSaveTimer?;
    private metrics;
    constructor(integration: InboxIntegration, config?: Partial<InboxServiceConfig>);
    /**
     * Save a single item with optimistic updates
     */
    saveItem(item: InboxItem): Promise<void>;
    /**
     * Save multiple items in batch
     */
    saveItems(items: InboxItem[]): Promise<void>;
    /**
     * Get items from inbox with filtering
     */
    getItems(filter?: InboxFilter): Promise<InboxItem[]>;
    /**
     * Search items by content
     */
    searchItems(query: string): Promise<InboxItem[]>;
    /**
     * Update an existing item
     */
    updateItem(id: string, updates: Partial<InboxItem>): Promise<void>;
    /**
     * Delete an item
     */
    deleteItem(id: string): Promise<void>;
    /**
     * Add a custom categorization rule
     */
    addCategoryRule(rule: CategoryRule): void;
    /**
     * Remove a categorization rule
     */
    removeCategoryRule(ruleId: string): void;
    /**
     * Get all categorization rules
     */
    getCategoryRules(): CategoryRule[];
    /**
     * Force flush all pending operations
     */
    flushPendingOperations(): Promise<void>;
    /**
     * Get current inbox metrics
     */
    getMetrics(): InboxMetrics;
    /**
     * Reset metrics
     */
    resetMetrics(): void;
    /**
     * Cleanup resources
     */
    destroy(): void;
    private categorizeItem;
    private addToPendingBatch;
    private processBatchOperation;
    private startAutoSave;
    private setupDefaultCategoryRules;
    private updateMetrics;
    private generateBatchId;
}
