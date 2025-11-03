/**
 * Main workflow engine for orchestrating the Daily Start Ritual
 */
import { RitualState, RitualSummary } from '../types/ritual.js';
import { WorkflowEvent } from './state-machine.js';
import { PersistenceService } from '../services/persistence-service.js';
export interface RitualEngineConfig {
    timeReminderThreshold: number;
    autoCompleteThreshold: number;
    enableAutoAdvance: boolean;
}
export declare class RitualWorkflowEngine {
    private stateMachine;
    private persistenceService;
    private config;
    private state;
    private stepTimers;
    constructor(persistenceService: PersistenceService, config?: RitualEngineConfig);
    private initializeState;
    startRitual(): Promise<string>;
    processEvent(event: WorkflowEvent): Promise<void>;
    nextStep(): Promise<boolean>;
    previousStep(): Promise<boolean>;
    completeRitual(): Promise<RitualSummary>;
    cancelRitual(): Promise<void>;
    getCurrentState(): RitualState;
    getElapsedTime(): number;
    getStepElapsedTime(): number;
    shouldShowTimeReminder(): boolean;
    shouldAutoComplete(): boolean;
    private generateRitualId;
    private initializeMetrics;
    private updateStepMetrics;
    private persistState;
}
