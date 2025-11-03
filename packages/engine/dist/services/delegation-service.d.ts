/**
 * Delegation Service - Handles delegation and deferral of clarified items
 */
import { InboxItem, ClarifyDecision } from '../types/ritual.js';
export interface Assignee {
    id: string;
    name: string;
    email?: string;
    role?: string;
    availability?: 'available' | 'busy' | 'away';
    workload?: number;
    skills?: string[];
}
export interface DelegationRule {
    id: string;
    name: string;
    condition: (item: InboxItem) => boolean;
    suggestedAssignee: string;
    priority: number;
}
export interface DeferralTemplate {
    id: string;
    name: string;
    description: string;
    defaultDuration: number;
    context: '@deep' | '@shallow';
    tags: string[];
}
export interface DelegationServiceConfig {
    enableAssigneeValidation: boolean;
    enableWorkloadTracking: boolean;
    enableDelegationRules: boolean;
    maxDelegationDepth: number;
    defaultDeferralDays: number;
}
export interface DelegationMetrics {
    totalDelegated: number;
    totalDeferred: number;
    delegationsByAssignee: Record<string, number>;
    deferralsByDuration: Record<string, number>;
    averageDelegationTime: number;
    averageDeferralDuration: number;
}
export declare class DelegationService {
    private config;
    private assignees;
    private delegationRules;
    private deferralTemplates;
    private metrics;
    constructor(config?: Partial<DelegationServiceConfig>);
    /**
     * Add an assignee to the system
     */
    addAssignee(assignee: Assignee): void;
    /**
     * Remove an assignee from the system
     */
    removeAssignee(assigneeId: string): void;
    /**
     * Get all available assignees
     */
    getAssignees(): Assignee[];
    /**
     * Get available assignees filtered by criteria
     */
    getAvailableAssignees(criteria?: {
        availability?: 'available' | 'busy' | 'away';
        maxWorkload?: number;
        requiredSkills?: string[];
    }): Assignee[];
    /**
     * Suggest assignees for an item based on delegation rules
     */
    suggestAssignees(item: InboxItem): Assignee[];
    /**
     * Validate delegation decision
     */
    validateDelegation(decision: ClarifyDecision, item: InboxItem): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Process delegation decision
     */
    processDelegation(decision: ClarifyDecision, item: InboxItem): Promise<void>;
    /**
     * Add delegation rule
     */
    addDelegationRule(rule: DelegationRule): void;
    /**
     * Remove delegation rule
     */
    removeDelegationRule(ruleId: string): void;
    /**
     * Get all delegation rules
     */
    getDelegationRules(): DelegationRule[];
    /**
     * Get deferral templates
     */
    getDeferralTemplates(): DeferralTemplate[];
    /**
     * Add deferral template
     */
    addDeferralTemplate(template: DeferralTemplate): void;
    /**
     * Remove deferral template
     */
    removeDeferralTemplate(templateId: string): void;
    /**
     * Suggest deferral options for an item
     */
    suggestDeferralOptions(item: InboxItem): Array<{
        template: DeferralTemplate;
        suggestedDate: Date;
    }>;
    /**
     * Validate deferral decision
     */
    validateDeferral(decision: ClarifyDecision, item: InboxItem): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Process deferral decision
     */
    processDeferral(decision: ClarifyDecision, item: InboxItem): Promise<void>;
    /**
     * Get delegation and deferral metrics
     */
    getMetrics(): DelegationMetrics;
    /**
     * Reset metrics
     */
    resetMetrics(): void;
    private setupDefaultDeferralTemplates;
    private updateDelegationMetrics;
    private updateDeferralMetrics;
    private getDeferralDurationKey;
}
