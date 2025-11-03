/**
 * Voice Service - Handles speech-to-text and voice commands for task capture
 */

export interface VoiceServiceConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  confidenceThreshold: number;
  commandPrefix: string; // e.g., "ritual" to trigger commands
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

export enum VoiceStatus {
  IDLE = 'idle',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  ERROR = 'error',
  UNSUPPORTED = 'unsupported'
}

export class VoiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'VoiceError';
  }
}

export class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private config: VoiceServiceConfig;
  private status: VoiceStatus = VoiceStatus.IDLE;
  private events: Partial<VoiceServiceEvents> = {};
  private isSupported: boolean = false;
  private commandPatterns: Map<RegExp, (matches: RegExpMatchArray) => VoiceCommand> = new Map();

  constructor(config: Partial<VoiceServiceConfig> = {}) {
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
  on<K extends keyof VoiceServiceEvents>(
    event: K,
    handler: VoiceServiceEvents[K]
  ): void {
    this.events[event] = handler;
  }

  /**
   * Check if voice recognition is supported
   */
  isVoiceSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Get current voice service status
   */
  getStatus(): VoiceStatus {
    return this.status;
  }

  /**
   * Start voice recognition
   */
  async startListening(): Promise<void> {
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
    } catch (error) {
      const voiceError = new VoiceError(
        `Failed to start voice recognition: ${(error as Error).message}`,
        'START_FAILED',
        true
      );
      this.setStatus(VoiceStatus.ERROR);
      this.events.onError?.(voiceError);
      throw voiceError;
    }
  }

  /**
   * Stop voice recognition
   */
  stopListening(): void {
    if (this.recognition && this.status === VoiceStatus.LISTENING) {
      this.recognition.stop();
      this.setStatus(VoiceStatus.IDLE);
    }
  }

  /**
   * Abort voice recognition
   */
  abortListening(): void {
    if (this.recognition && this.status === VoiceStatus.LISTENING) {
      this.recognition.abort();
      this.setStatus(VoiceStatus.IDLE);
    }
  }

  /**
   * Process voice input for task capture
   */
  processVoiceInput(transcript: string, confidence: number): VoiceRecognitionResult {
    const result: VoiceRecognitionResult = {
      transcript: transcript.trim(),
      confidence,
      isFinal: confidence >= this.config.confidenceThreshold,
      alternatives: [] // Would be populated by actual speech recognition
    };

    // Check if this is a voice command
    const command = this.parseCommand(transcript);
    if (command) {
      this.events.onCommand?.(command);
    } else {
      this.events.onResult?.(result);
    }

    return result;
  }

  /**
   * Add custom voice command pattern
   */
  addCommandPattern(
    pattern: RegExp,
    handler: (matches: RegExpMatchArray) => VoiceCommand
  ): void {
    this.commandPatterns.set(pattern, handler);
  }

  /**
   * Remove voice command pattern
   */
  removeCommandPattern(pattern: RegExp): void {
    this.commandPatterns.delete(pattern);
  }

  /**
   * Get available voice commands help
   */
  getCommandsHelp(): string[] {
    return [
      `"${this.config.commandPrefix} capture [task]" - Capture a new task`,
      `"${this.config.commandPrefix} next" - Move to next step`,
      `"${this.config.commandPrefix} back" - Move to previous step`,
      `"${this.config.commandPrefix} clear" - Clear current input`,
      `"${this.config.commandPrefix} stop" - Stop voice recognition`,
      `"${this.config.commandPrefix} help" - Show available commands`
    ];
  }

  private initializeRecognition(): void {
    // Check for browser support (skip in Node.js environment)
    if (typeof window === 'undefined') {
      this.isSupported = false;
      this.setStatus(VoiceStatus.UNSUPPORTED);
      return;
    }

    const SpeechRecognition = (window as any)?.SpeechRecognition || 
                             (window as any)?.webkitSpeechRecognition;

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

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        this.setStatus(VoiceStatus.PROCESSING);
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;

          this.processVoiceInput(transcript, confidence);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const error = new VoiceError(
          `Speech recognition error: ${event.error}`,
          event.error.toUpperCase(),
          event.error !== 'not-allowed'
        );
        
        this.setStatus(VoiceStatus.ERROR);
        this.events.onError?.(error);
      };

      this.recognition.onend = () => {
        this.setStatus(VoiceStatus.IDLE);
      };

      this.recognition.onnomatch = () => {
        const error = new VoiceError(
          'No speech was recognized',
          'NO_MATCH',
          true
        );
        this.events.onError?.(error);
      };
    }
  }

  private setupCommandPatterns(): void {
    const prefix = this.config.commandPrefix.toLowerCase();

    // Capture command: "ritual capture [task description]"
    this.addCommandPattern(
      new RegExp(`^${prefix}\\s+capture\\s+(.+)$`, 'i'),
      (matches) => ({
        command: 'capture',
        action: 'capture',
        parameters: { task: matches[1].trim() }
      })
    );

    // Navigation commands
    this.addCommandPattern(
      new RegExp(`^${prefix}\\s+(next|forward)$`, 'i'),
      () => ({
        command: 'next',
        action: 'navigate',
        parameters: { direction: 'forward' }
      })
    );

    this.addCommandPattern(
      new RegExp(`^${prefix}\\s+(back|previous)$`, 'i'),
      () => ({
        command: 'back',
        action: 'navigate',
        parameters: { direction: 'back' }
      })
    );

    // Control commands
    this.addCommandPattern(
      new RegExp(`^${prefix}\\s+clear$`, 'i'),
      () => ({
        command: 'clear',
        action: 'control'
      })
    );

    this.addCommandPattern(
      new RegExp(`^${prefix}\\s+stop$`, 'i'),
      () => ({
        command: 'stop',
        action: 'control'
      })
    );

    this.addCommandPattern(
      new RegExp(`^${prefix}\\s+help$`, 'i'),
      () => ({
        command: 'help',
        action: 'control'
      })
    );
  }

  private parseCommand(transcript: string): VoiceCommand | null {
    const normalizedTranscript = transcript.toLowerCase().trim();

    for (const [pattern, handler] of this.commandPatterns) {
      const matches = normalizedTranscript.match(pattern);
      if (matches) {
        return handler(matches);
      }
    }

    return null;
  }

  private setStatus(status: VoiceStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.events.onStatusChange?.(status);
    }
  }
}

// Type definitions for Web Speech API (for TypeScript support)
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