/**
 * Memory Inbox Adapter - In-memory implementation for testing and development
 */
export class MemoryInboxAdapter {
    items = new Map();
    async saveItem(item) {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        this.items.set(item.id, { ...item });
    }
    async saveItems(items) {
        // Simulate async batch operation
        await new Promise(resolve => setTimeout(resolve, 20));
        for (const item of items) {
            this.items.set(item.id, { ...item });
        }
    }
    async getItems(filter) {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 5));
        let items = Array.from(this.items.values());
        if (filter) {
            items = this.applyFilter(items, filter);
        }
        return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    async updateItem(id, updates) {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        const existing = this.items.get(id);
        if (!existing) {
            throw new Error(`Item with id ${id} not found`);
        }
        this.items.set(id, { ...existing, ...updates });
    }
    async deleteItem(id) {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        if (!this.items.has(id)) {
            throw new Error(`Item with id ${id} not found`);
        }
        this.items.delete(id);
    }
    async searchItems(query) {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 15));
        const queryLower = query.toLowerCase();
        const items = Array.from(this.items.values()).filter(item => item.content.toLowerCase().includes(queryLower) ||
            item.tags.some(tag => tag.toLowerCase().includes(queryLower)));
        return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    /**
     * Get all items (for testing)
     */
    getAllItems() {
        return Array.from(this.items.values());
    }
    /**
     * Clear all items (for testing)
     */
    clear() {
        this.items.clear();
    }
    /**
     * Get item count (for testing)
     */
    getItemCount() {
        return this.items.size;
    }
    applyFilter(items, filter) {
        return items.filter(item => {
            // Date range filter
            if (filter.dateRange) {
                const itemDate = item.createdAt.getTime();
                const startDate = filter.dateRange.start.getTime();
                const endDate = filter.dateRange.end.getTime();
                if (itemDate < startDate || itemDate > endDate) {
                    return false;
                }
            }
            // Tags filter
            if (filter.tags && filter.tags.length > 0) {
                const hasMatchingTag = filter.tags.some(tag => item.tags.includes(tag));
                if (!hasMatchingTag) {
                    return false;
                }
            }
            // Source filter
            if (filter.source && filter.source.length > 0) {
                if (!filter.source.includes(item.source)) {
                    return false;
                }
            }
            // Priority filter
            if (filter.minPriority !== undefined && item.priority !== undefined) {
                if (item.priority < filter.minPriority) {
                    return false;
                }
            }
            if (filter.maxPriority !== undefined && item.priority !== undefined) {
                if (item.priority > filter.maxPriority) {
                    return false;
                }
            }
            return true;
        });
    }
}
