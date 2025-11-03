/**
 * Voice Service - Handles speech-to-text and voice commands for task capture
 */
export var VoiceStatus;
(function (VoiceStatus) {
    VoiceStatus["IDLE"] = "idle";
    VoiceStatus["LISTENING"] = "listening";
    VoiceStatus["PROCESSING"] = "processing";
    VoiceStatus["ERROR"] = "error";
    VoiceStatus["UNSUPPORTED"] = "unsupported";
})(VoiceStatus || (VoiceStatus = {}));
export class VoiceError extends Error {
    code;
    recoverable;
    constructor(message, code, recoverable = true) {
        super(message);
        this.code = code;
        this.recoverable = recoverable;
        this.name = 'VoiceError';
    }
}
export class VoiceService {
    recognition = null;
    config;
    status = VoiceStatus.IDLE;
    events = {};
    isSupported = false;
    commandPatterns = new Map();
    constructor(config = {}) {
        this.config = {
            language: 'en-US',
            continuous: false,
            interimResults: true,
            maxAlternatives: 3,
            confidenceThreshold: 0.7,
            commandPrefix: 'ritual',
            ...config
        };
        this.initializeRecognition();
        this.setupCommandPatterns();
    }
    /**
     * Register event handlers
     */
    on(event, handler) {
        this.events[event] = handler;
    }
    /**
     * Check if voice recognition is supported
     */
    isVoiceSupported() {
        return this.isSupported;
    }
    /**
     * Get current voice service status
     */
    getStatus() {
        return this.status;
    }
    /**
     * Start voice recognition
     */
    async startListening() {
        if (!this.isSupported) {
            throw new VoiceError('Speech recognition not supported', 'NOT_SUPPORTED', false);
        }
        if (!this.recognition) {
            throw new VoiceError('Speech recognition not initialized', 'NOT_INITIALIZED', true);
        }
        if (this.status === VoiceStatus.LISTENING) {
            return; // Already listening
        }
        try {
            this.setStatus(VoiceStatus.LISTENING);
            this.recognition.start();
        }
        catch (error) {
            const voiceError = new VoiceError(`Failed to start voice recognition: ${error.message}`, 'START_FAILED', true);
            this.setStatus(VoiceStatus.ERROR);
            this.events.onError?.(voiceError);
            throw voiceError;
        }
    }
    /**
     * Stop voice recognition
     */
    stopListening() {
        if (this.recognition && this.status === VoiceStatus.LISTENING) {
            this.recognition.stop();
            this.setStatus(VoiceStatus.IDLE);
        }
    }
    /**
     * Abort voice recognition
     */
    abortListening() {
        if (this.recognition && this.status === VoiceStatus.LISTENING) {
            this.recognition.abort();
            this.setStatus(VoiceStatus.IDLE);
        }
    }
    /**
     * Process voice input for task capture
     */
    processVoiceInput(transcript, confidence) {
        const result = {
            transcript: transcript.trim(),
            confidence,
            isFinal: confidence >= this.config.confidenceThreshold,
            alternatives: [] // Would be populated by actual speech recognition
        };
        // Check if this is a voice command
        const command = this.parseCommand(transcript);
        if (command) {
            this.events.onCommand?.(command);
        }
        else {
            this.events.onResult?.(result);
        }
        return result;
    }
    /**
     * Add custom voice command pattern
     */
    addCommandPattern(pattern, handler) {
        this.commandPatterns.set(pattern, handler);
    }
    /**
     * Remove voice command pattern
     */
    removeCommandPattern(pattern) {
        this.commandPatterns.delete(pattern);
    }
    /**
     * Get available voice commands help
     */
    getCommandsHelp() {
        return [
            `"${this.config.commandPrefix} capture [task]" - Capture a new task`,
            `"${this.config.commandPrefix} next" - Move to next step`,
            `"${this.config.commandPrefix} back" - Move to previous step`,
            `"${this.config.commandPrefix} clear" - Clear current input`,
            `"${this.config.commandPrefix} stop" - Stop voice recognition`,
            `"${this.config.commandPrefix} help" - Show available commands`
        ];
    }
    initializeRecognition() {
        // Check for browser support
        const SpeechRecognition = window?.SpeechRecognition ||
            window?.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.isSupported = false;
            this.setStatus(VoiceStatus.UNSUPPORTED);
            return;
        }
        this.isSupported = true;
        this.recognition = new SpeechRecognition();
        // Configure recognition
        if (this.recognition) {
            this.recognition.lang = this.config.language;
            this.recognition.continuous = this.config.continuous;
            this.recognition.interimResults = this.config.interimResults;
            this.recognition.maxAlternatives = this.config.maxAlternatives;
        }
        // Set up event handlers
        if (this.recognition) {
            this.recognition.onstart = () => {
                this.setStatus(VoiceStatus.LISTENING);
            };
            this.recognition.onresult = (event) => {
                this.setStatus(VoiceStatus.PROCESSING);
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    const transcript = result[0].transcript;
                    const confidence = result[0].confidence;
                    this.processVoiceInput(transcript, confidence);
                }
            };
            this.recognition.onerror = (event) => {
                const error = new VoiceError(`Speech recognition error: ${event.error}`, event.error.toUpperCase(), event.error !== 'not-allowed');
                this.setStatus(VoiceStatus.ERROR);
                this.events.onError?.(error);
            };
            this.recognition.onend = () => {
                this.setStatus(VoiceStatus.IDLE);
            };
            this.recognition.onnomatch = () => {
                const error = new VoiceError('No speech was recognized', 'NO_MATCH', true);
                this.events.onError?.(error);
            };
        }
    }
    setupCommandPatterns() {
        const prefix = this.config.commandPrefix.toLowerCase();
        // Capture command: "ritual capture [task description]"
        this.addCommandPattern(new RegExp(`^${prefix}\\s+capture\\s+(.+)$`, 'i'), (matches) => ({
            command: 'capture',
            action: 'capture',
            parameters: { task: matches[1].trim() }
        }));
        // Navigation commands
        this.addCommandPattern(new RegExp(`^${prefix}\\s+(next|forward)$`, 'i'), () => ({
            command: 'next',
            action: 'navigate',
            parameters: { direction: 'forward' }
        }));
        this.addCommandPattern(new RegExp(`^${prefix}\\s+(back|previous)$`, 'i'), () => ({
            command: 'back',
            action: 'navigate',
            parameters: { direction: 'back' }
        }));
        // Control commands
        this.addCommandPattern(new RegExp(`^${prefix}\\s+clear$`, 'i'), () => ({
            command: 'clear',
            action: 'control'
        }));
        this.addCommandPattern(new RegExp(`^${prefix}\\s+stop$`, 'i'), () => ({
            command: 'stop',
            action: 'control'
        }));
        this.addCommandPattern(new RegExp(`^${prefix}\\s+help$`, 'i'), () => ({
            command: 'help',
            action: 'control'
        }));
    }
    parseCommand(transcript) {
        const normalizedTranscript = transcript.toLowerCase().trim();
        for (const [pattern, handler] of this.commandPatterns) {
            const matches = normalizedTranscript.match(pattern);
            if (matches) {
                return handler(matches);
            }
        }
        return null;
    }
    setStatus(status) {
        if (this.status !== status) {
            this.status = status;
            this.events.onStatusChange?.(status);
        }
    }
}
