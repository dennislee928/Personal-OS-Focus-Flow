/**
 * Ritual controller for managing UI interactions and step navigation
 */
import { RitualStep } from '../types/ritual.js';
export class RitualController {
    engine;
    keyboardHandlers = new Map();
    progressCallbacks = [];
    constructor(engine) {
        this.engine = engine;
        this.setupKeyboardHandlers();
    }
    setupKeyboardHandlers() {
        const handlers = [
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
    async startRitual() {
        const ritualId = await this.engine.startRitual();
        this.notifyProgressUpdate();
        return ritualId;
    }
    async captureItems(items) {
        const event = {
            type: 'CAPTURE_COMPLETE',
            payload: { items },
            timestamp: new Date()
        };
        await this.engine.processEvent(event);
        this.notifyProgressUpdate();
    }
    async clarifyItems(decisions) {
        const event = {
            type: 'CLARIFY_COMPLETE',
            payload: { decisions },
            timestamp: new Date()
        };
        await this.engine.processEvent(event);
        this.notifyProgressUpdate();
    }
    async selectTasks(taskIds) {
        if (taskIds.length !== 6) {
            throw new Error('Exactly 6 tasks must be selected for the Ivy Lee method');
        }
        const event = {
            type: 'TASKS_SELECTED',
            payload: { taskIds },
            timestamp: new Date()
        };
        await this.engine.processEvent(event);
        this.notifyProgressUpdate();
    }
    async scheduleBlocks(blocks) {
        if (blocks.length < 2) {
            throw new Error('At least 2 focus blocks must be scheduled');
        }
        const event = {
            type: 'SCHEDULE_COMPLETE',
            payload: { blocks },
            timestamp: new Date()
        };
        await this.engine.processEvent(event);
        this.notifyProgressUpdate();
    }
    async startFocusSession() {
        const event = {
            type: 'RITUAL_START',
            payload: {},
            timestamp: new Date()
        };
        await this.engine.processEvent(event);
        const summary = await this.engine.completeRitual();
        this.notifyProgressUpdate();
        return summary;
    }
    async nextStep() {
        const success = await this.engine.nextStep();
        if (success) {
            this.notifyProgressUpdate();
        }
        return success;
    }
    async previousStep() {
        const success = await this.engine.previousStep();
        if (success) {
            this.notifyProgressUpdate();
        }
        return success;
    }
    async cancelRitual() {
        await this.engine.cancelRitual();
        this.notifyProgressUpdate();
    }
    getCurrentState() {
        return this.engine.getCurrentState();
    }
    getProgressInfo() {
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
    onProgressUpdate(callback) {
        this.progressCallbacks.push(callback);
    }
    removeProgressCallback(callback) {
        const index = this.progressCallbacks.indexOf(callback);
        if (index > -1) {
            this.progressCallbacks.splice(index, 1);
        }
    }
    handleKeyboardShortcut(key) {
        const handler = this.keyboardHandlers.get(key);
        if (handler) {
            return handler.handler();
        }
        return Promise.resolve();
    }
    getKeyboardShortcuts() {
        return Array.from(this.keyboardHandlers.values());
    }
    async handleNextStep() {
        await this.nextStep();
    }
    async handlePreviousStep() {
        await this.previousStep();
    }
    async handleCompleteStep() {
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
                if (state.pendingItems.every(item => state.current?.clarifiedItems.some(decision => decision.itemId === item.id))) {
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
    async handleCancel() {
        await this.cancelRitual();
    }
    async handleQuickSave() {
        // The engine automatically persists state, so this is a no-op
        // but could trigger a visual confirmation
        console.log('Progress saved');
    }
    notifyProgressUpdate() {
        const progress = this.getProgressInfo();
        this.progressCallbacks.forEach(callback => {
            try {
                callback(progress);
            }
            catch (error) {
                console.error('Error in progress callback:', error);
            }
        });
    }
}
