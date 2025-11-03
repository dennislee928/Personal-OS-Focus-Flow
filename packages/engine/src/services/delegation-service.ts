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
  workload?: number; // 0-100 percentage
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
  defaultDuration: number; // days
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

export class DelegationService {
  private config: DelegationServiceConfig;
  private assignees: Map<string, Assignee> = new Map();
  private delegationRules: DelegationRule[] = [];
  private deferralTemplates: DeferralTemplate[] = [];
  private metrics: DelegationMetrics = {
    totalDelegated: 0,
    totalDeferred: 0,
    delegationsByAssignee: {},
    deferralsByDuration: {},
    averageDelegationTime: 0,
    averageDeferralDuration: 0
  };

  constructor(config: Partial<DelegationServiceConfig> = {}) {
    this.config = {
      enableAssigneeValidation: true,
      enableWorkloadTracking: true,
      enableDelegationRules: true,
      maxDelegationDepth: 3,
      defaultDeferralDays: 1,
      ...config
    };

    this.setupDefaultDeferralTemplates();
  }

  /**
   * Add an assignee to the system
   */
  addAssignee(assignee: Assignee): void {
    this.assignees.set(assignee.id, assignee);
  }

  /**
   * Remove an assignee from the system
   */
  removeAssignee(assigneeId: string): void {
    this.assignees.delete(assigneeId);
  }

  /**
   * Get all available assignees
   */
  getAssignees(): Assignee[] {
    return Array.from(this.assignees.values());
  }

  /**
   * Get available assignees filtered by criteria
   */
  getAvailableAssignees(criteria?: {
    availability?: 'available' | 'busy' | 'away';
    maxWorkload?: number;
    requiredSkills?: string[];
  }): Assignee[] {
    let assignees = this.getAssignees();

    if (criteria) {
      assignees = assignees.filter(assignee => {
        // Filter by availability
        if (criteria.availability && assignee.availability !== criteria.availability) {
          return false;
        }

        // Filter by workload
        if (criteria.maxWorkload !== undefined && assignee.workload !== undefined) {
          if (assignee.workload > criteria.maxWorkload) {
            return false;
          }
        }

        // Filter by required skills
        if (criteria.requiredSkills && criteria.requiredSkills.length > 0) {
          if (!assignee.skills || !criteria.requiredSkills.every(skill => 
            assignee.skills!.includes(skill)
          )) {
            return false;
          }
        }

        return true;
      });
    }

    return assignees;
  }

  /**
   * Suggest assignees for an item based on delegation rules
   */
  suggestAssignees(item: InboxItem): Assignee[] {
    if (!this.config.enableDelegationRules) {
      return this.getAvailableAssignees();
    }

    // Find matching delegation rules
    const matchingRules = this.delegationRules
      .filter(rule => rule.condition(item))
      .sort((a, b) => b.priority - a.priority);

    const suggestedAssigneeIds = new Set<string>();
    
    // Add suggested assignees from rules
    for (const rule of matchingRules) {
      suggestedAssigneeIds.add(rule.suggestedAssignee);
    }

    // Get assignee objects
    const suggestedAssignees = Array.from(suggestedAssigneeIds)
      .map(id => this.assignees.get(id))
      .filter((assignee): assignee is Assignee => assignee !== undefined);

    // If no rules matched, return available assignees
    if (suggestedAssignees.length === 0) {
      return this.getAvailableAssignees({ availability: 'available', maxWorkload: 80 });
    }

    return suggestedAssignees;
  }

  /**
   * Validate delegation decision
   */
  validateDelegation(decision: ClarifyDecision, item: InboxItem): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (decision.action !== 'delegate') {
      errors.push('Decision action must be "delegate"');
      return { isValid: false, errors, warnings };
    }

    // Validate assignee
    if (!decision.assignee || decision.assignee.trim() === '') {
      errors.push('Assignee is required for delegation');
    } else if (this.config.enableAssigneeValidation) {
      const assignee = this.assignees.get(decision.assignee);
      if (!assignee) {
        errors.push(`Assignee "${decision.assignee}" not found`);
      } else {
        // Check availability
        if (assignee.availability === 'away') {
          warnings.push(`Assignee "${assignee.name}" is currently away`);
        }

        // Check workload
        if (this.config.enableWorkloadTracking && assignee.workload !== undefined) {
          if (assignee.workload > 90) {
            warnings.push(`Assignee "${assignee.name}" has high workload (${assignee.workload}%)`);
          }
        }
      }
    }

    // Validate estimated duration
    if (decision.estimatedDuration <= 0) {
      errors.push('Estimated duration must be greater than 0');
    }

