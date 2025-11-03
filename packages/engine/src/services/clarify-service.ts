/**
 * Clarify Service - Implements GTD clarify step with 2-minute rule
 */

import { InboxItem, ClarifyDecision } from '../types/ritual.js';

export interface ClarifyServiceConfig {
  twoMinuteThreshold: number; // milliseconds
  batchProcessingEnabled: boolean;
  autoAdvanceEnabled: boolean;
  contextPreservationEnabled: boolean;
}

export interface ClarifySession {
  id: string;
  startTime: Date;
  items: InboxItem[];
  decisions: ClarifyDecision[];
  currentItemIndex: number;
  timerStartTime?: Date;
  isTimerActive: boolean;
  batchMode: boolean;
  batchAction?: 'do' | 'delegate' | 'defer';
}

export interface ClarifyMetrics {
  totalItemsProcessed: number;
  averageDecisionTime: number; // milliseconds
  twoMinuteRuleUsage: number;
  batchOperationsCount: number;
  delegatedItemsCount: number;
  deferredItemsCount: number;
  immediateActionCount: number;
}

export interface BatchCriteria {
  similarContent: boolean;
  sameEstimatedDuration: boolean;
  sameContext: boolean;
  samePriority: boolean;
}

export class ClarifyService {
  private config: ClarifyServiceConfig;
  private currentSession: ClarifySession | null = null;
  private metrics: ClarifyMetrics = {
    totalItemsProcessed: 0,
    averageDecisionTime: 0,
    twoMinuteRuleUsage: 0,
    batchOperationsCount: 0,
    delegatedItemsCount: 0,
    deferredItemsCount: 0,
    immediateActionCount: 0
  };

  constructor(config: Partial<ClarifyServiceConfig> = {}) {
    this.config = {
      twoMinuteThreshold: 120000, // 2 minutes in milliseconds
      batchProcessingEnabled: true,
      autoAdvanceEnabled: true,
      contextPreservationEnabled: true,
      ...config
    };
  }

  /**
   * Start a new clarify session with inbox items
   */
  startSession(items: InboxItem[]): ClarifySession {
    if (this.currentSession) {
      throw new Error('A clarify session is already in progress');
    }

    this.currentSession = {
      id: this.generateSessionId(),
      startTime: new Date(),
      items: [...items],
      decisions: [],
      currentItemIndex: 0,
      isTimerActive: false,
      batchMode: false
    };

    return { ...this.currentSession };
  }

  /**
   * Get the current clarify session
   */
  getCurrentSession(): ClarifySession | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * Get the current item being processed
   */
  getCurrentItem(): InboxItem | null {
    if (!this.currentSession || this.currentSession.currentItemIndex >= this.currentSession.items.length) {
      return null;
    }

    return this.currentSession.items[this.currentSession.currentItemIndex];
  }

  /**
   * Start the 2-minute timer for current item
   */
  startTwoMinuteTimer(): void {
    if (!this.currentSession) {
      throw new Error('No active clarify session');
    }

    this.currentSession.timerStartTime = new Date();
    this.currentSession.isTimerActive = true;
  }

  /**
   * Stop the 2-minute timer
   */
  stopTwoMinuteTimer(): void {
    if (!this.currentSession) {
      throw new Error('No active clarify session');
    }

    this.currentSession.isTimerActive = false;
    this.currentSession.timerStartTime = undefined;
  }

  /**
   * Get remaining time on 2-minute timer
   */
  getRemainingTimerTime(): number {
    if (!this.currentSession || !this.currentSession.isTimerActive || !this.currentSession.timerStartTime) {
      return 0;
    }

    const elapsed = Date.now() - this.currentSession.timerStartTime.getTime();
    const remaining = this.config.twoMinuteThreshold - elapsed;
    return Math.max(0, remaining);
  }

  /**
   * Check if 2-minute timer has expired
   */
  isTimerExpired(): boolean {
    return this.getRemainingTimerTime() === 0;
  }

