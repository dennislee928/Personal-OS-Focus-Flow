/**
 * Ritual controller for managing UI interactions and step navigation
 */

import { RitualStep, RitualState, RitualSummary, ClarifyDecision, FocusBlock } from '../types/ritual.js';
import { RitualWorkflowEngine } from '../workflow/ritual-engine.js';
import { WorkflowEvent } from '../workflow/state-machine.js';

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

export class RitualController {
  private engine: RitualWorkflowEngine;
  private keyboardHandlers: Map<string, KeyboardShortcutHandler> = new Map();
  private progressCallbacks: ((progress: RitualProgressInfo) => void)[] = [];

  constructor(engine: RitualWorkflowEngine) {
    this.engine = engine;
    this.setupKeyboardHandlers();
  }

  private setupKeyboardHandlers(): void {
    const handlers: KeyboardShortcutHandler[] = [
      {
        key: 'Tab',
        handler: this.handleNextStep.bind(this),
        description: 'Move to next step'
      },
      {
        key: 'Shift+Tab',
        handler: this.handlePreviousStep.bind(this),
        description: 'Move to previous step'
      },
      {
        key: 'Enter',
        handler: this.handleCompleteStep.bind(this),
        description: 'Complete current step'
      },
      {
        key: 'Escape',
        handler: this.handleCancel.bind(this),
        description: 'Cancel ritual'
      },
      {
        key: 'Ctrl+S',
        handler: this.handleQuickSave.bind(this),
        description: 'Quick save progress'
      }
    ];

    handlers.forEach(handler => {
      this.keyboardHandlers.set(handler.key, handler);
    });
  }

  async startRitual(): Promise<string> {
    const ritualId = await this.engine.startRitual();
    this.notifyProgressUpdate();
    return ritualId;
  }

  async captureItems(items: any[]): Promise<void> {
    const event: WorkflowEvent = {
      type: 'CAPTURE_COMPLETE',
      payload: { items },
      timestamp: new Date()
    };

    await this.engine.processEvent(event);
    this.notifyProgressUpdate();
  }

  async clarifyItems(decisions: ClarifyDecision[]): Promise<void> {
    const event: WorkflowEvent = {
      type: 'CLARIFY_COMPLETE',
      payload: { decisions },
      timestamp: new Date()
    };

    await this.engine.processEvent(event);
    this.notifyProgressUpdate();
  }

  async selectTasks(taskIds: string[]): Promise<void> {
    if (taskIds.length !== 6) {
      throw new Error('Exactly 6 tasks must be selected for the Ivy Lee method');
    }

    const event: WorkflowEvent = {
      type: 'TASKS_SELECTED',
      payload: { taskIds },
      timestamp: new Date()
    };

    await this.engine.processEvent(event);
    this.notifyProgressUpdate();
  }

  async scheduleBlocks(blocks: FocusBlock[]): Promise<void> {
    if (blocks.length < 2) {
      throw new Error('At least 2 focus blocks must be scheduled');
    }

    const event: WorkflowEvent = {
      type: 'SCHEDULE_COMPLETE',
      payload: { blocks },
      timestamp: new Date()
    };

    await this.engine.processEvent(event);
    this.notifyProgressUpdate();
  }

  async startFocusSession(): Promise<RitualSummary> {
    const event: WorkflowEvent = {
      type: 'RITUAL_START',
      payload: {},
      timestamp: new Date()
    };

    await this.engine.processEvent(event);
    const summary = await this.engine.completeRitual();
    this.notifyProgressUpdate();
    
    return summary;
  }

  async nextStep(): Promise<boolean> {
    const success = await this.engine.nextStep();
    if (success) {
      this.notifyProgressUpdate();
    }
    return success;
  }

  async previousStep(): Promise<boolean> {
    const success = await this.engine.previousStep();
    if (success) {
      this.notifyProgressUpdate();
    }
    return success;
  }

  async cancelRitual(): Promise<void> {
    await this.engine.cancelRitual();
    this.notifyProgressUpdate();
  }

  getCurrentState(): RitualState {
    return this.engine.getCurrentState();
  }

  getProgressInfo(): RitualProgressInfo {
    const state = this.engine.getCurrentState();
    const steps = Object.values(RitualStep);
    const stepIndex = steps.indexOf(state.currentStep);

    return {
      currentStep: state.currentStep,
      stepIndex,
      totalSteps: steps.length,
      elapsedTime: this.engine.getElapsedTime(),
      stepElapsedTime: this.engine.getStepElapsedTime(),
      showTimeReminder: this.engine.shouldShowTimeReminder(),
      shouldAutoComplete: this.engine.shouldAutoComplete()
    };
  }

  onProgressUpdate(callback: (progress: RitualProgressInfo) => void): void {
    this.progressCallbacks.push(callback);
  }

  removeProgressCallback(callback: (progress: RitualProgressInfo) => void): void {
    const index = this.progressCallbacks.indexOf(callback);
    if (index > -1) {
      this.progressCallbacks.splice(index, 1);
    }
  }

  handleKeyboardShortcut(key: string): Promise<void> {
    const handler = this.keyboardHandlers.get(key);
    if (handler) {
      return handler.handler();
    }
    return Promise.resolve();
  }

  getKeyboardShortcuts(): KeyboardShortcutHandler[] {
    return Array.from(this.keyboardHandlers.values());
  }

  private async handleNextStep(): Promise<void> {
    await this.nextStep();
  }

  private async handlePreviousStep(): Promise<void> {
    await this.previousStep();
  }

  private async handleCompleteStep(): Promise<void> {
    const state = this.getCurrentState();
    
    switch (state.currentStep) {
      case RitualStep.CAPTURE:
        // Auto-advance if no pending items to capture
        if (state.pendingItems.length === 0) {
          await this.nextStep();
        }
        break;
      case RitualStep.CLARIFY:
        // Auto-advance if all items are clarified
        if (state.pendingItems.every(item => 
          state.current?.clarifiedItems.some(decision => decision.itemId === item.id)
        )) {
          await this.nextStep();
        }
        break;
      case RitualStep.SELECT:
        // Auto-advance if exactly 6 tasks are selected
        if (state.selectedTaskIds.length === 6) {
          await this.nextStep();
        }
        break;
      case RitualStep.SCHEDULE:
        // Auto-advance if at least 2 blocks are scheduled
        if (state.draftSchedule.length >= 2) {
          await this.nextStep();
        }
        break;
      case RitualStep.START:
        // Complete the ritual
        await this.startFocusSession();
        break;
    }
  }

  private async handleCancel(): Promise<void> {
    await this.cancelRitual();
  }

  private async handleQuickSave(): Promise<void> {
    // The engine automatically persists state, so this is a no-op
    // but could trigger a visual confirmation
    console.log('Progress saved');
  }

  private notifyProgressUpdate(): void {
    const progress = this.getProgressInfo();
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }
}