    // Validate context
    if (!['@deep', '@shallow'].includes(decision.context)) {
      errors.push('Context must be either @deep or @shallow');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Process delegation decision
   */
  async processDelegation(decision: ClarifyDecision, item: InboxItem): Promise<void> {
    // Validate delegation
    const validation = this.validateDelegation(decision, item);
    if (!validation.isValid) {
      throw new Error(`Delegation validation failed: ${validation.errors.join(', ')}`);
    }

    // Update assignee workload if tracking is enabled
    if (this.config.enableWorkloadTracking && decision.assignee) {
      const assignee = this.assignees.get(decision.assignee);
      if (assignee && assignee.workload !== undefined) {
        // Estimate workload impact (simplified calculation)
        const workloadImpact = Math.min(decision.estimatedDuration / 60 * 10, 20); // Max 20% per task
        assignee.workload = Math.min(100, assignee.workload + workloadImpact);
      }
    }

    // Update metrics
    this.updateDelegationMetrics(decision);

    // Log delegation (in real implementation, this would integrate with external systems)
    console.log(`Delegated item "${item.content}" to ${decision.assignee}`);
  }

  /**
   * Add delegation rule
   */
  addDelegationRule(rule: DelegationRule): void {
    this.delegationRules.push(rule);
    // Sort by priority
    this.delegationRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove delegation rule
   */
  removeDelegationRule(ruleId: string): void {
    this.delegationRules = this.delegationRules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Get all delegation rules
   */
  getDelegationRules(): DelegationRule[] {
    return [...this.delegationRules];
  }

  /**
   * Get deferral templates
   */
  getDeferralTemplates(): DeferralTemplate[] {
    return [...this.deferralTemplates];
  }

  /**
   * Add deferral template
   */
  addDeferralTemplate(template: DeferralTemplate): void {
    this.deferralTemplates.push(template);
  }

  /**
   * Remove deferral template
   */
  removeDeferralTemplate(templateId: string): void {
    this.deferralTemplates = this.deferralTemplates.filter(t => t.id !== templateId);
  }

  /**
   * Suggest deferral options for an item
   */
  suggestDeferralOptions(item: InboxItem): Array<{
    template: DeferralTemplate;
    suggestedDate: Date;
  }> {
    return this.deferralTemplates.map(template => {
      const suggestedDate = new Date();
      suggestedDate.setDate(suggestedDate.getDate() + template.defaultDuration);
      
      return {
        template,
        suggestedDate
      };
    });
  }

  /**
   * Validate deferral decision
   */
  validateDeferral(decision: ClarifyDecision, item: InboxItem): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (decision.action !== 'defer') {
      errors.push('Decision action must be "defer"');
      return { isValid: false, errors, warnings };
    }

    // Validate due date
    if (!decision.dueDate) {
      errors.push('Due date is required for deferral');
    } else {
      const now = new Date();
      if (decision.dueDate <= now) {
        errors.push('Due date must be in the future');
      }

      // Check if deferral is too far in the future
      const daysDiff = Math.ceil((decision.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        warnings.push('Deferral date is more than a year in the future');
      }
    }

    // Validate estimated duration
    if (decision.estimatedDuration <= 0) {
      errors.push('Estimated duration must be greater than 0');
    }

    // Validate context
    if (!['@deep', '@shallow'].includes(decision.context)) {
      errors.push('Context must be either @deep or @shallow');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Process deferral decision
   */
  async processDeferral(decision: ClarifyDecision, item: InboxItem): Promise<void> {
    // Validate deferral
    const validation = this.validateDeferral(decision, item);
    if (!validation.isValid) {
      throw new Error(`Deferral validation failed: ${validation.errors.join(', ')}`);
    }

    // Update metrics
    this.updateDeferralMetrics(decision);

    // Log deferral (in real implementation, this would integrate with external systems)
    console.log(`Deferred item "${item.content}" until ${decision.dueDate?.toDateString()}`);
  }

  /**
   * Get delegation and deferral metrics
   */
  getMetrics(): DelegationMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalDelegated: 0,
      totalDeferred: 0,
      delegationsByAssignee: {},
      deferralsByDuration: {},
      averageDelegationTime: 0,
      averageDeferralDuration: 0
    };
  }

  private setupDefaultDeferralTemplates(): void {
    // Tomorrow
    this.addDeferralTemplate({
      id: 'tomorrow',
      name: 'Tomorrow',
      description: 'Defer until tomorrow',
      defaultDuration: 1,
      context: '@shallow',
      tags: ['quick', 'daily']
    });

    // Next week
    this.addDeferralTemplate({
      id: 'next-week',
      name: 'Next Week',
      description: 'Defer until next week',
      defaultDuration: 7,
      context: '@deep',
      tags: ['weekly', 'planning']
    });

    // Next month
    this.addDeferralTemplate({
      id: 'next-month',
      name: 'Next Month',
      description: 'Defer until next month',
      defaultDuration: 30,
      context: '@deep',
      tags: ['monthly', 'project']
    });

    // Someday/Maybe
    this.addDeferralTemplate({
      id: 'someday',
      name: 'Someday/Maybe',
      description: 'Defer indefinitely for future consideration',
      defaultDuration: 90,
      context: '@deep',
      tags: ['someday', 'maybe', 'future']
    });
  }

  private updateDelegationMetrics(decision: ClarifyDecision): void {
    this.metrics.totalDelegated++;
    
    if (decision.assignee) {
      this.metrics.delegationsByAssignee[decision.assignee] = 
        (this.metrics.delegationsByAssignee[decision.assignee] || 0) + 1;
    }

    // Update average delegation time (estimated duration)
    const totalTime = this.metrics.averageDelegationTime * (this.metrics.totalDelegated - 1) + decision.estimatedDuration;
    this.metrics.averageDelegationTime = totalTime / this.metrics.totalDelegated;
  }

  private updateDeferralMetrics(decision: ClarifyDecision): void {
    this.metrics.totalDeferred++;

    if (decision.dueDate) {
      const daysDiff = Math.ceil((decision.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const durationKey = this.getDeferralDurationKey(daysDiff);
      this.metrics.deferralsByDuration[durationKey] = 
        (this.metrics.deferralsByDuration[durationKey] || 0) + 1;

      // Update average deferral duration
      const totalDuration = this.metrics.averageDeferralDuration * (this.metrics.totalDeferred - 1) + daysDiff;
      this.metrics.averageDeferralDuration = totalDuration / this.metrics.totalDeferred;
    }
  }

  private getDeferralDurationKey(days: number): string {
    if (days <= 1) return '1-day';
    if (days <= 7) return '1-week';
    if (days <= 30) return '1-month';
    if (days <= 90) return '3-months';
    return 'long-term';
  }
}