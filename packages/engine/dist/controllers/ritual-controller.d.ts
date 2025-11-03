/**
 * Ritual controller for managing UI interactions and step navigation
 */
import { RitualStep, RitualState, RitualSummary, ClarifyDecision, FocusBlock } from '../types/ritual.js';
import { RitualWorkflowEngine } from '../workflow/ritual-engine.js';
export interface RitualProgressInfo {
    currentStep: RitualStep;
    stepIndex: number;
    totalSteps: number;
    elapsedTime: number;
    stepElapsedTime: number;
    showTimeReminder: boolean;
    shouldAutoComplete: boolean;
}
export interface KeyboardShortcutHandler {
    key: string;
    handler: () => Promise<void>;
    description: string;
}
export declare class RitualController {
    private engine;
    private keyboardHandlers;
    private progressCallbacks;
    constructor(engine: RitualWorkflowEngine);
    private setupKeyboardHandlers;
    startRitual(): Promise<string>;
    captureItems(items: any[]): Promise<void>;
    clarifyItems(decisions: ClarifyDecision[]): Promise<void>;
    selectTasks(taskIds: string[]): Promise<void>;
    scheduleBlocks(blocks: FocusBlock[]): Promise<void>;
    startFocusSession(): Promise<RitualSummary>;
    nextStep(): Promise<boolean>;
    previousStep(): Promise<boolean>;
    cancelRitual(): Promise<void>;
    getCurrentState(): RitualState;
    getProgressInfo(): RitualProgressInfo;
    onProgressUpdate(callback: (progress: RitualProgressInfo) => void): void;
    removeProgressCallback(callback: (progress: RitualProgressInfo) => void): void;
    handleKeyboardShortcut(key: string): Promise<void>;
    getKeyboardShortcuts(): KeyboardShortcutHandler[];
    private handleNextStep;
    private handlePreviousStep;
    private handleCompleteStep;
    private handleCancel;
    private handleQuickSave;
    private notifyProgressUpdate;
}