  /**
   * Make a decision for the current item
   */
  makeDecision(decision: Omit<ClarifyDecision, 'itemId'>): void {
    if (!this.currentSession) {
      throw new Error('No active clarify session');
    }

    const currentItem = this.getCurrentItem();
    if (!currentItem) {
      throw new Error('No current item to make decision for');
    }

    const decisionStartTime = this.currentSession.timerStartTime || new Date();
    const decisionTime = Date.now() - decisionStartTime.getTime();

    const fullDecision: ClarifyDecision = {
      ...decision,
      itemId: currentItem.id
    };

    // Validate decision based on action type
    this.validateDecision(fullDecision);

    // Add decision to session
    this.currentSession.decisions.push(fullDecision);

    // Update metrics
    this.updateMetrics(fullDecision, decisionTime);

    // Stop timer and advance to next item
    this.stopTwoMinuteTimer();
    
    if (this.config.autoAdvanceEnabled) {
      this.advanceToNextItem();
    }
  }

  /**
   * Enable batch mode for similar items
   */
  enableBatchMode(action: 'do' | 'delegate' | 'defer', criteria: Partial<BatchCriteria> = {}): void {
    if (!this.currentSession) {
      throw new Error('No active clarify session');
    }

    if (!this.config.batchProcessingEnabled) {
      throw new Error('Batch processing is disabled');
    }

    this.currentSession.batchMode = true;
    this.currentSession.batchAction = action;

    // Find similar items based on criteria
    const currentItem = this.getCurrentItem();
    if (currentItem) {
      const similarItems = this.findSimilarItems(currentItem, criteria);
      console.log(`Found ${similarItems.length} similar items for batch processing`);
    }
  }

  /**
   * Disable batch mode
   */
  disableBatchMode(): void {
    if (!this.currentSession) {
      throw new Error('No active clarify session');
    }

    this.currentSession.batchMode = false;
    this.currentSession.batchAction = undefined;
  }

  /**
   * Apply batch decision to similar items
   */
  applyBatchDecision(decision: Omit<ClarifyDecision, 'itemId'>, itemIds: string[]): void {
    if (!this.currentSession) {
      throw new Error('No active clarify session');
    }

    if (!this.currentSession.batchMode) {
      throw new Error('Batch mode is not enabled');
    }

    const batchStartTime = Date.now();

    for (const itemId of itemIds) {
      const item = this.currentSession.items.find(i => i.id === itemId);
      if (!item) continue;

      const fullDecision: ClarifyDecision = {
        ...decision,
        itemId
      };

      this.validateDecision(fullDecision);
      this.currentSession.decisions.push(fullDecision);
    }

    // Update batch metrics
    this.metrics.batchOperationsCount++;
    const batchTime = Date.now() - batchStartTime;
    console.log(`Batch processed ${itemIds.length} items in ${batchTime}ms`);

    // Advance past processed items
    this.skipProcessedItems();
  }

  /**
   * Skip to next unprocessed item
   */
  advanceToNextItem(): void {
    if (!this.currentSession) {
      throw new Error('No active clarify session');
    }

    this.currentSession.currentItemIndex++;
    
    // Skip items that have already been processed in batch
    this.skipProcessedItems();
  }

  /**
   * Go back to previous item
   */
  goToPreviousItem(): void {
    if (!this.currentSession) {
      throw new Error('No active clarify session');
    }

    if (this.currentSession.currentItemIndex > 0) {
      this.currentSession.currentItemIndex--;
    }
  }

  /**
   * Check if session is complete
   */
  isSessionComplete(): boolean {
    if (!this.currentSession) {
      return false;
    }

    return this.currentSession.currentItemIndex >= this.currentSession.items.length;
  }

  /**
   * Get session progress
   */
  getSessionProgress(): { current: number; total: number; percentage: number } {
    if (!this.currentSession) {
      return { current: 0, total: 0, percentage: 0 };
    }

    const current = this.currentSession.currentItemIndex;
    const total = this.currentSession.items.length;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    return { current, total, percentage };
  }

  /**
   * Complete the current session
   */
  completeSession(): ClarifyDecision[] {
    if (!this.currentSession) {
      throw new Error('No active clarify session');
    }

    const decisions = [...this.currentSession.decisions];
    this.currentSession = null;

    return decisions;
  }

