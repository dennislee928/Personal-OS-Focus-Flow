/**
 * Main entry point for the Daily Start Ritual engine
 */
// Types
export * from './types/ritual.js';
// Workflow Engine
export { RitualWorkflowEngine } from './workflow/ritual-engine.js';
export { RitualStateMachine } from './workflow/state-machine.js';
// Controllers
export { RitualController } from './controllers/ritual-controller.js';
export { CaptureController } from './controllers/capture-controller.js';
export { ClarifyController } from './controllers/clarify-controller.js';
export { TaskSelectionController } from './controllers/task-selection-controller.js';
// Services
export { PersistenceService } from './services/persistence-service.js';
export { CaptureService } from './services/capture-service.js';
export { VoiceService, VoiceStatus, VoiceError } from './services/voice-service.js';
export { InboxService } from './services/inbox-service.js';
export { ClarifyService } from './services/clarify-service.js';
export { DelegationService } from './services/delegation-service.js';
export { TaskSelectionService } from './services/task-selection-service.js';
// Components
export { AssigneeSelector } from './components/assignee-selector.js';
export { DueDatePicker } from './components/due-date-picker.js';
export { ContextTagger } from './components/context-tagger.js';
export { TaskSelectionInterface } from './components/task-selection-interface.js';
export { DragDropOrdering } from './components/drag-drop-ordering.js';
// Adapters
export * from './adapters/index.js';
// Factory function for easy setup
import { PersistenceService } from './services/persistence-service.js';
import { CaptureService } from './services/capture-service.js';
import { VoiceService } from './services/voice-service.js';
import { InboxService } from './services/inbox-service.js';
import { ClarifyService } from './services/clarify-service.js';
import { DelegationService } from './services/delegation-service.js';
import { CaptureController } from './controllers/capture-controller.js';
import { ClarifyController } from './controllers/clarify-controller.js';
import { RitualWorkflowEngine } from './workflow/ritual-engine.js';
import { RitualController } from './controllers/ritual-controller.js';
export function createRitualSystem(storageAdapter, inboxIntegration) {
    const persistenceService = new PersistenceService(storageAdapter);
    const engine = new RitualWorkflowEngine(persistenceService);
    const controller = new RitualController(engine);
    // Create capture system
    const inboxService = inboxIntegration ? new InboxService(inboxIntegration) : undefined;
    const captureService = new CaptureService({}, inboxService);
    const voiceService = new VoiceService();
    const captureController = new CaptureController(captureService, voiceService);
    // Create clarify system
    const clarifyService = new ClarifyService();
    const delegationService = new DelegationService();
    const clarifyController = new ClarifyController(clarifyService, delegationService);
    return {
        engine,
        controller,
        persistenceService,
        captureService,
        voiceService,
        inboxService,
        captureController,
        clarifyService,
        delegationService,
        clarifyController
    };
}
