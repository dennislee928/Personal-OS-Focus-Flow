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

export class ContextTagger {
  private config: ContextTaggerConfig;
  private state: ContextTaggerState;
  private suggestionRules: ContextSuggestionRule[] = [];

  constructor(config: Partial<ContextTaggerConfig> = {}) {
    this.config = {
      enableAutoSuggestion: true,
      showExplanations: true,
      enableCustomContexts: false,
      defaultContext: '@shallow',
      ...config
    };

    this.state = {
      selectedContext: this.config.defaultContext,
      availableContexts: [],
      suggestedContext: null,
      suggestionReason: '',
      customContexts: [],
      error: null
    };

    this.initializeContexts();
    this.setupDefaultSuggestionRules();
  }

  /**
   * Initialize tagger for a specific item
   */
  async initializeForItem(item: InboxItem): Promise<ContextTaggerState> {
    try {
      // Generate context suggestion
      if (this.config.enableAutoSuggestion) {
        const suggestion = this.generateContextSuggestion(item);
        this.state.suggestedContext = suggestion.context;
        this.state.suggestionReason = suggestion.reason;
        
        // Auto-select suggested context
        this.state.selectedContext = suggestion.context;
      } else {
        this.state.selectedContext = this.config.defaultContext;
        this.state.suggestedContext = null;
        this.state.suggestionReason = '';
      }

      this.state.error = null;
    } catch (error) {
      this.state.error = (error as Error).message;
    }

    return this.getState();
  }

  /**
   * Get current tagger state
   */
  getState(): ContextTaggerState {
    return { ...this.state };
  }

  /**
   * Select a context
   */
  selectContext(contextId: '@deep' | '@shallow' | string): ContextTaggerState {
    const context = this.state.availableContexts.find(c => c.id === contextId);
    if (!context) {
      this.state.error = 'Context not found';
      return this.getState();
    }

    this.state.selectedContext = contextId;
    this.state.error = null;

    return this.getState();
  }

  /**
   * Accept suggested context
   */
  acceptSuggestion(): ContextTaggerState {
    if (this.state.suggestedContext) {
      this.state.selectedContext = this.state.suggestedContext;
    }
    return this.getState();
  }

  /**
   * Reject suggested context and use default
   */
  rejectSuggestion(): ContextTaggerState {
    this.state.selectedContext = this.config.defaultContext;
    this.state.suggestedContext = null;
    this.state.suggestionReason = '';
    return this.getState();
  }

  /**
   * Add custom context (if enabled)
   */
  addCustomContext(context: Omit<ContextOption, 'id'> & { id: string }): ContextTaggerState {
    if (!this.config.enableCustomContexts) {
      this.state.error = 'Custom contexts are not enabled';
      return this.getState();
    }

    // Validate custom context ID format
    if (!context.id.startsWith('@')) {
      this.state.error = 'Custom context ID must start with @';
      return this.getState();
    }

    // Check for duplicates
    const exists = this.state.customContexts.some(c => c.id === context.id) ||
                   this.state.availableContexts.some(c => c.id === context.id);
    
    if (exists) {
      this.state.error = 'Context already exists';
      return this.getState();
    }

    this.state.customContexts.push(context);
    this.state.availableContexts.push(context);
    this.state.error = null;

    return this.getState();
  }

  /**
   * Remove custom context
   */
  removeCustomContext(contextId: string): ContextTaggerState {
    this.state.customContexts = this.state.customContexts.filter(c => c.id !== contextId);
    this.state.availableContexts = this.state.availableContexts.filter(c => c.id !== contextId);
    
    // Reset selection if removed context was selected
    if (this.state.selectedContext === contextId) {
      this.state.selectedContext = this.config.defaultContext;
    }

    return this.getState();
  }

  /**
   * Get context explanation
   */
  getContextExplanation(contextId: '@deep' | '@shallow' | string): string {
    const context = this.state.availableContexts.find(c => c.id === contextId);
    return context ? context.description : '';
  }

  /**
   * Get context examples
   */
  getContextExamples(contextId: '@deep' | '@shallow' | string): string[] {
    const context = this.state.availableContexts.find(c => c.id === contextId);
    return context ? context.examples : [];
  }

  /**
   * Validate current selection
   */
  validateSelection(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.state.selectedContext) {
      errors.push('Please select a context');
      return { isValid: false, errors, warnings };
    }