  /**
   * Cancel the current session
   */
  cancelSession(): void {
    this.currentSession = null;
  }

  /**
   * Get current metrics
   */
  getMetrics(): ClarifyMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalItemsProcessed: 0,
      averageDecisionTime: 0,
      twoMinuteRuleUsage: 0,
      batchOperationsCount: 0,
      delegatedItemsCount: 0,
      deferredItemsCount: 0,
      immediateActionCount: 0
    };
  }

  private validateDecision(decision: ClarifyDecision): void {
    // Validate required fields based on action type
    switch (decision.action) {
      case 'delegate':
        if (!decision.assignee || decision.assignee.trim() === '') {
          throw new Error('Assignee is required for delegated items');
        }
        break;
      
      case 'defer':
        if (!decision.dueDate) {
          throw new Error('Due date is required for deferred items');
        }
        if (decision.dueDate <= new Date()) {
          throw new Error('Due date must be in the future');
        }
        break;
      
      case 'do':
        // No additional validation required for immediate action
        break;
      
      default:
        throw new Error(`Invalid action type: ${decision.action}`);
    }

    // Validate context
    if (!['@deep', '@shallow'].includes(decision.context)) {
      throw new Error('Context must be either @deep or @shallow');
    }

    // Validate estimated duration
    if (decision.estimatedDuration <= 0) {
      throw new Error('Estimated duration must be greater than 0');
    }
  }

  private findSimilarItems(referenceItem: InboxItem, criteria: Partial<BatchCriteria>): InboxItem[] {
    if (!this.currentSession) {
      return [];
    }

    return this.currentSession.items.filter(item => {
      if (item.id === referenceItem.id) return false;
      
      // Check if item has already been processed
      const alreadyProcessed = this.currentSession!.decisions.some(d => d.itemId === item.id);
      if (alreadyProcessed) return false;

      // Apply similarity criteria
      if (criteria.similarContent) {
        const similarity = this.calculateContentSimilarity(referenceItem.content, item.content);
        if (similarity < 0.7) return false; // 70% similarity threshold
      }

      if (criteria.sameEstimatedDuration && item.estimatedDuration !== referenceItem.estimatedDuration) {
        return false;
      }

      if (criteria.samePriority && item.priority !== referenceItem.priority) {
        return false;
      }

      if (criteria.sameContext) {
        const referenceHasDeepTag = referenceItem.tags.includes('deep');
        const itemHasDeepTag = item.tags.includes('deep');
        if (referenceHasDeepTag !== itemHasDeepTag) return false;
      }

      return true;
    });
  }

  private calculateContentSimilarity(content1: string, content2: string): number {
    // Simple word-based similarity calculation
    const words1 = content1.toLowerCase().split(/\s+/);
    const words2 = content2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  private skipProcessedItems(): void {
    if (!this.currentSession) return;

    while (this.currentSession.currentItemIndex < this.currentSession.items.length) {
      const currentItem = this.getCurrentItem();
      if (!currentItem) break;

      const alreadyProcessed = this.currentSession.decisions.some(d => d.itemId === currentItem.id);
      if (!alreadyProcessed) break;

      this.currentSession.currentItemIndex++;
    }
  }

  private updateMetrics(decision: ClarifyDecision, decisionTime: number): void {
    this.metrics.totalItemsProcessed++;

    // Update average decision time
    const totalTime = this.metrics.averageDecisionTime * (this.metrics.totalItemsProcessed - 1) + decisionTime;
    this.metrics.averageDecisionTime = totalTime / this.metrics.totalItemsProcessed;

    // Update action-specific metrics
    switch (decision.action) {
      case 'do':
        this.metrics.immediateActionCount++;
        break;
      case 'delegate':
        this.metrics.delegatedItemsCount++;
        break;
      case 'defer':
        this.metrics.deferredItemsCount++;
        break;
    }

    // Check if 2-minute rule was used
    if (decisionTime <= this.config.twoMinuteThreshold) {
      this.metrics.twoMinuteRuleUsage++;
    }
  }

  private generateSessionId(): string {
    return `clarify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}