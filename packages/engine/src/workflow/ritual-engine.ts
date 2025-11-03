/**
 * Main workflow engine for orchestrating the Daily Start Ritual
 */

import { RitualStep, DailyRitual, RitualState, RitualMetrics, RitualSummary } from '../types/ritual.js';
import { RitualStateMachine, WorkflowEvent } from './state-machine.js';
import { PersistenceService } from '../services/persistence-service.js';

export interface RitualEngineConfig {
  timeReminderThreshold: number; // minutes
  autoCompleteThreshold: number; // minutes
  enableAutoAdvance: boolean;
}

export class RitualWorkflowEngine {
  private stateMachine: RitualStateMachine;
  private persistenceService: PersistenceService;
  private config: RitualEngineConfig;
  private state: RitualState;
  private stepTimers: Map<RitualStep, Date> = new Map();

  constructor(
    persistenceService: PersistenceService,
    config: RitualEngineConfig = {
      timeReminderThreshold: 8,
      autoCompleteThreshold: 10,
      enableAutoAdvance: true
    }
  ) {
    this.stateMachine = new RitualStateMachine();
    this.persistenceService = persistenceService;
    this.config = config;
    this.state = this.initializeState();
  }

  private initializeState(): RitualState {
    const savedState = this.persistenceService.loadRitualState();
    if (savedState) {
      return savedState;
    }

    return {
      current: null,
      history: [],
      preferences: {
        autoAdvanceSteps: true,
        showTimeReminders: true,
        defaultBlockDuration: 25,
        peakWorkWindow: { start: '09:00', end: '12:00' },
        keyboardShortcuts: {
          'next': 'Tab',
          'previous': 'Shift+Tab',
          'complete': 'Enter',
          'cancel': 'Escape'
        }
      },
      currentStep: RitualStep.CAPTURE,
      stepStartTime: new Date(),
      pendingItems: [],
      selectedTaskIds: [],
      draftSchedule: []
    };
  }

  async startRitual(): Promise<string> {
    if (this.state.current && this.state.current.status === 'in_progress') {
      throw new Error('A ritual is already in progress');
    }

    const ritualId = this.generateRitualId();
    const now = new Date();

    const newRitual: DailyRitual = {
      id: ritualId,
      date: now,
      startTime: now,
      status: 'in_progress',
      capturedItems: [],
      clarifiedItems: [],
      selectedTasks: [],
      scheduledBlocks: [],
      metrics: this.initializeMetrics()
    };

    this.state = {
      ...this.state,
      current: newRitual,
      currentStep: RitualStep.CAPTURE,
      stepStartTime: now,
      pendingItems: [],
      selectedTaskIds: [],
      draftSchedule: []
    };

    this.stepTimers.set(RitualStep.CAPTURE, now);
    await this.persistState();

    return ritualId;
  }

  async processEvent(event: WorkflowEvent): Promise<void> {
    const previousStep = this.state.currentStep;
    this.state = this.stateMachine.processEvent(event, this.state);
    
    // Update step timing metrics
    if (this.state.currentStep !== previousStep) {
      this.updateStepMetrics(previousStep);
      this.stepTimers.set(this.state.currentStep, new Date());
    }

    await this.persistState();
  }

  async nextStep(): Promise<boolean> {
    const nextStep = this.stateMachine.getNextStep(this.state.currentStep, this.state);
    
    if (!nextStep) {
      return false;
    }

    const previousStep = this.state.currentStep;
    this.state.currentStep = nextStep;
    this.state.stepStartTime = new Date();
    
    this.updateStepMetrics(previousStep);
    this.stepTimers.set(nextStep, new Date());
    
    await this.persistState();
    return true;
  }

