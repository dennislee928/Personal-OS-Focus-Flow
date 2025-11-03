/**
 * Capture Service - Handles rapid task entry with autocomplete and suggestions
 */

import { InboxItem, TaskSuggestion, CaptureMetrics } from '../types/ritual.js';
import { InboxService } from './inbox-service.js';

export interface CaptureServiceConfig {
  maxSuggestions: number;
  suggestionThreshold: number; // minimum characters to trigger suggestions
  autoSaveDelay: number; // milliseconds
  enableVoiceInput: boolean;
}

export interface CaptureResult {
  item: InboxItem;
  saveTime: number; // milliseconds taken to save
  usedAutocomplete: boolean;
}

export class CaptureService {
  private suggestions: TaskSuggestion[] = [];
  private metrics: CaptureMetrics = {
    entriesCount: 0,
    averageEntryTime: 0,
    keyboardShortcutsUsed: 0,
    voiceEntriesCount: 0,
    autocompleteUsed: 0
  };
  private config: CaptureServiceConfig;
  private saveCallbacks: ((item: InboxItem) => Promise<void>)[] = [];
  private inboxService?: InboxService;

  constructor(config: Partial<CaptureServiceConfig> = {}, inboxService?: InboxService) {
    this.config = {
      maxSuggestions: 5,
      suggestionThreshold: 2,
      autoSaveDelay: 50, // 50ms for sub-100ms response
      enableVoiceInput: true,
      ...config
    };
    
    this.inboxService = inboxService;
    
    // Set up inbox integration if available
    if (this.inboxService) {
      this.setupInboxIntegration();
    }
  }

  /**
   * Add a callback to be called when an item is saved
   */
  onItemSaved(callback: (item: InboxItem) => Promise<void>): void {
    this.saveCallbacks.push(callback);
  }

  /**
   * Capture a new task with instant save functionality
   */
  async captureTask(content: string, source: 'manual' | 'voice' = 'manual'): Promise<CaptureResult> {
    const startTime = performance.now();
    
    const item: InboxItem = {
      id: this.generateId(),
      content: content.trim(),
      createdAt: new Date(),
      source,
      tags: this.extractTags(content),
      estimatedDuration: this.estimateDuration(content),
      priority: this.calculatePriority(content)
    };

    // Instant save with optimistic UI
    const savePromise = this.saveItem(item);
    
    // Update suggestions based on new entry
    this.updateSuggestions(content);
    
    // Update metrics
    const saveTime = performance.now() - startTime;
    this.updateMetrics(saveTime, source === 'voice', false);

    // Wait for save to complete
    await savePromise;

    return {
      item,
      saveTime,
      usedAutocomplete: false
    };
  }

