/**
 * Capture Service - Handles rapid task entry with autocomplete and suggestions
 */
import { InboxItem, TaskSuggestion, CaptureMetrics } from '../types/ritual.js';
import { InboxService } from './inbox-service.js';
export interface CaptureServiceConfig {
    maxSuggestions: number;
    suggestionThreshold: number;
    autoSaveDelay: number;
    enableVoiceInput: boolean;
}
export interface CaptureResult {
    item: InboxItem;
    saveTime: number;
    usedAutocomplete: boolean;
}
export declare class CaptureService {
    private suggestions;
    private metrics;
    private config;
    private saveCallbacks;
    private inboxService?;
    constructor(config?: Partial<CaptureServiceConfig>, inboxService?: InboxService);
    /**
     * Add a callback to be called when an item is saved
     */
    onItemSaved(callback: (item: InboxItem) => Promise<void>): void;
    /**
     * Capture a new task with instant save functionality
     */
    captureTask(content: string, source?: 'manual' | 'voice'): Promise<CaptureResult>;
    /**
     * Get autocomplete suggestions based on input
     */
    getSuggestions(input: string): TaskSuggestion[];
    /**
     * Capture task using autocomplete suggestion
     */
    captureFromSuggestion(suggestion: TaskSuggestion): Promise<CaptureResult>;
    /**
     * Load suggestions from historical data
     */
    loadSuggestions(historicalItems: InboxItem[]): void;
    /**
     * Get current capture metrics
     */
    getMetrics(): CaptureMetrics;
    /**
     * Reset metrics (typically called at start of new ritual)
     */
    resetMetrics(): void;
    private saveItem;
    private generateId;
    private extractTags;
    private estimateDuration;
    private calculatePriority;
    private updateSuggestions;
    private updateMetrics;
    /**
     * Record keyboard shortcut usage
     */
    recordKeyboardShortcut(): void;
    /**
     * Set inbox service for integration
     */
    setInboxService(inboxService: InboxService): void;
    /**
     * Load suggestions from inbox service
     */
    loadSuggestionsFromInbox(): Promise<void>;
    /**
     * Batch capture multiple items
     */
    batchCapture(contents: string[], source?: 'manual' | 'voice'): Promise<CaptureResult[]>;
    private setupInboxIntegration;
}
