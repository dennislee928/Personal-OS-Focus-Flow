/**
 * Capture Controller - Manages the rapid task entry interface
 */

import { CaptureService, CaptureResult } from '../services/capture-service.js';
import { VoiceService, VoiceStatus, VoiceCommand, VoiceRecognitionResult, VoiceError } from '../services/voice-service.js';
import { InboxItem, TaskSuggestion } from '../types/ritual.js';

export interface KeyboardShortcuts {
  quickSave: string; // Default: 'Enter'
  newLine: string; // Default: 'Shift+Enter'
  clearInput: string; // Default: 'Escape'
  showSuggestions: string; // Default: 'Ctrl+Space'
  nextSuggestion: string; // Default: 'ArrowDown'
  prevSuggestion: string; // Default: 'ArrowUp'
  acceptSuggestion: string; // Default: 'Tab'
}

export interface CaptureUIState {
  inputValue: string;
  suggestions: TaskSuggestion[];
  selectedSuggestionIndex: number;
  isLoading: boolean;
  showSuggestions: boolean;
  lastSaveTime: number;
  voiceStatus: VoiceStatus;
  voiceTranscript: string;
  voiceConfidence: number;
  isVoiceEnabled: boolean;
}

export interface CaptureControllerEvents {
  onItemCaptured: (result: CaptureResult) => void;
  onInputChange: (value: string, suggestions: TaskSuggestion[]) => void;
  onError: (error: Error) => void;
  onMetricsUpdate: (metrics: any) => void;
  onVoiceStatusChange: (status: VoiceStatus) => void;
  onVoiceResult: (result: VoiceRecognitionResult) => void;
  onVoiceCommand: (command: VoiceCommand) => void;
}

export class CaptureController {
  private captureService: CaptureService;
  private voiceService: VoiceService;
  private uiState: CaptureUIState;
  private events: Partial<CaptureControllerEvents> = {};
  private shortcuts: KeyboardShortcuts;
  private inputDebounceTimer?: NodeJS.Timeout;

  constructor(
    captureService: CaptureService, 
    voiceService: VoiceService,
    shortcuts?: Partial<KeyboardShortcuts>
  ) {
    this.captureService = captureService;
    this.voiceService = voiceService;
    this.shortcuts = {
      quickSave: 'Enter',
      newLine: 'Shift+Enter',
      clearInput: 'Escape',
      showSuggestions: 'Ctrl+Space',
      nextSuggestion: 'ArrowDown',
      prevSuggestion: 'ArrowUp',
      acceptSuggestion: 'Tab',
      ...shortcuts
    };

    this.uiState = {
      inputValue: '',
      suggestions: [],
      selectedSuggestionIndex: -1,
      isLoading: false,
      showSuggestions: false,
      lastSaveTime: 0,
      voiceStatus: VoiceStatus.IDLE,
      voiceTranscript: '',
      voiceConfidence: 0,
      isVoiceEnabled: voiceService.isVoiceSupported()
    };

    this.setupVoiceHandlers();
  }

  /**
   * Register event handlers
   */
  on<K extends keyof CaptureControllerEvents>(
    event: K,
    handler: CaptureControllerEvents[K]
  ): void {
    this.events[event] = handler;
  }

  /**
   * Initialize the capture interface
   */
  async initialize(historicalItems: InboxItem[] = []): Promise<void> {
    try {
      // Load suggestions from historical data
      this.captureService.loadSuggestions(historicalItems);
      
      // Reset metrics for new session
      this.captureService.resetMetrics();
      
      // Set up auto-save callback
      this.captureService.onItemSaved(async (item) => {
        // Handle successful save
        this.uiState.lastSaveTime = performance.now();
      });

    } catch (error) {
      this.events.onError?.(error as Error);
    }
  }

  /**
   * Handle input value changes with debounced suggestions
   */
  handleInputChange(value: string): void {
    this.uiState.inputValue = value;
    this.uiState.selectedSuggestionIndex = -1;

    // Clear existing debounce timer
    if (this.inputDebounceTimer) {
      clearTimeout(this.inputDebounceTimer);
    }

    // Debounce suggestion updates for performance
    this.inputDebounceTimer = setTimeout(() => {
      this.updateSuggestions(value);
    }, 100); // 100ms debounce

    this.events.onInputChange?.(value, this.uiState.suggestions);
  }

