/**
 * Inbox Service - Manages task persistence and integration with main inbox system
 */
export class InboxService {
    config;
    integration;
    pendingOperations = new Map();
    categoryRules = [];
    autoSaveTimer;
    metrics = {
        totalItems: 0,
        itemsBySource: {},
        itemsByTag: {},
        averageProcessingTime: 0,
        batchOperationsCount: 0,
        failedOperationsCount: 0
    };
    constructor(integration, config = {}) {
        this.integration = integration;
        this.config = {
            batchSize: 10,
            autoSaveInterval: 5000, // 5 seconds
            enableOptimisticUpdates: true,
            maxRetries: 3,
            retryDelay: 1000,
            ...config
        };
        this.setupDefaultCategoryRules();
        this.startAutoSave();
    }
    /**
     * Save a single item with optimistic updates
     */
    async saveItem(item) {
        const startTime = performance.now();
        try {
            // Apply auto-categorization
            const categorizedItem = this.categorizeItem(item);
            if (this.config.enableOptimisticUpdates) {
                // Add to pending operations for batch processing
                this.addToPendingBatch(categorizedItem, 'create');
            }
            else {
                // Direct save
                await this.integration.saveItem(categorizedItem);
            }
            this.updateMetrics(categorizedItem, performance.now() - startTime);
        }
        catch (error) {
            throw new Error(`Failed to save item: ${error.message}`);
        }
    }
    /**
     * Save multiple items in batch
     */
    async saveItems(items) {
        const startTime = performance.now();
        try {
            // Apply auto-categorization to all items
            const categorizedItems = items.map(item => this.categorizeItem(item));
            if (this.config.enableOptimisticUpdates) {
                // Add to pending batch operations
                categorizedItems.forEach(item => this.addToPendingBatch(item, 'create'));
            }
            else {
                // Direct batch save
                await this.integration.saveItems(categorizedItems);
            }
            // Update metrics for all items
            categorizedItems.forEach(item => {
                this.updateMetrics(item, (performance.now() - startTime) / items.length);
            });
        }
        catch (error) {
            throw new Error(`Failed to save items: ${error.message}`);
        }
    }
    /**
     * Get items from inbox with filtering
     */
    async getItems(filter) {
        try {
            return await this.integration.getItems(filter);
        }
        catch (error) {
            throw new Error(`Failed to get items: ${error.message}`);
        }
    }
    /**
     * Search items by content
     */
    async searchItems(query) {
        try {
            return await this.integration.searchItems(query);
        }
        catch (error) {
            throw new Error(`Failed to search items: ${error.message}`);
        }
    }
    /**
     * Update an existing item
     */
    async updateItem(id, updates) {
        try {
            await this.integration.updateItem(id, updates);
        }
        catch (error) {
            throw new Error(`Failed to update item: ${error.message}`);
        }
    }
    /**
     * Delete an item
     */
    async deleteItem(id) {
        try {
            await this.integration.deleteItem(id);
        }
        catch (error) {
            throw new Error(`Failed to delete item: ${error.message}`);
        }
    }
    /**
     * Add a custom categorization rule
     */
    addCategoryRule(rule) {
        this.categoryRules.push(rule);
    }
    /**
     * Remove a categorization rule
     */
    removeCategoryRule(ruleId) {
        this.categoryRules = this.categoryRules.filter(rule => rule.id !== ruleId);
    }
    /**
     * Get all categorization rules
     */
    getCategoryRules() {
        return [...this.categoryRules];
    }
    /**
     * Force flush all pending operations
     */
    async flushPendingOperations() {
        const operations = Array.from(this.pendingOperations.values());
        for (const operation of operations) {
            if (operation.status === 'pending') {
                await this.processBatchOperation(operation);
            }
        }
    }
    /**
     * Get current inbox metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            totalItems: 0,
            itemsBySource: {},
            itemsByTag: {},
            averageProcessingTime: 0,
            batchOperationsCount: 0,
            failedOperationsCount: 0
        };
    }
    /**
     * Cleanup resources
     */
    destroy() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
    }
    categorizeItem(item) {
        const categorizedItem = { ...item };
        for (const rule of this.categoryRules) {
            if (rule.pattern.test(item.content)) {
                // Add rule tags
                categorizedItem.tags = [...new Set([...categorizedItem.tags, ...rule.tags])];
                // Apply rule priority if not already set
                if (categorizedItem.priority === undefined && rule.priority !== undefined) {
                    categorizedItem.priority = rule.priority;
                }
                // Apply rule duration if not already set
                if (categorizedItem.estimatedDuration === undefined && rule.estimatedDuration !== undefined) {
                    categorizedItem.estimatedDuration = rule.estimatedDuration;
                }
            }
        }
        return categorizedItem;
    }
    addToPendingBatch(item, operation) {
        const batchId = this.generateBatchId();
        const batchOperation = {
            id: batchId,
            items: [item],
            operation,
            timestamp: new Date(),
            status: 'pending',
            retryCount: 0
        };
        this.pendingOperations.set(batchId, batchOperation);
    }
    async processBatchOperation(operation) {
        operation.status = 'processing';
        try {
            switch (operation.operation) {
                case 'create':
                    await this.integration.saveItems(operation.items);
                    break;
                case 'update':
                    // Handle batch updates if supported by integration
                    for (const item of operation.items) {
                        await this.integration.updateItem(item.id, item);
                    }
                    break;
                case 'delete':
                    for (const item of operation.items) {
                        await this.integration.deleteItem(item.id);
                    }
                    break;
            }
            operation.status = 'completed';
            this.pendingOperations.delete(operation.id);
            this.metrics.batchOperationsCount++;
        }
        catch (error) {
            operation.status = 'failed';
            operation.retryCount++;
            if (operation.retryCount < this.config.maxRetries) {
                // Schedule retry
                setTimeout(() => {
                    if (this.pendingOperations.has(operation.id)) {
                        operation.status = 'pending';
                        this.processBatchOperation(operation);
                    }
                }, this.config.retryDelay * operation.retryCount);
            }
            else {
                // Max retries reached, remove from pending
                this.pendingOperations.delete(operation.id);
                this.metrics.failedOperationsCount++;
                throw new Error(`Batch operation failed after ${this.config.maxRetries} retries: ${error.message}`);
            }
        }
    }
    startAutoSave() {
        this.autoSaveTimer = setInterval(async () => {
            const pendingOperations = Array.from(this.pendingOperations.values())
                .filter(op => op.status === 'pending');
            for (const operation of pendingOperations) {
                try {
                    await this.processBatchOperation(operation);
                }
                catch (error) {
                    // Log error but continue processing other operations
                    console.error('Auto-save batch operation failed:', error);
                }
            }
        }, this.config.autoSaveInterval);
    }
    setupDefaultCategoryRules() {
        // Meeting-related tasks
        this.addCategoryRule({
            id: 'meetings',
            name: 'Meetings',
            pattern: /\b(meeting|call|standup|sync|demo|presentation)\b/i,
            tags: ['meeting', 'scheduled'],
            priority: 3,
            estimatedDuration: 30
        });
        // Email-related tasks
        this.addCategoryRule({
            id: 'email',
            name: 'Email Tasks',
            pattern: /\b(email|reply|respond|send|message)\b/i,
            tags: ['communication', 'email'],
            priority: 2,
            estimatedDuration: 10
        });
        // Development tasks
        this.addCategoryRule({
            id: 'development',
            name: 'Development',
            pattern: /\b(code|develop|implement|fix|bug|feature|deploy)\b/i,
            tags: ['development', 'deep'],
            priority: 4,
            estimatedDuration: 60
        });
        // Research tasks
        this.addCategoryRule({
            id: 'research',
            name: 'Research',
            pattern: /\b(research|investigate|analyze|study|learn)\b/i,
            tags: ['research', 'deep'],
            priority: 3,
            estimatedDuration: 45
        });
        // Administrative tasks
        this.addCategoryRule({
            id: 'admin',
            name: 'Administrative',
            pattern: /\b(admin|paperwork|form|document|report|update)\b/i,
            tags: ['admin', 'shallow'],
            priority: 2,
            estimatedDuration: 15
        });
        // Urgent tasks
        this.addCategoryRule({
            id: 'urgent',
            name: 'Urgent',
            pattern: /\b(urgent|asap|emergency|critical|now|today)\b/i,
            tags: ['urgent'],
            priority: 5,
            estimatedDuration: 30
        });
    }
    updateMetrics(item, processingTime) {
        this.metrics.totalItems++;
        // Update source metrics
        this.metrics.itemsBySource[item.source] = (this.metrics.itemsBySource[item.source] || 0) + 1;
        // Update tag metrics
        item.tags.forEach(tag => {
            this.metrics.itemsByTag[tag] = (this.metrics.itemsByTag[tag] || 0) + 1;
        });
        // Update average processing time
        const totalTime = this.metrics.averageProcessingTime * (this.metrics.totalItems - 1) + processingTime;
        this.metrics.averageProcessingTime = totalTime / this.metrics.totalItems;
    }
    generateBatchId() {
        return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
