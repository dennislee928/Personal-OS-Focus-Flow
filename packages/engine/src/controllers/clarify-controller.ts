/**
 * Clarify Controller - Manages the GTD clarify step interface and user interactions
 */

import { InboxItem, ClarifyDecision } from '../types/ritual.js';
import { ClarifyService, ClarifySession, BatchCriteria } from '../services/clarify-service.js';

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

export class ClarifyController {
  private clarifyService: ClarifyService;
  private config: ClarifyControllerConfig;
  private timerInterval?: NodeJS.Timeout;
  private keyboardShortcuts: KeyboardShortcuts = {
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

  constructor(clarifyService: ClarifyService, config: Partial<ClarifyControllerConfig> = {}) {
    this.clarifyService = clarifyService;
    this.config = {
      enableKeyboardShortcuts: true,
      showProgressIndicator: true,
      enableBatchSuggestions: true,
      autoStartTimer: true,
      ...config
    };
  }

  /**
   * Start clarify process with inbox items
   */
  async startClarifyProcess(items: InboxItem[]): Promise<DecisionInterfaceState> {
    if (items.length === 0) {
      throw new Error('No items to clarify');
    }

    // Start clarify session
    const session = this.clarifyService.startSession(items);
    
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
  getCurrentState(): DecisionInterfaceState {
    const session = this.clarifyService.getCurrentSession();
    const currentItem = this.clarifyService.getCurrentItem();
    const progress = this.clarifyService.getSessionProgress();
    const timerRemaining = this.clarifyService.getRemainingTimerTime();
    const isTimerActive = session?.isTimerActive || false;

    let batchSuggestions: InboxItem[] = [];
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
      progress
    };
  }

  /**
   * Start the 2-minute timer for current item
   */
  startTwoMinuteTimer(): void {
    this.clarifyService.startTwoMinuteTimer();
  }

  /**
   * Stop the 2-minute timer
   */
  stopTwoMinuteTimer(): void {
    this.clarifyService.stopTwoMinuteTimer();
  }

  /**
   * Make a decision for the current item
   */
  async makeDecision(formData: DecisionFormData): Promise<DecisionInterfaceState> {
    // Validate form data
    this.validateDecisionForm(formData);

    // Create decision object
    const decision: Omit<ClarifyDecision, 'itemId'> = {
      action: formData.action,
      assignee: formData.assignee,
      dueDate: formData.dueDate,
      estimatedDuration: formData.estimatedDuration,
      context: formData.context
    };

    // Make the decision
    this.clarifyService.makeDecision(decision);

    // Auto-start timer for next item if enabled and not in batch mode
    const session = this.clarifyService.getCurrentSession();
    if (this.config.autoStartTimer && !session?.batchMode && !this.clarifyService.isSessionComplete()) {
      this.startTwoMinuteTimer();
    }

    return this.getCurrentState();
  }

  /**
   * Enable batch mode for similar items
   */
  async enableBatchMode(criteria: Partial<BatchCriteria> = {}): Promise<DecisionInterfaceState> {
    const currentItem = this.clarifyService.getCurrentItem();
    if (!currentItem) {
      throw new Error('No current item to base batch processing on');
    }

    // Default criteria for batch suggestions
    const defaultCriteria: Partial<BatchCriteria> = {
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
  async disableBatchMode(): Promise<DecisionInterfaceState> {
    this.clarifyService.disableBatchMode();
    return this.getCurrentState();
  }

  /**
   * Apply batch decision to selected items
   */
  async applyBatchDecision(formData: DecisionFormData, itemIds: string[]): Promise<DecisionInterfaceState> {
    if (itemIds.length === 0) {
      throw new Error('No items selected for batch processing');
    }

    // Validate form data
    this.validateDecisionForm(formData);

    // Create decision object
    const decision: Omit<ClarifyDecision, 'itemId'> = {
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
  async nextItem(): Promise<DecisionInterfaceState> {
    this.clarifyService.advanceToNextItem();
    
    // Auto-start timer for new item if enabled
    if (this.config.autoStartTimer && !this.clarifyService.isSessionComplete()) {
      this.startTwoMinuteTimer();
    }

    return this.getCurrentState();
  }

  /**
   * Navigate to previous item
   */
  async previousItem(): Promise<DecisionInterfaceState> {
    this.clarifyService.goToPreviousItem();
    
    // Auto-start timer for item if enabled
    if (this.config.autoStartTimer) {
      this.startTwoMinuteTimer();
    }

    return this.getCurrentState();
  }

  /**
   * Complete the clarify process
   */
  async completeClarifyProcess(): Promise<ClarifyDecision[]> {
    // Stop timer updates
    this.stopTimerUpdates();

    // Complete the session
    const decisions = this.clarifyService.completeSession();

    return decisions;
  }

  /**
   * Cancel the clarify process
   */
  async cancelClarifyProcess(): Promise<void> {
    // Stop timer updates
    this.stopTimerUpdates();

    // Cancel the session
    this.clarifyService.cancelSession();
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcut(key: string): Promise<DecisionInterfaceState | void> {
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
  getKeyboardShortcuts(): KeyboardShortcuts {
    return { ...this.keyboardShortcuts };
  }

  /**
   * Update keyboard shortcuts
   */
  updateKeyboardShortcuts(shortcuts: Partial<KeyboardShortcuts>): void {
    this.keyboardShortcuts = { ...this.keyboardShortcuts, ...shortcuts };
  }

  /**
   * Get clarify metrics
   */
  getMetrics() {
    return this.clarifyService.getMetrics();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopTimerUpdates();
  }

  private validateDecisionForm(formData: DecisionFormData): void {
    // Validate action
    if (!['do', 'delegate', 'defer'].includes(formData.action)) {
      throw new Error('Invalid action type');
    }

    // Validate action-specific fields
    switch (formData.action) {
      case 'delegate':
        if (!formData.assignee || formData.assignee.trim() === '') {
          throw new Error('Assignee is required for delegated items');
        }
        break;
      
      case 'defer':
        if (!formData.dueDate) {
          throw new Error('Due date is required for deferred items');
        }
        if (formData.dueDate <= new Date()) {
          throw new Error('Due date must be in the future');
        }
        break;
    }

    // Validate context
    if (!['@deep', '@shallow'].includes(formData.context)) {
      throw new Error('Context must be either @deep or @shallow');
    }

    // Validate estimated duration
    if (!formData.estimatedDuration || formData.estimatedDuration <= 0) {
      throw new Error('Estimated duration must be greater than 0');
    }
  }

  private async makeQuickDecision(action: 'do' | 'delegate' | 'defer'): Promise<DecisionInterfaceState> {
    const currentItem = this.clarifyService.getCurrentItem();
    if (!currentItem) {
      throw new Error('No current item to make decision for');
    }

    // Create default decision based on action and item properties
    const formData: DecisionFormData = {
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

  private generateBatchSuggestions(currentItem: InboxItem): InboxItem[] {
    // This would typically use the clarify service to find similar items
    // For now, return empty array as placeholder
    return [];
  }

  private startTimerUpdates(): void {
    // Update timer display every second
    this.timerInterval = setInterval(() => {
      // Timer updates are handled by the service
      // This interval is just for triggering UI updates
    }, 1000);
  }

  private stopTimerUpdates(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }
}