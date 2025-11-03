/**
 * Main entry point for the Daily Start Ritual engine
 */

// Types
export * from './types/ritual.js';

// Workflow Engine
export { RitualWorkflowEngine, type RitualEngineConfig } from './workflow/ritual-engine.js';
export { RitualStateMachine, type StateTransition, type WorkflowEvent } from './workflow/state-machine.js';

// Controllers
export { RitualController, type RitualProgressInfo, type KeyboardShortcutHandler } from './controllers/ritual-controller.js';
export { CaptureController, type CaptureUIState, type CaptureControllerEvents, type KeyboardShortcuts } from './controllers/capture-controller.js';
export { ClarifyController, type ClarifyControllerConfig, type DecisionInterfaceState, type DecisionFormData } from './controllers/clarify-controller.js';

// Services
export { PersistenceService, type StorageAdapter, type PersistenceConfig } from './services/persistence-service.js';
export { CaptureService, type CaptureServiceConfig, type CaptureResult } from './services/capture-service.js';
export { VoiceService, type VoiceServiceConfig, VoiceStatus, VoiceError } from './services/voice-service.js';
export { InboxService, type InboxServiceConfig, type InboxIntegration, type InboxFilter } from './services/inbox-service.js';
export { ClarifyService, type ClarifyServiceConfig, type ClarifySession, type BatchCriteria } from './services/clarify-service.js';

// Adapters
export * from './adapters/index.js';

// Factory function for easy setup
import { PersistenceService, StorageAdapter } from './services/persistence-service.js';
import { CaptureService } from './services/capture-service.js';
import { VoiceService } from './services/voice-service.js';
import { InboxService, InboxIntegration } from './services/inbox-service.js';
import { ClarifyService } from './services/clarify-service.js';
import { CaptureController } from './controllers/capture-controller.js';
import { ClarifyController } from './controllers/clarify-controller.js';
import { RitualWorkflowEngine } from './workflow/ritual-engine.js';
import { RitualController } from './controllers/ritual-controller.js';

export function createRitualSystem(storageAdapter: StorageAdapter, inboxIntegration?: InboxIntegration) {
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
  const clarifyController = new ClarifyController(clarifyService);
  
  return {
    engine,
    controller,
    persistenceService,
    captureService,
    voiceService,
    inboxService,
    captureController,
    clarifyService,
    clarifyController
  };
}