  /**
   * Handle keyboard shortcuts and navigation
   */
  async handleKeyboardEvent(event: KeyboardEvent): Promise<boolean> {
    const key = this.getKeyCombo(event);
    
    try {
      switch (key) {
        case this.shortcuts.quickSave:
          if (this.uiState.inputValue.trim()) {
            await this.captureCurrentInput();
            this.captureService.recordKeyboardShortcut();
            return true;
          }
          break;

        case this.shortcuts.clearInput:
          this.clearInput();
          this.captureService.recordKeyboardShortcut();
          return true;

        case this.shortcuts.showSuggestions:
          this.toggleSuggestions();
          this.captureService.recordKeyboardShortcut();
          return true;

        case this.shortcuts.nextSuggestion:
          if (this.uiState.showSuggestions && this.uiState.suggestions.length > 0) {
            this.navigateSuggestions(1);
            return true;
          }
          break;

        case this.shortcuts.prevSuggestion:
          if (this.uiState.showSuggestions && this.uiState.suggestions.length > 0) {
            this.navigateSuggestions(-1);
            return true;
          }
          break;

        case this.shortcuts.acceptSuggestion:
          if (this.uiState.selectedSuggestionIndex >= 0) {
            await this.acceptSelectedSuggestion();
            this.captureService.recordKeyboardShortcut();
            return true;
          }
          break;
      }
    } catch (error) {
      this.events.onError?.(error as Error);
    }

    return false;
  }

  /**
   * Capture the current input value
   */
  async captureCurrentInput(): Promise<CaptureResult | null> {
    if (!this.uiState.inputValue.trim()) {
      return null;
    }

    this.uiState.isLoading = true;

    try {
      const result = await this.captureService.captureTask(this.uiState.inputValue.trim());
      
      // Clear input after successful capture
      this.clearInput();
      
      // Update metrics
      this.events.onMetricsUpdate?.(this.captureService.getMetrics());
      this.events.onItemCaptured?.(result);
      
      return result;
    } catch (error) {
      this.events.onError?.(error as Error);
      return null;
    } finally {
      this.uiState.isLoading = false;
    }
  }

  /**
   * Accept the currently selected suggestion
   */
  async acceptSelectedSuggestion(): Promise<CaptureResult | null> {
    if (this.uiState.selectedSuggestionIndex < 0 || 
        this.uiState.selectedSuggestionIndex >= this.uiState.suggestions.length) {
      return null;
    }

    const suggestion = this.uiState.suggestions[this.uiState.selectedSuggestionIndex];
    this.uiState.isLoading = true;

    try {
      const result = await this.captureService.captureFromSuggestion(suggestion);
      
      this.clearInput();
      this.hideSuggestions();
      
      this.events.onMetricsUpdate?.(this.captureService.getMetrics());
      this.events.onItemCaptured?.(result);
      
      return result;
    } catch (error) {
      this.events.onError?.(error as Error);
      return null;
    } finally {
      this.uiState.isLoading = false;
    }
  }

  /**
   * Get current UI state
   */
  getUIState(): CaptureUIState {
    return { ...this.uiState };
  }

  /**
   * Get keyboard shortcuts configuration
   */
  getKeyboardShortcuts(): KeyboardShortcuts {
    return { ...this.shortcuts };
  }

  /**
   * Update keyboard shortcuts
   */
  updateKeyboardShortcuts(shortcuts: Partial<KeyboardShortcuts>): void {
    this.shortcuts = { ...this.shortcuts, ...shortcuts };
  }