    // Validate that selected context exists
    const contextExists = this.state.availableContexts.some(c => c.id === this.state.selectedContext);
    if (!contextExists) {
      errors.push('Selected context is not valid');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get selected context
   */
  getSelectedContext(): '@deep' | '@shallow' | string {
    return this.state.selectedContext;
  }

  /**
   * Add suggestion rule
   */
  addSuggestionRule(rule: ContextSuggestionRule): void {
    this.suggestionRules.push(rule);
    // Sort by priority (higher priority first)
    this.suggestionRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove suggestion rule
   */
  removeSuggestionRule(ruleId: string): void {
    this.suggestionRules = this.suggestionRules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Get all suggestion rules
   */
  getSuggestionRules(): ContextSuggestionRule[] {
    return [...this.suggestionRules];
  }

  /**
   * Reset tagger state
   */
  reset(): ContextTaggerState {
    this.state = {
      selectedContext: this.config.defaultContext,
      availableContexts: this.state.availableContexts, // Keep loaded contexts
      suggestedContext: null,
      suggestionReason: '',
      customContexts: this.state.customContexts, // Keep custom contexts
      error: null
    };

    return this.getState();
  }

  private initializeContexts(): void {
    this.state.availableContexts = [
      {
        id: '@deep',
        label: 'Deep Work',
        description: 'Tasks requiring focused, uninterrupted attention and cognitive effort',
        icon: '🧠',
        color: '#4F46E5', // Indigo
        examples: [
          'Writing code or documentation',
          'Strategic planning and analysis',
          'Creative work and problem-solving',
          'Learning new skills or concepts',
          'Research and investigation'
        ]
      },
      {
        id: '@shallow',
        label: 'Shallow Work',
        description: 'Tasks that can be done with partial attention or are routine in nature',
        icon: '⚡',
        color: '#10B981', // Emerald
        examples: [
          'Responding to emails',
          'Administrative tasks',
          'Quick status updates',
          'Routine maintenance',
          'Simple data entry'
        ]
      }
    ];
  }

  private setupDefaultSuggestionRules(): void {
    // Development and coding tasks
    this.addSuggestionRule({
      id: 'development',
      name: 'Development Tasks',
      condition: (item) => /\b(code|develop|implement|debug|refactor|architect)\b/i.test(item.content),
      suggestedContext: '@deep',
      reason: 'Development tasks typically require focused attention',
      priority: 8
    });

    // Writing and documentation
    this.addSuggestionRule({
      id: 'writing',
      name: 'Writing Tasks',
      condition: (item) => /\b(write|document|draft|compose|article|blog)\b/i.test(item.content),
      suggestedContext: '@deep',
      reason: 'Writing tasks benefit from uninterrupted focus',
      priority: 7
    });

    // Research and analysis
    this.addSuggestionRule({
      id: 'research',
      name: 'Research Tasks',
      condition: (item) => /\b(research|analyze|investigate|study|explore)\b/i.test(item.content),
      suggestedContext: '@deep',
      reason: 'Research requires sustained concentration',
      priority: 7
    });

    // Email and communication
    this.addSuggestionRule({
      id: 'communication',
      name: 'Communication Tasks',
      condition: (item) => /\b(email|reply|respond|message|call|contact)\b/i.test(item.content),
      suggestedContext: '@shallow',
      reason: 'Communication tasks can be handled with partial attention',
      priority: 6
    });

    // Administrative tasks
    this.addSuggestionRule({
      id: 'administrative',
      name: 'Administrative Tasks',
      condition: (item) => /\b(admin|paperwork|form|update|schedule|organize)\b/i.test(item.content),
      suggestedContext: '@shallow',
      reason: 'Administrative tasks are typically routine',
      priority: 5
    });

    // Meeting preparation
    this.addSuggestionRule({
      id: 'meeting-prep',
      name: 'Meeting Preparation',
      condition: (item) => /\b(prepare|prep|meeting|presentation|agenda)\b/i.test(item.content),
      suggestedContext: '@deep',
      reason: 'Meeting preparation benefits from focused planning',
      priority: 6
    });

    // Quick tasks (based on estimated duration)
    this.addSuggestionRule({
      id: 'quick-tasks',
      name: 'Quick Tasks',
      condition: (item) => (item.estimatedDuration || 0) <= 15,
      suggestedContext: '@shallow',
      reason: 'Short tasks can often be handled as shallow work',
      priority: 4
    });

    // Long tasks (based on estimated duration)
    this.addSuggestionRule({
      id: 'long-tasks',
      name: 'Long Tasks',
      condition: (item) => (item.estimatedDuration || 0) >= 60,
      suggestedContext: '@deep',
      reason: 'Longer tasks typically require sustained focus',
      priority: 4
    });

    // Urgent tasks (might be shallow due to time pressure)
    this.addSuggestionRule({
      id: 'urgent-tasks',
      name: 'Urgent Tasks',
      condition: (item) => item.tags.includes('urgent') || /\b(urgent|asap|emergency)\b/i.test(item.content),
      suggestedContext: '@shallow',
      reason: 'Urgent tasks often need quick handling',
      priority: 3
    });
  }

  private generateContextSuggestion(item: InboxItem): {
    context: '@deep' | '@shallow';
    reason: string;
  } {
    // Find matching rules
    const matchingRules = this.suggestionRules.filter(rule => rule.condition(item));
    
    if (matchingRules.length === 0) {
      return {
        context: this.config.defaultContext,
        reason: 'No specific patterns detected, using default context'
      };
    }

    // Use the highest priority rule
    const topRule = matchingRules[0];
    
    return {
      context: topRule.suggestedContext,
      reason: topRule.reason
    };
  }
}