  /**
   * Get autocomplete suggestions based on input
   */
  getSuggestions(input: string): TaskSuggestion[] {
    if (input.length < this.config.suggestionThreshold) {
      return [];
    }

    const inputLower = input.toLowerCase();
    return this.suggestions
      .filter(suggestion => 
        suggestion.text.toLowerCase().includes(inputLower) ||
        suggestion.tags.some(tag => tag.toLowerCase().includes(inputLower))
      )
      .sort((a, b) => {
        // Sort by frequency and recency
        const aScore = a.frequency + (Date.now() - a.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        const bScore = b.frequency + (Date.now() - b.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        return bScore - aScore;
      })
      .slice(0, this.config.maxSuggestions);
  }

  /**
   * Capture task using autocomplete suggestion
   */
  async captureFromSuggestion(suggestion: TaskSuggestion): Promise<CaptureResult> {
    const startTime = performance.now();
    
    const item: InboxItem = {
      id: this.generateId(),
      content: suggestion.text,
      createdAt: new Date(),
      source: 'manual',
      tags: suggestion.tags,
      estimatedDuration: this.estimateDuration(suggestion.text),
      priority: this.calculatePriority(suggestion.text)
    };

    // Update suggestion usage
    suggestion.frequency++;
    suggestion.lastUsed = new Date();

    const savePromise = this.saveItem(item);
    
    const saveTime = performance.now() - startTime;
    this.updateMetrics(saveTime, false, true);

    await savePromise;

    return {
      item,
      saveTime,
      usedAutocomplete: true
    };
  }

  /**
   * Load suggestions from historical data
   */
  loadSuggestions(historicalItems: InboxItem[]): void {
    const suggestionMap = new Map<string, TaskSuggestion>();

    historicalItems.forEach(item => {
      const key = item.content.toLowerCase();
      if (suggestionMap.has(key)) {
        const suggestion = suggestionMap.get(key)!;
        suggestion.frequency++;
        if (item.createdAt > suggestion.lastUsed) {
          suggestion.lastUsed = item.createdAt;
        }
      } else {
        suggestionMap.set(key, {
          text: item.content,
          frequency: 1,
          lastUsed: item.createdAt,
          tags: item.tags
        });
      }
    });

    this.suggestions = Array.from(suggestionMap.values())
      .filter(s => s.frequency > 1) // Only suggest items used more than once
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Get current capture metrics
   */
  getMetrics(): CaptureMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (typically called at start of new ritual)
   */
  resetMetrics(): void {
    this.metrics = {
      entriesCount: 0,
      averageEntryTime: 0,
      keyboardShortcutsUsed: 0,
      voiceEntriesCount: 0,
      autocompleteUsed: 0
    };
  }

  private async saveItem(item: InboxItem): Promise<void> {
    // Call all registered save callbacks
    await Promise.all(this.saveCallbacks.map(callback => callback(item)));
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractTags(content: string): string[] {
    const tagRegex = /@(\w+)/g;
    const matches = content.match(tagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  private estimateDuration(content: string): number {
    // Simple heuristic based on content length and keywords
    const words = content.split(' ').length;
    const hasComplexKeywords = /research|analyze|design|implement|review/.test(content.toLowerCase());
    
    if (hasComplexKeywords) {
      return Math.max(30, words * 5); // 30+ minutes for complex tasks
    }
    
    return Math.max(5, words * 2); // 5+ minutes for simple tasks
  }

  private calculatePriority(content: string): number {
    let priority = 0;
    
    // Urgency indicators
    if (/urgent|asap|today|now/.test(content.toLowerCase())) priority += 3;
    if (/tomorrow|soon/.test(content.toLowerCase())) priority += 2;
    
    // Importance indicators
    if (/important|critical|key|essential/.test(content.toLowerCase())) priority += 2;
    if (/meeting|deadline|due/.test(content.toLowerCase())) priority += 1;
    
    return Math.min(5, priority); // Cap at 5
  }

  private updateSuggestions(content: string): void {
    const existing = this.suggestions.find(s => s.text.toLowerCase() === content.toLowerCase());
    
    if (existing) {
      existing.frequency++;
      existing.lastUsed = new Date();
    } else {
      this.suggestions.push({
        text: content,
        frequency: 1,
        lastUsed: new Date(),
        tags: this.extractTags(content)
      });
    }

    // Keep only top suggestions to prevent memory bloat
    this.suggestions = this.suggestions
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 100);
  }

  private updateMetrics(saveTime: number, isVoice: boolean, usedAutocomplete: boolean): void {
    this.metrics.entriesCount++;
    
    // Update average entry time
    const totalTime = this.metrics.averageEntryTime * (this.metrics.entriesCount - 1) + saveTime;
    this.metrics.averageEntryTime = totalTime / this.metrics.entriesCount;
    
    if (isVoice) {
      this.metrics.voiceEntriesCount++;
    }
    
    if (usedAutocomplete) {
      this.metrics.autocompleteUsed++;
    }
  }

  /**
   * Record keyboard shortcut usage
   */
  recordKeyboardShortcut(): void {
    this.metrics.keyboardShortcutsUsed++;
  }

  /**
   * Set inbox service for integration
   */
  setInboxService(inboxService: InboxService): void {
    this.inboxService = inboxService;
    this.setupInboxIntegration();
  }

  /**
   * Load suggestions from inbox service
   */
  async loadSuggestionsFromInbox(): Promise<void> {
    if (!this.inboxService) return;

    try {
      // Get recent items for suggestions
      const recentItems = await this.inboxService.getItems({
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date()
        }
      });

      this.loadSuggestions(recentItems);
    } catch (error) {
      console.error('Failed to load suggestions from inbox:', error);
    }
  }

  /**
   * Batch capture multiple items
   */
  async batchCapture(contents: string[], source: 'manual' | 'voice' = 'manual'): Promise<CaptureResult[]> {
    const results: CaptureResult[] = [];
    const items: InboxItem[] = [];

    for (const content of contents) {
      const startTime = performance.now();
      
      const item: InboxItem = {
        id: this.generateId(),
        content: content.trim(),
        createdAt: new Date(),
        source,
        tags: this.extractTags(content),
        estimatedDuration: this.estimateDuration(content),
        priority: this.calculatePriority(content)
      };

      items.push(item);
      
      const saveTime = performance.now() - startTime;
      this.updateMetrics(saveTime, source === 'voice', false);

      results.push({
        item,
        saveTime,
        usedAutocomplete: false
      });
    }

    // Batch save through inbox service
    if (this.inboxService) {
      await this.inboxService.saveItems(items);
    } else {
      // Fallback to individual saves
      await Promise.all(items.map(item => this.saveItem(item)));
    }

    return results;
  }

  private setupInboxIntegration(): void {
    if (!this.inboxService) return;

    // Add inbox service as a save callback
    this.onItemSaved(async (item: InboxItem) => {
      if (this.inboxService) {
        await this.inboxService.saveItem(item);
      }
    });
  }
}