/**
 * State machine implementation for the Daily Start Ritual workflow
 */
import { RitualStep } from '../types/ritual.js';
export class RitualStateMachine {
    transitions = [
        { from: RitualStep.CAPTURE, to: RitualStep.CLARIFY },
        { from: RitualStep.CLARIFY, to: RitualStep.SELECT },
        { from: RitualStep.SELECT, to: RitualStep.SCHEDULE, condition: (state) => state.selectedTaskIds.length === 6 },
        { from: RitualStep.SCHEDULE, to: RitualStep.START, condition: (state) => state.draftSchedule.length >= 2 }
    ];
    eventHandlers = new Map();
    constructor() {
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.eventHandlers.set('CAPTURE_COMPLETE', this.handleCaptureComplete.bind(this));
        this.eventHandlers.set('CLARIFY_COMPLETE', this.handleClarifyComplete.bind(this));
        this.eventHandlers.set('TASKS_SELECTED', this.handleTasksSelected.bind(this));
        this.eventHandlers.set('SCHEDULE_COMPLETE', this.handleScheduleComplete.bind(this));
        this.eventHandlers.set('RITUAL_START', this.handleRitualStart.bind(this));
    }
    canTransition(from, to, state) {
        const transition = this.transitions.find(t => t.from === from && t.to === to);
        if (!transition)
            return false;
        return transition.condition ? transition.condition(state) : true;
    }
    getNextStep(currentStep, state) {
        const possibleTransition = this.transitions.find(t => t.from === currentStep &&
            (!t.condition || t.condition(state)));
        return possibleTransition ? possibleTransition.to : null;
    }
    processEvent(event, state) {
        const handler = this.eventHandlers.get(event.type);
        if (!handler) {
            console.warn(`No handler found for event type: ${event.type}`);
            return state;
        }
        return handler(event, state);
    }
    handleCaptureComplete(event, state) {
        const capturedItems = event.payload?.items || [];
        return {
            ...state,
            current: state.current ? {
                ...state.current,
                capturedItems: capturedItems.map((item) => item.id)
            } : null,
            pendingItems: capturedItems,
            currentStep: RitualStep.CLARIFY,
            stepStartTime: new Date()
        };
    }
    handleClarifyComplete(event, state) {
        const clarifiedItems = event.payload?.decisions || [];
        return {
            ...state,
            current: state.current ? {
                ...state.current,
                clarifiedItems
            } : null,
            currentStep: RitualStep.SELECT,
            stepStartTime: new Date()
        };
    }
    handleTasksSelected(event, state) {
        const selectedTasks = event.payload?.taskIds || [];
        if (selectedTasks.length !== 6) {
            throw new Error('Exactly 6 tasks must be selected for Ivy Lee method');
        }
        return {
            ...state,
            current: state.current ? {
                ...state.current,
                selectedTasks
            } : null,
            selectedTaskIds: selectedTasks,
            currentStep: RitualStep.SCHEDULE,
            stepStartTime: new Date()
        };
    }
    handleScheduleComplete(event, state) {
        const scheduledBlocks = event.payload?.blocks || [];
        if (scheduledBlocks.length < 2) {
            throw new Error('At least 2 focus blocks must be scheduled');
        }
        return {
            ...state,
            current: state.current ? {
                ...state.current,
                scheduledBlocks
            } : null,
            draftSchedule: scheduledBlocks,
            currentStep: RitualStep.START,
            stepStartTime: new Date()
        };
    }
    handleRitualStart(event, state) {
        if (!state.current) {
            throw new Error('No active ritual to start');
        }
        const completedRitual = {
            ...state.current,
            status: 'completed',
            completionTime: new Date()
        };
        return {
            ...state,
            current: null,
            history: [...state.history, completedRitual],
            currentStep: RitualStep.CAPTURE, // Reset for next ritual
            stepStartTime: new Date(),
            pendingItems: [],
            selectedTaskIds: [],
            draftSchedule: []
        };
    }
}
