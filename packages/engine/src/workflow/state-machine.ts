/**
 * State machine implementation for the Daily Start Ritual workflow
 */

import { RitualStep, DailyRitual, RitualState } from '../types/ritual.js';

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

export class RitualStateMachine {
  private transitions: StateTransition[] = [
    { from: RitualStep.CAPTURE, to: RitualStep.CLARIFY },
    { from: RitualStep.CLARIFY, to: RitualStep.SELECT },
    { from: RitualStep.SELECT, to: RitualStep.SCHEDULE, condition: (state) => state.selectedTaskIds.length === 6 },
    { from: RitualStep.SCHEDULE, to: RitualStep.START, condition: (state) => state.draftSchedule.length >= 2 }
  ];

  private eventHandlers: Map<string, (event: WorkflowEvent, state: RitualState) => RitualState> = new Map();

  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.eventHandlers.set('CAPTURE_COMPLETE', this.handleCaptureComplete.bind(this));
    this.eventHandlers.set('CLARIFY_COMPLETE', this.handleClarifyComplete.bind(this));
    this.eventHandlers.set('TASKS_SELECTED', this.handleTasksSelected.bind(this));
    this.eventHandlers.set('SCHEDULE_COMPLETE', this.handleScheduleComplete.bind(this));
    this.eventHandlers.set('RITUAL_START', this.handleRitualStart.bind(this));
  }

  canTransition(from: RitualStep, to: RitualStep, state: RitualState): boolean {
    const transition = this.transitions.find(t => t.from === from && t.to === to);
    if (!transition) return false;
    
    return transition.condition ? transition.condition(state) : true;
  }

  getNextStep(currentStep: RitualStep, state: RitualState): RitualStep | null {
    const possibleTransition = this.transitions.find(t => 
      t.from === currentStep && 
      (!t.condition || t.condition(state))
    );
    
    return possibleTransition ? possibleTransition.to : null;
  }

  processEvent(event: WorkflowEvent, state: RitualState): RitualState {
    const handler = this.eventHandlers.get(event.type);
    if (!handler) {
      console.warn(`No handler found for event type: ${event.type}`);
      return state;
    }

    return handler(event, state);
  }

  private handleCaptureComplete(event: WorkflowEvent, state: RitualState): RitualState {
    const capturedItems = event.payload?.items || [];
    
    return {
      ...state,
      current: state.current ? {
        ...state.current,
        capturedItems: capturedItems.map((item: any) => item.id)
      } : null,
      pendingItems: capturedItems,
      currentStep: RitualStep.CLARIFY,
      stepStartTime: new Date()
    };
  }

  private handleClarifyComplete(event: WorkflowEvent, state: RitualState): RitualState {
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

  private handleTasksSelected(event: WorkflowEvent, state: RitualState): RitualState {
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

  private handleScheduleComplete(event: WorkflowEvent, state: RitualState): RitualState {
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

  private handleRitualStart(event: WorkflowEvent, state: RitualState): RitualState {
    if (!state.current) {
      throw new Error('No active ritual to start');
    }

    const completedRitual: DailyRitual = {
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