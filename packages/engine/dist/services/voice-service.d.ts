/**
 * Voice Service - Handles speech-to-text and voice commands for task capture
 */
export interface VoiceServiceConfig {
    language: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    confidenceThreshold: number;
    commandPrefix: string;
}
export interface VoiceRecognitionResult {
    transcript: string;
    confidence: number;
    isFinal: boolean;
    alternatives: string[];
}
export interface VoiceCommand {
    command: string;
    action: 'capture' | 'navigate' | 'control';
    parameters?: Record<string, any>;
}
export interface VoiceServiceEvents {
    onResult: (result: VoiceRecognitionResult) => void;
    onCommand: (command: VoiceCommand) => void;
    onError: (error: VoiceError) => void;
    onStatusChange: (status: VoiceStatus) => void;
}
export declare enum VoiceStatus {
    IDLE = "idle",
    LISTENING = "listening",
    PROCESSING = "processing",
    ERROR = "error",
    UNSUPPORTED = "unsupported"
}
export declare class VoiceError extends Error {
    code: string;
    recoverable: boolean;
    constructor(message: string, code: string, recoverable?: boolean);
}
export declare class VoiceService {
    private recognition;
    private config;
    private status;
    private events;
    private isSupported;
    private commandPatterns;
    constructor(config?: Partial<VoiceServiceConfig>);
    /**
     * Register event handlers
     */
    on<K extends keyof VoiceServiceEvents>(event: K, handler: VoiceServiceEvents[K]): void;
    /**
     * Check if voice recognition is supported
     */
    isVoiceSupported(): boolean;
    /**
     * Get current voice service status
     */
    getStatus(): VoiceStatus;
    /**
     * Start voice recognition
     */
    startListening(): Promise<void>;
    /**
     * Stop voice recognition
     */
    stopListening(): void;
    /**
     * Abort voice recognition
     */
    abortListening(): void;
    /**
     * Process voice input for task capture
     */
    processVoiceInput(transcript: string, confidence: number): VoiceRecognitionResult;
    /**
     * Add custom voice command pattern
     */
    addCommandPattern(pattern: RegExp, handler: (matches: RegExpMatchArray) => VoiceCommand): void;
    /**
     * Remove voice command pattern
     */
    removeCommandPattern(pattern: RegExp): void;
    /**
     * Get available voice commands help
     */
    getCommandsHelp(): string[];
    private initializeRecognition;
    private setupCommandPatterns;
    private parseCommand;
    private setStatus;
}
declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}
interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}
interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}
interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
}
interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}
export {};
