/**
 * Clarify Controller - Manages the GTD clarify step interface and user interactions
 */
import { InboxItem, ClarifyDecision } from '../types/ritual.js';
import { ClarifyService, ClarifySession, BatchCriteria } from '../services/clarify-service.js';
import { DelegationService, Assignee } from '../services/delegation-service.js';
import { AssigneeSelector, AssigneeSelectorState } from '../components/assignee-selector.js';
import { DueDatePicker, DueDatePickerState } from '../components/due-date-picker.js';
import { ContextTagger, ContextTaggerState } from '../components/context-tagger.js';
export interface ClarifyControllerConfig {
    enableKeyboardShortcuts: boolean;
    showProgressIndicator: boolean;
    enableBatchSuggestions: boolean;
    autoStartTimer: boolean;
}
export interface DecisionInterfaceState {
    currentItem: InboxItem | null;
    session: ClarifySession | null;
    timerRemaining: number;
    isTimerActive: boolean;
    batchMode: boolean;
    batchSuggestions: InboxItem[];
    progress: {
        current: number;
        total: number;
        percentage: number;
    };
    assigneeSelector: AssigneeSelectorState | null;
    dueDatePicker: DueDatePickerState | null;
    contextTagger: ContextTaggerState | null;
}
export interface KeyboardShortcuts {
    doAction: string;
    delegateAction: string;
    deferAction: string;
    startTimer: string;
    stopTimer: string;
    nextItem: string;
    previousItem: string;
    enableBatch: string;
    disableBatch: string;
}
export interface DecisionFormData {
    action: 'do' | 'delegate' | 'defer';
    assignee?: string;
    dueDate?: Date;
    estimatedDuration: number;
    context: '@deep' | '@shallow';
    notes?: string;
}
export declare class ClarifyController {
    private clarifyService;
    private delegationService;
    private config;
    private timerInterval?;
    private assigneeSelector;
    private dueDatePicker;
    private contextTagger;
    private keyboardShortcuts;
    constructor(clarifyService: ClarifyService, delegationService?: DelegationService, config?: Partial<ClarifyControllerConfig>);
    /**
     * Start clarify process with inbox items
     */
    startClarifyProcess(items: InboxItem[]): Promise<DecisionInterfaceState>;
    /**
     * Get current interface state
     */
    getCurrentState(): DecisionInterfaceState;
    /**
     * Start the 2-minute timer for current item
     */
    startTwoMinuteTimer(): void;
    /**
     * Stop the 2-minute timer
     */
    stopTwoMinuteTimer(): void;
    /**
     * Make a decision for the current item
     */
    makeDecision(formData: DecisionFormData): Promise<DecisionInterfaceState>;
    /**
     * Enable batch mode for similar items
     */
    enableBatchMode(criteria?: Partial<BatchCriteria>): Promise<DecisionInterfaceState>;
    /**
     * Disable batch mode
     */
    disableBatchMode(): Promise<DecisionInterfaceState>;
    /**
     * Apply batch decision to selected items
     */
    applyBatchDecision(formData: DecisionFormData, itemIds: string[]): Promise<DecisionInterfaceState>;
    /**
     * Navigate to next item
     */
    nextItem(): Promise<DecisionInterfaceState>;
    /**
     * Navigate to previous item
     */
    previousItem(): Promise<DecisionInterfaceState>;
    /**
     * Complete the clarify process
     */
    completeClarifyProcess(): Promise<ClarifyDecision[]>;
    /**
     * Cancel the clarify process
     */
    cancelClarifyProcess(): Promise<void>;
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcut(key: string): Promise<DecisionInterfaceState | void>;
    /**
     * Get keyboard shortcuts configuration
     */
    getKeyboardShortcuts(): KeyboardShortcuts;
    /**
     * Update keyboard shortcuts
     */
    updateKeyboardShortcuts(shortcuts: Partial<KeyboardShortcuts>): void;
    /**
     * Get clarify metrics
     */
    getMetrics(): import("../services/clarify-service.js").ClarifyMetrics;
    /**
     * Initialize UI components for current item
     */
    initializeUIComponentsForItem(item: InboxItem): Promise<void>;
    /**
     * Get assignee selector interface
     */
    getAssigneeSelector(): AssigneeSelector;
    /**
     * Get due date picker interface
     */
    getDueDatePicker(): DueDatePicker;
    /**
     * Get context tagger interface
     */
    getContextTagger(): ContextTagger;
    /**
     * Add assignee to delegation service
     */
    addAssignee(assignee: Assignee): void;
    /**
     * Get available assignees
     */
    getAvailableAssignees(): Assignee[];
    /**
     * Validate complete decision form
     */
    validateCompleteDecision(formData: DecisionFormData): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Cleanup resources
     */
    destroy(): void;
    private validateDecisionForm;
    private makeQuickDecision;
    private generateBatchSuggestions;
    private startTimerUpdates;
    private stopTimerUpdates;
}
