/**
 * State machine implementation for the Daily Start Ritual workflow
 */
import { RitualStep, RitualState } from '../types/ritual.js';
export interface StateTransition {
    from: RitualStep;
    to: RitualStep;
    condition?: (state: RitualState) => boolean;
}
export interface WorkflowEvent {
    type: string;
    payload?: any;
    timestamp: Date;
}
export declare class RitualStateMachine {
    private transitions;
    private eventHandlers;
    constructor();
    private setupEventHandlers;
    canTransition(from: RitualStep, to: RitualStep, state: RitualState): boolean;
    getNextStep(currentStep: RitualStep, state: RitualState): RitualStep | null;
    processEvent(event: WorkflowEvent, state: RitualState): RitualState;
    private handleCaptureComplete;
    private handleClarifyComplete;
    private handleTasksSelected;
    private handleScheduleComplete;
    private handleRitualStart;
}
