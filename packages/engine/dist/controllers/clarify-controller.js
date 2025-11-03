/**
 * Clarify Controller - Manages the GTD clarify step interface and user interactions
 */
import { DelegationService } from '../services/delegation-service.js';
import { AssigneeSelector } from '../components/assignee-selector.js';
import { DueDatePicker } from '../components/due-date-picker.js';
import { ContextTagger } from '../components/context-tagger.js';
export class ClarifyController {
    clarifyService;
    delegationService;
    config;
    timerInterval;
    assigneeSelector;
    dueDatePicker;
    contextTagger;
    keyboardShortcuts = {
        doAction: 'd',
        delegateAction: 'g',
        deferAction: 'f',
        startTimer: 't',
        stopTimer: 's',
        nextItem: 'n',
        previousItem: 'p',
        enableBatch: 'b',
        disableBatch: 'Escape'
    };
    constructor(clarifyService, delegationService, config = {}) {
        this.clarifyService = clarifyService;
        this.delegationService = delegationService || new DelegationService();
        this.config = {
            enableKeyboardShortcuts: true,
            showProgressIndicator: true,
            enableBatchSuggestions: true,
            autoStartTimer: true,
            ...config
        };
        // Initialize UI components
        this.assigneeSelector = new AssigneeSelector(this.delegationService);
        this.dueDatePicker = new DueDatePicker(this.delegationService);
        this.contextTagger = new ContextTagger();
    }
    /**
     * Start clarify process with inbox items
     */
    async startClarifyProcess(items) {
        if (items.length === 0) {
            throw new Error('No items to clarify');
        }
        // Start clarify session
        const session = this.clarifyService.startSession(items);
        // Initialize UI components for first item
        const currentItem = this.clarifyService.getCurrentItem();
        if (currentItem) {
            await this.initializeUIComponentsForItem(currentItem);
        }
        // Auto-start timer for first item if enabled
        if (this.config.autoStartTimer) {
            this.startTwoMinuteTimer();
        }
        // Start timer update interval
        this.startTimerUpdates();
        return this.getCurrentState();
    }
    /**
     * Get current interface state
     */
    getCurrentState() {
        const session = this.clarifyService.getCurrentSession();
        const currentItem = this.clarifyService.getCurrentItem();
        const progress = this.clarifyService.getSessionProgress();
        const timerRemaining = this.clarifyService.getRemainingTimerTime();
        const isTimerActive = session?.isTimerActive || false;
        let batchSuggestions = [];
        if (this.config.enableBatchSuggestions && currentItem && session) {
            batchSuggestions = this.generateBatchSuggestions(currentItem);
        }
        return {
            currentItem,
            session,
            timerRemaining,
            isTimerActive,
            batchMode: session?.batchMode || false,
            batchSuggestions,
            progress,
            assigneeSelector: this.assigneeSelector.getState(),
            dueDatePicker: this.dueDatePicker.getState(),
            contextTagger: this.contextTagger.getState()
        };
    }
    /**
     * Start the 2-minute timer for current item
     */
    startTwoMinuteTimer() {
        this.clarifyService.startTwoMinuteTimer();
    }
    /**
     * Stop the 2-minute timer
     */
    stopTwoMinuteTimer() {
        this.clarifyService.stopTwoMinuteTimer();
    }
    /**
     * Make a decision for the current item
     */
    async makeDecision(formData) {
        // Validate complete decision including UI components
        const validation = this.validateCompleteDecision(formData);
        if (!validation.isValid) {
            throw new Error(`Decision validation failed: ${validation.errors.join(', ')}`);
        }
        // Get values from UI components
        const assigneeId = this.assigneeSelector.getSelectedAssigneeId();
        const selectedDate = this.dueDatePicker.getSelectedDate();
        const selectedContext = this.contextTagger.getSelectedContext();
        // Create decision object with UI component values
        const decision = {
            action: formData.action,
            assignee: formData.action === 'delegate' ? assigneeId || formData.assignee : formData.assignee,
            dueDate: formData.action === 'defer' ? selectedDate || formData.dueDate : formData.dueDate,
            estimatedDuration: formData.estimatedDuration,
            context: selectedContext
        };
        // Process delegation/deferral through delegation service
        const currentItem = this.clarifyService.getCurrentItem();
        if (currentItem) {
            if (decision.action === 'delegate') {
                await this.delegationService.processDelegation(decision, currentItem);
            }
            else if (decision.action === 'defer') {
                await this.delegationService.processDeferral(decision, currentItem);
            }
        }
        // Make the decision
        this.clarifyService.makeDecision(decision);
        // Auto-start timer for next item if enabled and not in batch mode
        const session = this.clarifyService.getCurrentSession();
        if (this.config.autoStartTimer && !session?.batchMode && !this.clarifyService.isSessionComplete()) {
            // Initialize UI components for next item
            const nextItem = this.clarifyService.getCurrentItem();
            if (nextItem) {
                await this.initializeUIComponentsForItem(nextItem);
            }
            this.startTwoMinuteTimer();
        }
        return this.getCurrentState();
    }
    /**
     * Enable batch mode for similar items
     */
    async enableBatchMode(criteria = {}) {
        const currentItem = this.clarifyService.getCurrentItem();
        if (!currentItem) {
            throw new Error('No current item to base batch processing on');
        }
        // Default criteria for batch suggestions
        const defaultCriteria = {
            similarContent: true,
            sameContext: true,
            ...criteria
        };
        // Enable batch mode (action will be set when decision is made)
        this.clarifyService.enableBatchMode('do', defaultCriteria);
        return this.getCurrentState();
    }
    /**
     * Disable batch mode
     */
    async disableBatchMode() {
        this.clarifyService.disableBatchMode();
        return this.getCurrentState();
    }
    /**
     * Apply batch decision to selected items
     */
    async applyBatchDecision(formData, itemIds) {
        if (itemIds.length === 0) {
            throw new Error('No items selected for batch processing');
        }
        // Validate form data
        this.validateDecisionForm(formData);
        // Create decision object
        const decision = {
            action: formData.action,
            assignee: formData.assignee,
            dueDate: formData.dueDate,
            estimatedDuration: formData.estimatedDuration,
            context: formData.context
        };
        // Apply batch decision
        this.clarifyService.applyBatchDecision(decision, itemIds);
        // Disable batch mode after processing
        this.clarifyService.disableBatchMode();
        // Auto-start timer for next item if enabled
        if (this.config.autoStartTimer && !this.clarifyService.isSessionComplete()) {
            this.startTwoMinuteTimer();
        }
        return this.getCurrentState();
    }
    /**
     * Navigate to next item
     */
    async nextItem() {
        this.clarifyService.advanceToNextItem();
        // Initialize UI components for new item
        const currentItem = this.clarifyService.getCurrentItem();
        if (currentItem) {
            await this.initializeUIComponentsForItem(currentItem);
        }
        // Auto-start timer for new item if enabled
        if (this.config.autoStartTimer && !this.clarifyService.isSessionComplete()) {
            this.startTwoMinuteTimer();
        }
        return this.getCurrentState();
    }
    /**
     * Navigate to previous item
     */
    async previousItem() {
        this.clarifyService.goToPreviousItem();
        // Initialize UI components for item
        const currentItem = this.clarifyService.getCurrentItem();
        if (currentItem) {
            await this.initializeUIComponentsForItem(currentItem);
        }
        // Auto-start timer for item if enabled
        if (this.config.autoStartTimer) {
            this.startTwoMinuteTimer();
        }
        return this.getCurrentState();
    }
    /**
     * Complete the clarify process
     */
    async completeClarifyProcess() {
        // Stop timer updates
        this.stopTimerUpdates();
        // Complete the session
        const decisions = this.clarifyService.completeSession();
        return decisions;
    }
    /**
     * Cancel the clarify process
     */
    async cancelClarifyProcess() {
        // Stop timer updates
        this.stopTimerUpdates();
        // Cancel the session
        this.clarifyService.cancelSession();
    }
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcut(key) {
        if (!this.config.enableKeyboardShortcuts) {
            return Promise.resolve();
        }
        const currentItem = this.clarifyService.getCurrentItem();
        if (!currentItem) {
            return Promise.resolve();
        }
        switch (key.toLowerCase()) {
            case this.keyboardShortcuts.doAction:
                return this.makeQuickDecision('do');
            case this.keyboardShortcuts.delegateAction:
                return this.makeQuickDecision('delegate');
            case this.keyboardShortcuts.deferAction:
                return this.makeQuickDecision('defer');
            case this.keyboardShortcuts.startTimer:
                this.startTwoMinuteTimer();
                return Promise.resolve(this.getCurrentState());
            case this.keyboardShortcuts.stopTimer:
                this.stopTwoMinuteTimer();
                return Promise.resolve(this.getCurrentState());
            case this.keyboardShortcuts.nextItem:
                return this.nextItem();
            case this.keyboardShortcuts.previousItem:
                return this.previousItem();
            case this.keyboardShortcuts.enableBatch:
                return this.enableBatchMode();
            case this.keyboardShortcuts.disableBatch:
                return this.disableBatchMode();
            default:
                return Promise.resolve();
        }
    }
    /**
     * Get keyboard shortcuts configuration
     */
    getKeyboardShortcuts() {
        return { ...this.keyboardShortcuts };
    }
    /**
     * Update keyboard shortcuts
     */
    updateKeyboardShortcuts(shortcuts) {
        this.keyboardShortcuts = { ...this.keyboardShortcuts, ...shortcuts };
    }
    /**
     * Get clarify metrics
     */
    getMetrics() {
        return this.clarifyService.getMetrics();
    }
    /**
     * Initialize UI components for current item
     */
    async initializeUIComponentsForItem(item) {
        await Promise.all([
            this.assigneeSelector.initializeForItem(item),
            this.dueDatePicker.initializeForItem(item),
            this.contextTagger.initializeForItem(item)
        ]);
    }
    /**
     * Get assignee selector interface
     */
    getAssigneeSelector() {
        return this.assigneeSelector;
    }
    /**
     * Get due date picker interface
     */
    getDueDatePicker() {
        return this.dueDatePicker;
    }
    /**
     * Get context tagger interface
     */
    getContextTagger() {
        return this.contextTagger;
    }
    /**
     * Add assignee to delegation service
     */
    addAssignee(assignee) {
        this.delegationService.addAssignee(assignee);
    }
    /**
     * Get available assignees
     */
    getAvailableAssignees() {
        return this.delegationService.getAssignees();
    }
    /**
     * Validate complete decision form
     */
    validateCompleteDecision(formData) {
        const errors = [];
        const warnings = [];
        // Validate basic form
        const basicValidation = this.validateDecisionForm(formData);
        errors.push(...basicValidation.errors);
        warnings.push(...basicValidation.warnings);
        // Validate action-specific components
        switch (formData.action) {
            case 'delegate':
                const assigneeValidation = this.assigneeSelector.validateSelection();
                errors.push(...assigneeValidation.errors);
                warnings.push(...assigneeValidation.warnings);
                break;
            case 'defer':
                const dateValidation = this.dueDatePicker.validateSelection();
                errors.push(...dateValidation.errors);
                warnings.push(...dateValidation.warnings);
                break;
        }
        // Validate context
        const contextValidation = this.contextTagger.validateSelection();
        errors.push(...contextValidation.errors);
        warnings.push(...contextValidation.warnings);
        return {
            isValid: errors.length === 0,
            errors: [...new Set(errors)], // Remove duplicates
            warnings: [...new Set(warnings)] // Remove duplicates
        };
    }
    /**
     * Cleanup resources
     */
    destroy() {
        this.stopTimerUpdates();
    }
    validateDecisionForm(formData) {
        const errors = [];
        const warnings = [];
        // Validate action
        if (!['do', 'delegate', 'defer'].includes(formData.action)) {
            errors.push('Invalid action type');
        }
        // Validate action-specific fields
        switch (formData.action) {
            case 'delegate':
                if (!formData.assignee || formData.assignee.trim() === '') {
                    errors.push('Assignee is required for delegated items');
                }
                break;
            case 'defer':
                if (!formData.dueDate) {
                    errors.push('Due date is required for deferred items');
                }
                else if (formData.dueDate <= new Date()) {
                    errors.push('Due date must be in the future');
                }
                break;
        }
        // Validate context
        if (!['@deep', '@shallow'].includes(formData.context)) {
            errors.push('Context must be either @deep or @shallow');
        }
        // Validate estimated duration
        if (!formData.estimatedDuration || formData.estimatedDuration <= 0) {
            errors.push('Estimated duration must be greater than 0');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    async makeQuickDecision(action) {
        const currentItem = this.clarifyService.getCurrentItem();
        if (!currentItem) {
            throw new Error('No current item to make decision for');
        }
        // Create default decision based on action and item properties
        const formData = {
            action,
            estimatedDuration: currentItem.estimatedDuration || 15, // Default 15 minutes
            context: currentItem.tags.includes('deep') ? '@deep' : '@shallow'
        };
        // Set defaults for specific actions
        switch (action) {
            case 'delegate':
                formData.assignee = 'TBD'; // Will need to be filled in later
                break;
            case 'defer':
                // Default to tomorrow
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                formData.dueDate = tomorrow;
                break;
        }
        return this.makeDecision(formData);
    }
    generateBatchSuggestions(currentItem) {
        // This would typically use the clarify service to find similar items
        // For now, return empty array as placeholder
        return [];
    }
    startTimerUpdates() {
        // Update timer display every second
        this.timerInterval = setInterval(() => {
            // Timer updates are handled by the service
            // This interval is just for triggering UI updates
        }, 1000);
    }
    stopTimerUpdates() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = undefined;
        }
    }
}
