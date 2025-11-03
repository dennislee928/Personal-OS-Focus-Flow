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
// Services
export { PersistenceService } from './services/persistence-service.js';
export { CaptureService } from './services/capture-service.js';
export { VoiceService, VoiceStatus, VoiceError } from './services/voice-service.js';
export { InboxService } from './services/inbox-service.js';
// Adapters
export * from './adapters/index.js';
// Factory function for easy setup
import { PersistenceService } from './services/persistence-service.js';
import { CaptureService } from './services/capture-service.js';
import { VoiceService } from './services/voice-service.js';
import { InboxService } from './services/inbox-service.js';
import { CaptureController } from './controllers/capture-controller.js';
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
    return {
        engine,
        controller,
        persistenceService,
        captureService,
        voiceService,
        inboxService,
        captureController
    };
}
