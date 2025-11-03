/**
 * Clarify Service - Implements GTD clarify step with 2-minute rule
 */
import { InboxItem, ClarifyDecision } from '../types/ritual.js';
export interface ClarifyServiceConfig {
    twoMinuteThreshold: number;
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
    averageDecisionTime: number;
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
export declare class ClarifyService {
    private config;
    private currentSession;
    private metrics;
    constructor(config?: Partial<ClarifyServiceConfig>);
    /**
     * Start a new clarify session with inbox items
     */
    startSession(items: InboxItem[]): ClarifySession;
    /**
     * Get the current clarify session
     */
    getCurrentSession(): ClarifySession | null;
    /**
     * Get the current item being processed
     */
    getCurrentItem(): InboxItem | null;
    /**
     * Start the 2-minute timer for current item
     */
    startTwoMinuteTimer(): void;
    /**
     * Stop the 2-minute timer
     */
    stopTwoMinuteTimer(): void;
    /**
     * Get remaining time on 2-minute timer
     */
    getRemainingTimerTime(): number;
    /**
     * Check if 2-minute timer has expired
     */
    isTimerExpired(): boolean;
    /**
     * Make a decision for the current item
     */
    makeDecision(decision: Omit<ClarifyDecision, 'itemId'>): void;
    /**
     * Enable batch mode for similar items
     */
    enableBatchMode(action: 'do' | 'delegate' | 'defer', criteria?: Partial<BatchCriteria>): void;
    /**
     * Disable batch mode
     */
    disableBatchMode(): void;
    /**
     * Apply batch decision to similar items
     */
    applyBatchDecision(decision: Omit<ClarifyDecision, 'itemId'>, itemIds: string[]): void;
    /**
     * Skip to next unprocessed item
     */
    advanceToNextItem(): void;
    /**
     * Go back to previous item
     */
    goToPreviousItem(): void;
    /**
     * Check if session is complete
     */
    isSessionComplete(): boolean;
    /**
     * Get session progress
     */
    getSessionProgress(): {
        current: number;
        total: number;
        percentage: number;
    };
    /**
     * Complete the current session
     */
    completeSession(): ClarifyDecision[];
    /**
     * Cancel the current session
     */
    cancelSession(): void;
    /**
     * Get current metrics
     */
    getMetrics(): ClarifyMetrics;
    /**
     * Reset metrics
     */
    resetMetrics(): void;
    private validateDecision;
    private findSimilarItems;
    private calculateContentSimilarity;
    private skipProcessedItems;
    private updateMetrics;
    private generateSessionId;
}
