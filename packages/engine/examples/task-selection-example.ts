/**
 * Task Selection Example - Demonstrates Ivy-6 task selection with prioritization
 */

import { 
  Task, 
  TaskSelectionService, 
  TaskSelectionController, 
  TaskSelectionInterface 
} from '../src/index.js';

// Sample tasks for demonstration
const sampleTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Review quarterly reports',
    description: 'Analyze Q3 performance metrics and prepare summary',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Due in 2 days
    importance: 'high',
    effort: 'medium',
    context: '@deep',
    dependencies: [],
    estimatedDuration: 90,
    tags: ['analysis', 'reports'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'task-2',
    title: 'Update project documentation',
    description: 'Refresh README and API docs',
    importance: 'medium',
    effort: 'low',
    context: '@shallow',
    dependencies: [],
    estimatedDuration: 45,
    tags: ['documentation'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'task-3',
    title: 'Implement user authentication',
    description: 'Build secure login system with JWT tokens',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Due in 5 days
    importance: 'high',
    effort: 'high',
    context: '@deep',
    dependencies: ['task-4'], // Depends on database setup
    estimatedDuration: 180,
    tags: ['security', 'backend'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'task-4',
    title: 'Set up database schema',
    description: 'Design and implement user tables',
    importance: 'high',
    effort: 'medium',
    context: '@deep',
    dependencies: [],
    estimatedDuration: 60,
    tags: ['database', 'backend'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'task-5',
    title: 'Send team meeting invites',
    description: 'Schedule and invite team for sprint planning',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Due tomorrow
    importance: 'medium',
    effort: 'low',
    context: '@shallow',
    dependencies: [],
    estimatedDuration: 15,
    tags: ['meetings', 'coordination'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'task-6',
    title: 'Code review for PR #123',
    description: 'Review authentication module implementation',
    importance: 'medium',
    effort: 'medium',
    context: '@deep',
    dependencies: [],
    estimatedDuration: 45,
    tags: ['code-review', 'quality'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'task-7',
    title: 'Update team on project status',
    description: 'Prepare and send weekly status update',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Due tomorrow
    importance: 'low',
    effort: 'low',
    context: '@shallow',
    dependencies: [],
    estimatedDuration: 30,
    tags: ['communication', 'status'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'task-8',
    title: 'Optimize database queries',
    description: 'Improve performance of user lookup queries',
    importance: 'medium',
    effort: 'high',
    context: '@deep',
    dependencies: ['task-4'], // Depends on database setup
    estimatedDuration: 120,
    tags: ['performance', 'database'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Example 1: Basic Task Selection Service Usage
function demonstrateTaskSelectionService() {
  console.log('=== Task Selection Service Demo ===\n');

  const service = new TaskSelectionService({
    constraints: {
      maxTasks: 6,
      maxDeepWorkTasks: 4,
      maxShallowTasks: 4,
      maxDailyEffort: 480 // 8 hours
    },
    priorityWeights: {
      dueDateUrgency: 0.3,
      importance: 0.25,
      effort: 0.2,
      contextBalance: 0.15,
      dependencies: 0.1
    }
  });

  // Calculate priority scores
  const priorityScores = service.calculatePriorityScores(sampleTasks);
  console.log('Priority Scores:');
  priorityScores
    .sort((a, b) => b.score - a.score)
    .forEach(score => {
      const task = sampleTasks.find(t => t.id === score.taskId);
      console.log(`  ${task?.title}: ${score.score.toFixed(3)} (due: ${score.factors.dueDateUrgency.toFixed(2)}, importance: ${score.factors.importance.toFixed(2)})`);
    });

  // Get suggestions
  const suggestions = service.getSuggestions(sampleTasks, []);
  console.log('\nTop Suggestions:');
  suggestions.forEach((task, index) => {
    console.log(`  ${index + 1}. ${task.title} (${task.context}, ${task.effort} effort)`);
  });

  // Test selection validation
  const testSelection = ['task-1', 'task-2', 'task-3', 'task-4', 'task-5', 'task-6'];
  const validationErrors = service.validateSelection(sampleTasks, testSelection);
  console.log('\nValidation Results:');
  if (validationErrors.length === 0) {
    console.log('  ✅ Selection is valid');
  } else {
    validationErrors.forEach(error => console.log(`  ❌ ${error}`));
  }

  // Workload analysis
  const selectedTasks = sampleTasks.filter(t => testSelection.includes(t.id));
  const workloadAnalysis = service.estimateRealisticCapacity(selectedTasks);
  console.log('\nWorkload Analysis:');
  console.log(`  Total: ${workloadAnalysis.totalMinutes}min`);
  console.log(`  Deep Work: ${workloadAnalysis.deepWorkMinutes}min`);
  console.log(`  Shallow Work: ${workloadAnalysis.shallowWorkMinutes}min`);
  console.log(`  Recommended Tasks: ${workloadAnalysis.recommendedTaskCount}`);
  if (workloadAnalysis.capacityWarnings.length > 0) {
    console.log('  Warnings:');
    workloadAnalysis.capacityWarnings.forEach(warning => console.log(`    ⚠️ ${warning}`));
  }

  // Optimal ordering
  const optimalOrder = service.getOptimalTaskOrder(selectedTasks);
  console.log('\nOptimal Task Order:');
  optimalOrder.forEach((task, index) => {
    console.log(`  ${index + 1}. ${task.title} (${task.context})`);
  });
}

// Example 2: Task Selection Controller Usage
function demonstrateTaskSelectionController() {
  console.log('\n=== Task Selection Controller Demo ===\n');

  const controller = new TaskSelectionController({
    constraints: {
      maxTasks: 6
    },
    events: {
      onSelectionChange: (state) => {
        console.log(`Selection changed: ${state.selectedTaskIds.length}/6 tasks selected`);
        if (state.validationErrors.length > 0) {
          console.log('  Validation errors:', state.validationErrors);
        }
      },
      onValidationError: (errors) => {
        console.log('Validation errors:', errors);
      },
      onSelectionComplete: (taskIds) => {
        console.log('Selection completed with tasks:', taskIds);
      }
    }
  });

  // Initialize with tasks
  controller.initialize(sampleTasks);

  // Simulate task selection
  console.log('Selecting tasks...');
  controller.selectTask('task-4'); // Database setup (prerequisite)
  controller.selectTask('task-3'); // Authentication (depends on task-4)
  controller.selectTask('task-1'); // Quarterly reports
  controller.selectTask('task-5'); // Meeting invites (urgent)
  controller.selectTask('task-2'); // Documentation
  controller.selectTask('task-6'); // Code review

  // Check current state
  const uiState = controller.getUIState();
  console.log('\nCurrent Selection:');
  uiState.selectedTaskIds.forEach((taskId, index) => {
    const task = sampleTasks.find(t => t.id === taskId);
    console.log(`  ${index + 1}. ${task?.title}`);
  });

  // Test reordering
  console.log('\nApplying optimal ordering...');
  controller.applyOptimalOrdering();

  const reorderedState = controller.getUIState();
  console.log('Optimized Order:');
  reorderedState.selectedTaskIds.forEach((taskId, index) => {
    const task = sampleTasks.find(t => t.id === taskId);
    console.log(`  ${index + 1}. ${task?.title}`);
  });

  // Workload analysis
  const workload = controller.getWorkloadAnalysis();
  console.log('\nWorkload Summary:');
  console.log(`  Total time: ${workload.totalMinutes} minutes`);
  console.log(`  Capacity usage: ${Math.round((workload.totalMinutes / 480) * 100)}%`);

  // Dependency check
  const hasDependencyIssues = controller.hasDependencyIssues();
  console.log(`  Dependency issues: ${hasDependencyIssues ? 'Yes' : 'No'}`);
}

// Example 3: Task Selection Interface Usage (Browser Environment)
function demonstrateTaskSelectionInterface() {
  console.log('\n=== Task Selection Interface Demo ===\n');
  console.log('This example requires a browser environment with DOM support.');
  console.log('The TaskSelectionInterface now includes enhanced drag-and-drop functionality:');
  console.log('  ✨ Visual indicators for task order and importance');
  console.log('  📱 Touch-friendly reordering for mobile compatibility');
  console.log('  ⌨️ Keyboard shortcuts for reordering without mouse');
  console.log('  🎨 Enhanced visual feedback and animations');
  console.log('  ♿ Accessibility features and screen reader support');
  console.log('');
  console.log('To use the enhanced TaskSelectionInterface:');
  console.log(`
  const interface = new TaskSelectionInterface({
    container: document.getElementById('task-selection'),
    showPriorityScores: true,
    enableKeyboardShortcuts: true,
    events: {
      onSelectionComplete: (taskIds) => {
        console.log('User completed selection:', taskIds);
        // Proceed to next step in ritual
      }
    }
  });

  // Show the interface with available tasks
  interface.show(sampleTasks);
  
  // Enhanced drag-and-drop features:
  // - Drag tasks by the handle (⋮⋮) to reorder
  // - Long press on mobile to start dragging
  // - Use Ctrl+↑/↓ to move tasks with keyboard
  // - Use Ctrl+Home/End to move to top/bottom
  // - Visual feedback shows drop zones and position changes
  `);
  console.log('');
  console.log('For a complete interactive demo, see: examples/drag-drop-example.ts');
}

// Run examples
if (typeof window === 'undefined') {
  // Node.js environment
  demonstrateTaskSelectionService();
  demonstrateTaskSelectionController();
  demonstrateTaskSelectionInterface();
} else {
  // Browser environment
  console.log('Task Selection examples loaded. Check the console for demonstrations.');
}

export {
  sampleTasks,
  demonstrateTaskSelectionService,
  demonstrateTaskSelectionController,
  demonstrateTaskSelectionInterface
};