  /**
   * Start voice recognition
   */
  async startVoiceCapture(): Promise<void> {
    if (!this.uiState.isVoiceEnabled) {
      throw new Error('Voice input is not supported on this device');
    }

    try {
      await this.voiceService.startListening();
    } catch (error) {
      this.events.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Stop voice recognition
   */
  stopVoiceCapture(): void {
    this.voiceService.stopListening();
  }

  /**
   * Toggle voice recognition
   */
  async toggleVoiceCapture(): Promise<void> {
    if (this.uiState.voiceStatus === VoiceStatus.LISTENING) {
      this.stopVoiceCapture();
    } else {
      await this.startVoiceCapture();
    }
  }

  /**
   * Check if voice input is supported
   */
  isVoiceSupported(): boolean {
    return this.uiState.isVoiceEnabled;
  }

  /**
   * Get voice commands help
   */
  getVoiceCommandsHelp(): string[] {
    return this.voiceService.getCommandsHelp();
  }

  private updateSuggestions(input: string): void {
    const suggestions = this.captureService.getSuggestions(input);
    this.uiState.suggestions = suggestions;
    this.uiState.showSuggestions = suggestions.length > 0;
    this.uiState.selectedSuggestionIndex = suggestions.length > 0 ? 0 : -1;
  }

  private navigateSuggestions(direction: number): void {
    if (this.uiState.suggestions.length === 0) return;

    const newIndex = this.uiState.selectedSuggestionIndex + direction;
    
    if (newIndex >= 0 && newIndex < this.uiState.suggestions.length) {
      this.uiState.selectedSuggestionIndex = newIndex;
    } else if (direction > 0) {
      // Wrap to beginning
      this.uiState.selectedSuggestionIndex = 0;
    } else {
      // Wrap to end
      this.uiState.selectedSuggestionIndex = this.uiState.suggestions.length - 1;
    }
  }

  private toggleSuggestions(): void {
    if (this.uiState.suggestions.length > 0) {
      this.uiState.showSuggestions = !this.uiState.showSuggestions;
      if (this.uiState.showSuggestions && this.uiState.selectedSuggestionIndex < 0) {
        this.uiState.selectedSuggestionIndex = 0;
      }
    }
  }

  private hideSuggestions(): void {
    this.uiState.showSuggestions = false;
    this.uiState.selectedSuggestionIndex = -1;
  }

  private clearInput(): void {
    this.uiState.inputValue = '';
    this.uiState.suggestions = [];
    this.hideSuggestions();
  }

  private setupVoiceHandlers(): void {
    // Handle voice status changes
    this.voiceService.on('onStatusChange', (status: VoiceStatus) => {
      this.uiState.voiceStatus = status;
      this.events.onVoiceStatusChange?.(status);
    });

    // Handle voice recognition results
    this.voiceService.on('onResult', (result: VoiceRecognitionResult) => {
      this.uiState.voiceTranscript = result.transcript;
      this.uiState.voiceConfidence = result.confidence;
      
      // If result is final and confident enough, capture it
      if (result.isFinal && result.confidence >= 0.7) {
        this.captureVoiceResult(result.transcript);
      }
      
      this.events.onVoiceResult?.(result);
    });

    // Handle voice commands
    this.voiceService.on('onCommand', async (command: VoiceCommand) => {
      await this.handleVoiceCommand(command);
      this.events.onVoiceCommand?.(command);
    });

    // Handle voice errors
    this.voiceService.on('onError', (error: VoiceError) => {
      this.events.onError?.(error);
      
      // Auto-retry for recoverable errors
      if (error.recoverable && error.code !== 'NOT_ALLOWED') {
        setTimeout(() => {
          if (this.uiState.voiceStatus === VoiceStatus.ERROR) {
            this.startVoiceCapture().catch(() => {
              // Silent fail on retry
            });
          }
        }, 2000);
      }
    });
  }

  private async captureVoiceResult(transcript: string): Promise<void> {
    try {
      const result = await this.captureService.captureTask(transcript, 'voice');
      this.events.onItemCaptured?.(result);
      this.events.onMetricsUpdate?.(this.captureService.getMetrics());
      
      // Clear voice transcript after successful capture
      this.uiState.voiceTranscript = '';
      this.uiState.voiceConfidence = 0;
    } catch (error) {
      this.events.onError?.(error as Error);
    }
  }

  private async handleVoiceCommand(command: VoiceCommand): Promise<void> {
    switch (command.command) {
      case 'capture':
        if (command.parameters?.task) {
          await this.captureVoiceResult(command.parameters.task);
        }
        break;
        
      case 'clear':
        this.clearInput();
        break;
        
      case 'stop':
        this.stopVoiceCapture();
        break;
        
      case 'next':
      case 'back':
        // These would be handled by the parent ritual controller
        // Just pass them through via events
        break;
        
      case 'help':
        // Help command handled by UI layer
        break;
    }
  }

  private getKeyCombo(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.shiftKey) parts.push('Shift');
    if (event.altKey) parts.push('Alt');
    if (event.metaKey) parts.push('Meta');
    
    parts.push(event.key);
    
    return parts.join('+');
  }
}