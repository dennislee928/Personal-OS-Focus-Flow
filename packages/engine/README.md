# Daily Start Ritual Engine

Core workflow engine for the Daily Start Ritual system, implementing a structured 7-10 minute morning productivity routine that combines GTD (Getting Things Done) principles with the Ivy Lee method and Pomodoro technique.

## Architecture Overview

The engine consists of four main components:

### 1. Workflow Engine (`RitualWorkflowEngine`)
- Orchestrates the complete ritual flow
- Manages timing and progress tracking
- Handles automatic completion at 10-minute threshold
- Provides gentle reminders at 8-minute mark

### 2. State Machine (`RitualStateMachine`)
- Enforces proper step transitions
- Validates completion conditions (e.g., exactly 6 tasks selected)
- Processes workflow events and updates state
- Maintains ritual integrity throughout the process

### 3. Ritual Controller (`RitualController`)
- Provides high-level API for UI interactions
- Manages keyboard shortcuts and navigation
- Handles step-specific validation and progression
- Emits progress updates for UI components

### 4. Persistence Service (`PersistenceService`)
- Handles data storage and retrieval
- Supports multiple storage backends via adapters
- Provides automatic backup and recovery
- Maintains ritual history and preferences

## Core Types

### RitualStep Enum
```typescript
enum RitualStep {
  CAPTURE = 'capture',   // GTD inbox sweep
  CLARIFY = 'clarify',   // 2-minute rule processing
  SELECT = 'select',     // Ivy-6 task selection
  SCHEDULE = 'schedule', // Focus block planning
  START = 'start'        // First block initiation
}
```

### Key Interfaces
- `DailyRitual`: Complete ritual session data
- `RitualMetrics`: Performance and timing metrics
- `RitualState`: Current system state and transient data
- `ClarifyDecision`: GTD clarification outcomes
- `FocusBlock`: Scheduled Pomodoro sessions

## Usage Example

```typescript
import { createRitualSystem, MemoryStorageAdapter } from '@personal-os/engine';

// Initialize the system
const storage = new MemoryStorageAdapter();
const { controller } = createRitualSystem(storage);

// Start a ritual
const ritualId = await controller.startRitual();

// Capture items
await controller.captureItems([
  { id: 'task1', title: 'Review proposal', context: '@deep' }
]);

// Clarify with 2-minute rule
await controller.clarifyItems([
  { itemId: 'task1', action: 'do', estimatedDuration: 45, context: '@deep' }
]);

// Select exactly 6 tasks (Ivy Lee method)
await controller.selectTasks(['task1', 'task2', 'task3', 'task4', 'task5', 'task6']);

// Schedule focus blocks
await controller.scheduleBlocks([
  {
    id: 'block1',
    startTime: new Date(),
    duration: 25,
    taskIds: ['task1'],
    type: 'pomodoro',
    breakDuration: 5
  }
]);

// Complete ritual and start first focus session
const summary = await controller.startFocusSession();
```

## Requirements Compliance

This implementation satisfies the following requirements from the specification:

- **Requirement 6.1**: 10-minute completion target with timing enforcement
- **Requirement 7.1**: Comprehensive state persistence and restoration
- **Requirement 7.5**: Automatic ritual state saving and recovery

## Key Features

### Timing Management
- Real-time progress tracking
- 8-minute gentle reminders
- 10-minute automatic completion
- Step-by-step duration metrics

### State Management
- Robust state machine with validation
- Automatic persistence every 30 seconds
- Recovery from interrupted sessions
- Complete ritual history tracking

### Keyboard Navigation
- Full keyboard shortcut support
- Tab-based step navigation
- Quick completion shortcuts
- Accessibility compliance

### Data Integrity
- Ivy-6 constraint enforcement (exactly 6 tasks)
- Minimum 2 focus blocks requirement
- GTD 2-minute rule validation
- Comprehensive error handling

## Storage Adapters

The system supports pluggable storage backends:

- `MemoryStorageAdapter`: In-memory storage for testing
- Additional adapters can be implemented for:
  - Local file system (JSON/SQLite)
  - Browser localStorage
  - Cloud storage services

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run dev

# Clean build artifacts
npm run clean
```

## Integration

This engine is designed to be integrated with desktop applications built using:
- Electron (recommended for cross-platform deployment)
- Tauri (alternative with smaller footprint)
- Web applications with appropriate storage adapters

The engine provides a clean separation between business logic and UI concerns, making it suitable for various frontend frameworks and platforms.