  async previousStep(): Promise<boolean> {
    const steps = Object.values(RitualStep);
    const currentIndex = steps.indexOf(this.state.currentStep);
    
    if (currentIndex <= 0) {
      return false;
    }

    const previousStep = this.state.currentStep;
    this.state.currentStep = steps[currentIndex - 1];
    this.state.stepStartTime = new Date();
    
    this.updateStepMetrics(previousStep);
    this.stepTimers.set(this.state.currentStep, new Date());
    
    await this.persistState();
    return true;
  }

  async completeRitual(): Promise<RitualSummary> {
    if (!this.state.current) {
      throw new Error('No active ritual to complete');
    }

    const completionTime = new Date();
    const totalDuration = (completionTime.getTime() - this.state.current.startTime.getTime()) / (1000 * 60);

    // Update final metrics
    this.updateStepMetrics(this.state.currentStep);
    
    const completedRitual: DailyRitual = {
      ...this.state.current,
      status: 'completed',
      completionTime,
      metrics: {
        ...this.state.current.metrics,
        totalDuration
      }
    };

    const summary: RitualSummary = {
      ritualId: completedRitual.id,
      completionTime,
      totalDuration,
      selectedTasks: completedRitual.selectedTasks,
      scheduledBlocks: completedRitual.scheduledBlocks,
      metrics: completedRitual.metrics
    };

    this.state = {
      ...this.state,
      current: null,
      history: [...this.state.history, completedRitual],
      currentStep: RitualStep.CAPTURE,
      stepStartTime: new Date(),
      pendingItems: [],
      selectedTaskIds: [],
      draftSchedule: []
    };

    this.stepTimers.clear();
    await this.persistState();

    return summary;
  }

  async cancelRitual(): Promise<void> {
    if (!this.state.current) {
      return;
    }

    const cancelledRitual: DailyRitual = {
      ...this.state.current,
      status: 'cancelled',
      completionTime: new Date()
    };

    this.state = {
      ...this.state,
      current: null,
      history: [...this.state.history, cancelledRitual],
      currentStep: RitualStep.CAPTURE,
      stepStartTime: new Date(),
      pendingItems: [],
      selectedTaskIds: [],
      draftSchedule: []
    };

    this.stepTimers.clear();
    await this.persistState();
  }

  getCurrentState(): RitualState {
    return { ...this.state };
  }

  getElapsedTime(): number {
    if (!this.state.current) {
      return 0;
    }
    
    const now = new Date();
    return (now.getTime() - this.state.current.startTime.getTime()) / (1000 * 60);
  }

  getStepElapsedTime(): number {
    const now = new Date();
    return (now.getTime() - this.state.stepStartTime.getTime()) / (1000 * 60);
  }

  shouldShowTimeReminder(): boolean {
    return this.getElapsedTime() >= this.config.timeReminderThreshold;
  }

  shouldAutoComplete(): boolean {
    return this.getElapsedTime() >= this.config.autoCompleteThreshold;
  }

  private generateRitualId(): string {
    const date = new Date().toISOString().split('T')[0];
    const timestamp = Date.now().toString(36);
    return `ritual-${date}-${timestamp}`;
  }

  private initializeMetrics(): RitualMetrics {
    return {
      totalDuration: 0,
      stepDurations: {
        [RitualStep.CAPTURE]: 0,
        [RitualStep.CLARIFY]: 0,
        [RitualStep.SELECT]: 0,
        [RitualStep.SCHEDULE]: 0,
        [RitualStep.START]: 0
      },
      itemsCaptured: 0,
      itemsClarified: 0,
      blocksScheduled: 0,
      keyboardShortcutsUsed: 0
    };
  }

  private updateStepMetrics(step: RitualStep): void {
    if (!this.state.current) return;

    const stepStartTime = this.stepTimers.get(step);
    if (!stepStartTime) return;

    const duration = (new Date().getTime() - stepStartTime.getTime()) / (1000 * 60);
    
    this.state.current.metrics.stepDurations[step] = duration;
  }

  private async persistState(): Promise<void> {
    await this.persistenceService.saveRitualState(this.state);
  }
}