/**
 * Context Tagger Component - Interface for tagging items with @deep/@shallow context
 */
import { InboxItem } from '../types/ritual.js';
export interface ContextTaggerConfig {
    enableAutoSuggestion: boolean;
    showExplanations: boolean;
    enableCustomContexts: boolean;
    defaultContext: '@deep' | '@shallow';
}
export interface ContextOption {
    id: '@deep' | '@shallow' | string;
    label: string;
    description: string;
    icon?: string;
    color: string;
    examples: string[];
}
export interface ContextTaggerState {
    selectedContext: '@deep' | '@shallow' | string;
    availableContexts: ContextOption[];
    suggestedContext: '@deep' | '@shallow' | null;
    suggestionReason: string;
    customContexts: ContextOption[];
    error: string | null;
}
export interface ContextSuggestionRule {
    id: string;
    name: string;
    condition: (item: InboxItem) => boolean;
    suggestedContext: '@deep' | '@shallow';
    reason: string;
    priority: number;
}
export declare class ContextTagger {
    private config;
    private state;
    private suggestionRules;
    constructor(config?: Partial<ContextTaggerConfig>);
    /**
     * Initialize tagger for a specific item
     */
    initializeForItem(item: InboxItem): Promise<ContextTaggerState>;
    /**
     * Get current tagger state
     */
    getState(): ContextTaggerState;
    /**
     * Select a context
     */
    selectContext(contextId: '@deep' | '@shallow' | string): ContextTaggerState;
    /**
     * Accept suggested context
     */
    acceptSuggestion(): ContextTaggerState;
    /**
     * Reject suggested context and use default
     */
    rejectSuggestion(): ContextTaggerState;
    /**
     * Add custom context (if enabled)
     */
    addCustomContext(context: Omit<ContextOption, 'id'> & {
        id: string;
    }): ContextTaggerState;
    /**
     * Remove custom context
     */
    removeCustomContext(contextId: string): ContextTaggerState;
    /**
     * Get context explanation
     */
    getContextExplanation(contextId: '@deep' | '@shallow' | string): string;
    /**
     * Get context examples
     */
    getContextExamples(contextId: '@deep' | '@shallow' | string): string[];
    /**
     * Validate current selection
     */
    validateSelection(): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Get selected context
     */
    getSelectedContext(): '@deep' | '@shallow' | string;
    /**
     * Add suggestion rule
     */
    addSuggestionRule(rule: ContextSuggestionRule): void;
    /**
     * Remove suggestion rule
     */
    removeSuggestionRule(ruleId: string): void;
    /**
     * Get all suggestion rules
     */
    getSuggestionRules(): ContextSuggestionRule[];
    /**
     * Reset tagger state
     */
    reset(): ContextTaggerState;
    private initializeContexts;
    private setupDefaultSuggestionRules;
    private generateContextSuggestion;
}
