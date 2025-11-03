/**
 * Capture Controller - Manages the rapid task entry interface
 */
import { CaptureService, CaptureResult } from '../services/capture-service.js';
import { VoiceService, VoiceStatus, VoiceCommand, VoiceRecognitionResult } from '../services/voice-service.js';
import { InboxItem, TaskSuggestion } from '../types/ritual.js';
export interface KeyboardShortcuts {
    quickSave: string;
    newLine: string;
    clearInput: string;
    showSuggestions: string;
    nextSuggestion: string;
    prevSuggestion: string;
    acceptSuggestion: string;
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
export declare class CaptureController {
    private captureService;
    private voiceService;
    private uiState;
    private events;
    private shortcuts;
    private inputDebounceTimer?;
    constructor(captureService: CaptureService, voiceService: VoiceService, shortcuts?: Partial<KeyboardShortcuts>);
    /**
     * Register event handlers
     */
    on<K extends keyof CaptureControllerEvents>(event: K, handler: CaptureControllerEvents[K]): void;
    /**
     * Initialize the capture interface
     */
    initialize(historicalItems?: InboxItem[]): Promise<void>;
    /**
     * Handle input value changes with debounced suggestions
     */
    handleInputChange(value: string): void;
    /**
     * Handle keyboard shortcuts and navigation
     */
    handleKeyboardEvent(event: KeyboardEvent): Promise<boolean>;
    /**
     * Capture the current input value
     */
    captureCurrentInput(): Promise<CaptureResult | null>;
    /**
     * Accept the currently selected suggestion
     */
    acceptSelectedSuggestion(): Promise<CaptureResult | null>;
    /**
     * Get current UI state
     */
    getUIState(): CaptureUIState;
    /**
     * Get keyboard shortcuts configuration
     */
    getKeyboardShortcuts(): KeyboardShortcuts;
    /**
     * Update keyboard shortcuts
     */
    updateKeyboardShortcuts(shortcuts: Partial<KeyboardShortcuts>): void;
    /**
     * Start voice recognition
     */
    startVoiceCapture(): Promise<void>;
    /**
     * Stop voice recognition
     */
    stopVoiceCapture(): void;
    /**
     * Toggle voice recognition
     */
    toggleVoiceCapture(): Promise<void>;
    /**
     * Check if voice input is supported
     */
    isVoiceSupported(): boolean;
    /**
     * Get voice commands help
     */
    getVoiceCommandsHelp(): string[];
    private updateSuggestions;
    private navigateSuggestions;
    private toggleSuggestions;
    private hideSuggestions;
    private clearInput;
    private setupVoiceHandlers;
    private captureVoiceResult;
    private handleVoiceCommand;
    private getKeyCombo;
}
