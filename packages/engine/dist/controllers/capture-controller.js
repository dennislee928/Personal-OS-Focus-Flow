/**
 * Capture Controller - Manages the rapid task entry interface
 */
import { VoiceStatus } from '../services/voice-service.js';
export class CaptureController {
    captureService;
    voiceService;
    uiState;
    events = {};
    shortcuts;
    inputDebounceTimer;
    constructor(captureService, voiceService, shortcuts) {
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
    on(event, handler) {
        this.events[event] = handler;
    }
    /**
     * Initialize the capture interface
     */
    async initialize(historicalItems = []) {
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
        }
        catch (error) {
            this.events.onError?.(error);
        }
    }
    /**
     * Handle input value changes with debounced suggestions
     */
    handleInputChange(value) {
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
    async handleKeyboardEvent(event) {
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
        }
        catch (error) {
            this.events.onError?.(error);
        }
        return false;
    }
    /**
     * Capture the current input value
     */
    async captureCurrentInput() {
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
        }
        catch (error) {
            this.events.onError?.(error);
            return null;
        }
        finally {
            this.uiState.isLoading = false;
        }
    }
    /**
     * Accept the currently selected suggestion
     */
    async acceptSelectedSuggestion() {
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
        }
        catch (error) {
            this.events.onError?.(error);
            return null;
        }
        finally {
            this.uiState.isLoading = false;
        }
    }
    /**
     * Get current UI state
     */
    getUIState() {
        return { ...this.uiState };
    }
    /**
     * Get keyboard shortcuts configuration
     */
    getKeyboardShortcuts() {
        return { ...this.shortcuts };
    }
    /**
     * Update keyboard shortcuts
     */
    updateKeyboardShortcuts(shortcuts) {
        this.shortcuts = { ...this.shortcuts, ...shortcuts };
    }
    /**
     * Start voice recognition
     */
    async startVoiceCapture() {
        if (!this.uiState.isVoiceEnabled) {
            throw new Error('Voice input is not supported on this device');
        }
        try {
            await this.voiceService.startListening();
        }
        catch (error) {
            this.events.onError?.(error);
            throw error;
        }
    }
    /**
     * Stop voice recognition
     */
    stopVoiceCapture() {
        this.voiceService.stopListening();
    }
    /**
     * Toggle voice recognition
     */
    async toggleVoiceCapture() {
        if (this.uiState.voiceStatus === VoiceStatus.LISTENING) {
            this.stopVoiceCapture();
        }
        else {
            await this.startVoiceCapture();
        }
    }
    /**
     * Check if voice input is supported
     */
    isVoiceSupported() {
        return this.uiState.isVoiceEnabled;
    }
    /**
     * Get voice commands help
     */
    getVoiceCommandsHelp() {
        return this.voiceService.getCommandsHelp();
    }
    updateSuggestions(input) {
        const suggestions = this.captureService.getSuggestions(input);
        this.uiState.suggestions = suggestions;
        this.uiState.showSuggestions = suggestions.length > 0;
        this.uiState.selectedSuggestionIndex = suggestions.length > 0 ? 0 : -1;
    }
    navigateSuggestions(direction) {
        if (this.uiState.suggestions.length === 0)
            return;
        const newIndex = this.uiState.selectedSuggestionIndex + direction;
        if (newIndex >= 0 && newIndex < this.uiState.suggestions.length) {
            this.uiState.selectedSuggestionIndex = newIndex;
        }
        else if (direction > 0) {
            // Wrap to beginning
            this.uiState.selectedSuggestionIndex = 0;
        }
        else {
            // Wrap to end
            this.uiState.selectedSuggestionIndex = this.uiState.suggestions.length - 1;
        }
    }
    toggleSuggestions() {
        if (this.uiState.suggestions.length > 0) {
            this.uiState.showSuggestions = !this.uiState.showSuggestions;
            if (this.uiState.showSuggestions && this.uiState.selectedSuggestionIndex < 0) {
                this.uiState.selectedSuggestionIndex = 0;
            }
        }
    }
    hideSuggestions() {
        this.uiState.showSuggestions = false;
        this.uiState.selectedSuggestionIndex = -1;
    }
    clearInput() {
        this.uiState.inputValue = '';
        this.uiState.suggestions = [];
        this.hideSuggestions();
    }
    setupVoiceHandlers() {
        // Handle voice status changes
        this.voiceService.on('onStatusChange', (status) => {
            this.uiState.voiceStatus = status;
            this.events.onVoiceStatusChange?.(status);
        });
        // Handle voice recognition results
        this.voiceService.on('onResult', (result) => {
            this.uiState.voiceTranscript = result.transcript;
            this.uiState.voiceConfidence = result.confidence;
            // If result is final and confident enough, capture it
            if (result.isFinal && result.confidence >= 0.7) {
                this.captureVoiceResult(result.transcript);
            }
            this.events.onVoiceResult?.(result);
        });
        // Handle voice commands
        this.voiceService.on('onCommand', async (command) => {
            await this.handleVoiceCommand(command);
            this.events.onVoiceCommand?.(command);
        });
        // Handle voice errors
        this.voiceService.on('onError', (error) => {
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
    async captureVoiceResult(transcript) {
        try {
            const result = await this.captureService.captureTask(transcript, 'voice');
            this.events.onItemCaptured?.(result);
            this.events.onMetricsUpdate?.(this.captureService.getMetrics());
            // Clear voice transcript after successful capture
            this.uiState.voiceTranscript = '';
            this.uiState.voiceConfidence = 0;
        }
        catch (error) {
            this.events.onError?.(error);
        }
    }
    async handleVoiceCommand(command) {
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
    getKeyCombo(event) {
        const parts = [];
        if (event.ctrlKey)
            parts.push('Ctrl');
        if (event.shiftKey)
            parts.push('Shift');
        if (event.altKey)
            parts.push('Alt');
        if (event.metaKey)
            parts.push('Meta');
        parts.push(event.key);
        return parts.join('+');
    }
}
