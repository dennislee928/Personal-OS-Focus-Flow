/**
 * Task Prioritization Example
 * Demonstrates the task prioritization algorithms in action
 */

import { TaskSelectionService } from '../src/services/task-selection-service.js';
import { Task } from '../src/types/ritual.js';

/**
 * Create example tasks with different characteristics
 */
function createExampleTasks(): Task[] {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 'urgent-bug',
      title: 'Fix Critical Production Bug',
      description: 'System is down, needs immediate attention',
      dueDate: now,
      importance: 'high',
      effort: 'high',
      context: '@deep',
      dependencies: [],
      estimatedDuration: 120,
      tags: ['urgent', 'bug', 'production'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'quick-email',
      title: 'Reply to Client Email',
      description: 'Quick response needed',
      dueDate: tomorrow,
      importance: 'medium',
      effort: 'low',
      context: '@shallow',
      dependencies: [],
      estimatedDuration: 15,
      tags: ['communication', 'client'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'feature-design',
      title: 'Design New Feature Architecture',
      description: 'Plan the technical approach for upcoming feature',
      dueDate: nextWeek,
      importance: 'high',
      effort: 'high',
      context: '@deep',
      dependencies: [],
      estimatedDuration: 180,
      tags: ['design', 'architecture'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'feature-implementation',
      title: 'Implement New Feature',
      description: 'Code the feature based on approved design',
      dueDate: nextWeek,
      importance: 'high',
      effort: 'high',
      context: '@deep',
      dependencies: ['feature-design'],
      estimatedDuration: 240,
      tags: ['implementation', 'coding'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'team-standup',
      title: 'Attend Daily Standup',
      description: 'Daily team synchronization meeting',
      dueDate: tomorrow,
      importance: 'medium',
      effort: 'low',
      context: '@shallow',
      dependencies: [],
      estimatedDuration: 30,
      tags: ['meeting', 'team'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'documentation',
      title: 'Update API Documentation',
      description: 'Document recent API changes',
      importance: 'low',
      effort: 'medium',
      context: '@shallow',
      dependencies: [],
      estimatedDuration: 60,
      tags: ['documentation', 'api'],
      createdAt: now,
      updatedAt: now
    }
  ];
}

/**
 * Demonstrate priority scoring
 */
function demonstratePriorityScoring(): void {
  console.log('🎯 Task Prioritization Algorithm Demo\n');
  
  const service = new TaskSelectionService();
  const tasks = createExampleTasks();
  
  console.log('📋 Available Tasks:');
  tasks.forEach((task, index) => {
    const dueText = task.dueDate ? task.dueDate.toLocaleDateString() : 'No due date';
    console.log(`${index + 1}. ${task.title}`);
    console.log(`   Due: ${dueText} | Importance: ${task.importance} | Effort: ${task.effort} | Context: ${task.context}`);
    console.log(`   Duration: ${task.estimatedDuration}min | Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}\n`);
  });
  
  // Calculate priority scores
  const scores = service.calculatePriorityScores(tasks);
  
  console.log('🏆 Priority Scores (Higher = More Important):');
  console.log('─'.repeat(80));
  
  // Sort by score for display
  const sortedScores = scores.sort((a, b) => b.score - a.score);
  
  sortedScores.forEach((score, index) => {
    const task = tasks.find(t => t.id === score.taskId)!;
    console.log(`${index + 1}. ${task.title}`);
    console.log(`   Overall Score: ${score.score.toFixed(3)}`);
    console.log(`   Factors:`);
    console.log(`     • Due Date Urgency: ${score.factors.dueDateUrgency.toFixed(2)}`);
    console.log(`     • Importance: ${score.factors.importance.toFixed(2)}`);
    console.log(`     • Effort Balance: ${score.factors.effort.toFixed(2)}`);
    console.log(`     • Context Balance: ${score.factors.contextBalance.toFixed(2)}`);
    console.log(`     • Dependencies: ${score.factors.dependencies.toFixed(2)}`);
    console.log('');
  });
}

/**
 * Demonstrate smart suggestions
 */
function demonstrateSmartSuggestions(): void {
  console.log('💡 Smart Task Suggestions Demo\n');
  
  const service = new TaskSelectionService();
  const tasks = createExampleTasks();
  
  // Start with no selection
  console.log('🎯 Initial Suggestions (no tasks selected):');
  const initialSuggestions = service.getSuggestions(tasks, []);
  initialSuggestions.forEach((task, index) => {
    console.log(`${index + 1}. ${task.title} (${task.context}, ${task.importance} importance)`);
  });
  
  // Select a high-effort deep work task
  console.log('\n🎯 Suggestions after selecting "Fix Critical Production Bug":');
  const afterBugFix = service.getSuggestions(tasks, ['urgent-bug']);
  afterBugFix.forEach((task, index) => {
    console.log(`${index + 1}. ${task.title} (${task.context}, ${task.importance} importance)`);
  });
  
  // Select multiple deep work tasks
  console.log('\n🎯 Suggestions after selecting multiple deep work tasks:');
  const afterDeepWork = service.getSuggestions(tasks, ['urgent-bug', 'feature-design']);
  afterDeepWork.forEach((task, index) => {
    console.log(`${index + 1}. ${task.title} (${task.context}, ${task.importance} importance)`);
  });
  
  console.log('\n💭 Notice how suggestions balance deep vs shallow work!\n');
}

/**
 * Demonstrate dependency detection
 */
function demonstrateDependencyDetection(): void {
  console.log('🔗 Dependency Detection Demo\n');
  
  const service = new TaskSelectionService();
  const tasks = createExampleTasks();
  
  // Check dependencies for implementation task
  const depInfo = service.detectDependencies(tasks, 'feature-implementation');
  
  console.log('📋 Analyzing "Implement New Feature" task:');
  console.log(`Prerequisites: ${depInfo.prerequisites.map(t => t.title).join(', ')}`);
  console.log(`Can be completed: ${depInfo.canBeCompleted ? '✅ Yes' : '❌ No'}`);
  console.log(`Dependent tasks: ${depInfo.dependents.length > 0 ? depInfo.dependents.map(t => t.title).join(', ') : 'None'}`);
  
  // Test validation with missing dependencies
  console.log('\n🚨 Validation with Missing Dependencies:');
  const validationErrors = service.validateSelection(tasks, ['feature-implementation']);
  validationErrors.forEach(error => {
    console.log(`❌ ${error}`);
  });
  
  // Test validation with dependencies met
  console.log('\n✅ Validation with Dependencies Met:');
  const validSelection = service.validateSelection(tasks, ['feature-design', 'feature-implementation']);
  if (validSelection.length === 0) {
    console.log('✅ All dependencies satisfied!');
  } else {
    validSelection.forEach(error => {
      console.log(`❌ ${error}`);
    });
  }
}

/**
 * Demonstrate workload estimation
 */
function demonstrateWorkloadEstimation(): void {
  console.log('\n⏱️ Workload Estimation Demo\n');
  
  const service = new TaskSelectionService();
  const tasks = createExampleTasks();
  
  // Estimate capacity for all tasks
  const capacity = service.estimateRealisticCapacity(tasks);
  
  console.log('📊 Workload Analysis for All Tasks:');
  console.log(`Total Time: ${capacity.totalMinutes} minutes (${(capacity.totalMinutes / 60).toFixed(1)} hours)`);
  console.log(`Deep Work: ${capacity.deepWorkMinutes} minutes (${(capacity.deepWorkMinutes / 60).toFixed(1)} hours)`);
  console.log(`Shallow Work: ${capacity.shallowWorkMinutes} minutes (${(capacity.shallowWorkMinutes / 60).toFixed(1)} hours)`);
  console.log(`Recommended Task Count: ${capacity.recommendedTaskCount}`);
  
  if (capacity.capacityWarnings.length > 0) {
    console.log('\n⚠️ Capacity Warnings:');
    capacity.capacityWarnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
  }
  
  // Test with a more reasonable selection
  const reasonableSelection = tasks.slice(0, 4); // First 4 tasks
  const reasonableCapacity = service.estimateRealisticCapacity(reasonableSelection);
  
  console.log('\n📊 Workload Analysis for Reasonable Selection (4 tasks):');
  console.log(`Total Time: ${reasonableCapacity.totalMinutes} minutes (${(reasonableCapacity.totalMinutes / 60).toFixed(1)} hours)`);
  console.log(`Deep Work: ${reasonableCapacity.deepWorkMinutes} minutes (${(reasonableCapacity.deepWorkMinutes / 60).toFixed(1)} hours)`);
  console.log(`Shallow Work: ${reasonableCapacity.shallowWorkMinutes} minutes (${(reasonableCapacity.shallowWorkMinutes / 60).toFixed(1)} hours)`);
  
  if (reasonableCapacity.capacityWarnings.length === 0) {
    console.log('✅ This selection fits within daily capacity!');
  }
}

/**
 * Run the complete prioritization demo
 */
function runPrioritizationDemo(): void {
  console.log('🚀 Task Prioritization Algorithms Demo\n');
  console.log('This demo shows how the Daily Start Ritual prioritizes tasks using:');
  console.log('• Due date urgency');
  console.log('• Task importance');
  console.log('• Effort balance');
  console.log('• Deep vs shallow work context');
  console.log('• Dependency relationships');
  console.log('• Workload capacity\n');
  console.log('='.repeat(80));
  
  demonstratePriorityScoring();
  console.log('='.repeat(80));
  demonstrateSmartSuggestions();
  console.log('='.repeat(80));
  demonstrateDependencyDetection();
  console.log('='.repeat(80));
  demonstrateWorkloadEstimation();
  
  console.log('\n🎉 Demo Complete!');
  console.log('The prioritization algorithms help you select the most impactful tasks');
  console.log('while maintaining a healthy balance of deep and shallow work.');
}

// Export functions
export {
  runPrioritizationDemo,
  demonstratePriorityScoring,
  demonstrateSmartSuggestions,
  demonstrateDependencyDetection,
  demonstrateWorkloadEstimation,
  createExampleTasks
};

// Auto-run demo if executed directly
if (typeof process !== 'undefined' && process.argv) {
  const isDirectRun = process.argv[1]?.includes('prioritization-example');
  if (isDirectRun) {
    runPrioritizationDemo();
  }
}