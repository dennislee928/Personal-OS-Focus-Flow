/**
 * Basic usage example of the Daily Start Ritual system
 */

import { 
  createRitualSystem, 
  MemoryStorageAdapter, 
  RitualStep, 
  ClarifyDecision, 
  FocusBlock 
} from '../src/index.js';

async function basicUsageExample() {
  // Create the ritual system with in-memory storage
  const storage = new MemoryStorageAdapter();
  const { controller } = createRitualSystem(storage);

  try {
    console.log('Starting Daily Start Ritual...');
    
    // Start a new ritual
    const ritualId = await controller.startRitual();
    console.log(`Ritual started with ID: ${ritualId}`);

    // Step 1: Capture items
    console.log('\n--- CAPTURE PHASE ---');
    const capturedItems = [
      { id: 'task1', title: 'Review project proposal', context: '@deep' },
      { id: 'task2', title: 'Reply to emails', context: '@shallow' },
      { id: 'task3', title: 'Prepare presentation slides', context: '@deep' },
      { id: 'task4', title: 'Schedule team meeting', context: '@shallow' },
      { id: 'task5', title: 'Code review for feature X', context: '@deep' },
      { id: 'task6', title: 'Update documentation', context: '@shallow' },
      { id: 'task7', title: 'Research new framework', context: '@deep' }
    ];
    
    await controller.captureItems(capturedItems);
    console.log(`Captured ${capturedItems.length} items`);

    // Step 2: Clarify items using 2-minute rule
    console.log('\n--- CLARIFY PHASE ---');
    const clarifyDecisions: ClarifyDecision[] = [
      { itemId: 'task1', action: 'do', estimatedDuration: 45, context: '@deep' },
      { itemId: 'task2', action: 'defer', dueDate: new Date(Date.now() + 86400000), estimatedDuration: 15, context: '@shallow' },
      { itemId: 'task3', action: 'do', estimatedDuration: 60, context: '@deep' },
      { itemId: 'task4', action: 'delegate', assignee: 'team-lead', estimatedDuration: 5, context: '@shallow' },
      { itemId: 'task5', action: 'do', estimatedDuration: 30, context: '@deep' },
      { itemId: 'task6', action: 'do', estimatedDuration: 20, context: '@shallow' },
      { itemId: 'task7', action: 'defer', dueDate: new Date(Date.now() + 172800000), estimatedDuration: 90, context: '@deep' }
    ];

    await controller.clarifyItems(clarifyDecisions);
    console.log(`Clarified ${clarifyDecisions.length} items`);

    // Step 3: Select exactly 6 tasks (Ivy Lee method)
    console.log('\n--- SELECT PHASE ---');
    const selectedTasks = ['task1', 'task3', 'task5', 'task6', 'task2', 'task4'];
    
    await controller.selectTasks(selectedTasks);
    console.log(`Selected 6 priority tasks: ${selectedTasks.join(', ')}`);

    // Step 4: Schedule focus blocks
    console.log('\n--- SCHEDULE PHASE ---');
    const now = new Date();
    const focusBlocks: FocusBlock[] = [
      {
        id: 'block1',
        startTime: new Date(now.getTime() + 60000), // 1 minute from now
        duration: 25,
        taskIds: ['task1', 'task3'],
        type: 'pomodoro',
        breakDuration: 5
      },
      {
        id: 'block2',
        startTime: new Date(now.getTime() + 1860000), // 31 minutes from now
        duration: 25,
        taskIds: ['task5', 'task6'],
        type: 'pomodoro',
        breakDuration: 5
      }
    ];

    await controller.scheduleBlocks(focusBlocks);
    console.log(`Scheduled ${focusBlocks.length} focus blocks`);

    // Step 5: Start the first focus session
    console.log('\n--- START PHASE ---');
    const summary = await controller.startFocusSession();
    
    console.log('\n--- RITUAL COMPLETE ---');
    console.log(`Ritual completed in ${summary.totalDuration.toFixed(1)} minutes`);
    console.log(`Selected tasks: ${summary.selectedTasks.join(', ')}`);
    console.log(`Scheduled blocks: ${summary.scheduledBlocks.length}`);
    
    // Show progress info
    const progress = controller.getProgressInfo();
    console.log(`\nProgress: Step ${progress.stepIndex + 1}/${progress.totalSteps} (${progress.currentStep})`);
    
  } catch (error) {
    console.error('Error during ritual:', error);
  }
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  basicUsageExample().catch(console.error);
}

export { basicUsageExample };