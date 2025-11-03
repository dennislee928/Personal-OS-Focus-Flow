/**
 * Focus Block Scheduler Example
 * 
 * Demonstrates the complete scheduling workflow including:
 * - Schedule planning interface
 * - Smart scheduling algorithms
 * - Calendar integration
 * - Conflict resolution
 */

import { ScheduleController } from '../src/controllers/schedule-controller.js';
import { Task } from '../src/types/ritual.js';

// Example tasks for scheduling
const exampleTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Review quarterly reports',
    description: 'Analyze Q3 performance metrics and prepare summary',
    importance: 'high',
    effort: 'high',
    context: '@deep',
    dependencies: [],
    estimatedDuration: 90,
    tags: ['analysis', 'reports'],
    createdAt: new Date(),
    updatedAt: new Date(),
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Due in 2 days
  },
  {
    id: 'task-2',
    title: 'Update project documentation',
    description: 'Revise API documentation and user guides',
    importance: 'medium',
    effort: 'medium',
    context: '@shallow',
    dependencies: [],
    estimatedDuration: 45,
    tags: ['documentation', 'writing'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'task-3',
    title: 'Code review for feature branch',
    description: 'Review pull request for new authentication system',
    importance: 'high',
    effort: 'medium',
    context: '@deep',
    dependencies: [],
    estimatedDuration: 60,
    tags: ['code-review', 'security'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'task-4',
    title: 'Respond to customer emails',
    description: 'Handle support tickets and customer inquiries',
    importance: 'medium',
    effort: 'low',
    context: '@shallow',
    dependencies: [],
    estimatedDuration: 30,
    tags: ['communication', 'support'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'task-5',
    title: 'Design system architecture',
    description: 'Plan microservices architecture for new platform',
    importance: 'high',
    effort: 'high',
    context: '@deep',
    dependencies: ['task-1'],
    estimatedDuration: 120,
    tags: ['architecture', 'planning'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'task-6',
    title: 'Team meeting preparation',
    description: 'Prepare agenda and materials for weekly team sync',
    importance: 'low',
    effort: 'low',
    context: '@shallow',
    dependencies: [],
    estimatedDuration: 20,
    tags: ['meetings', 'preparation'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function demonstrateScheduling() {
  console.log('🗓️  Focus Block Scheduler Demo\n');
  
  // Initialize the schedule controller
  const scheduleController = new ScheduleController({
    planningOptions: {
      peakWindow: { start: '09:00', end: '12:00' },
      defaultBlockDuration: 25,
      defaultBreakDuration: 5,
      maxBlocksPerDay: 8,
      workingHours: { start: '08:00', end: '18:00' }
    },
    preferences: {
      autoAdvanceSteps: true,
      showTimeReminders: true,
      defaultBlockDuration: 25,
      peakWorkWindow: { start: '09:00', end: '12:00' },
      keyboardShortcuts: {}
    },
    calendarIntegration: true
  });

  // Initialize scheduling with example tasks
  console.log('📋 Initializing schedule with 6 tasks...');
  const today = new Date();
  await scheduleController.initializeScheduling(exampleTasks, today);
  
  // Get initial state
  const initialState = scheduleController.getScheduleState();
  console.log(`✅ Generated ${initialState.suggestions.length} scheduling suggestions`);
  
  // Display suggestions
  console.log('\n📊 Scheduling Suggestions:');
  initialState.suggestions.forEach((suggestion, index) => {
    console.log(`\n${index + 1}. Score: ${suggestion.score.toFixed(1)}/100`);
    console.log(`   Blocks: ${suggestion.blocks.length}`);
    console.log(`   Reasoning: ${suggestion.reasoning.join(', ')}`);
    if (suggestion.conflicts.length > 0) {
      console.log(`   ⚠️  Conflicts: ${suggestion.conflicts.join(', ')}`);
    }
  });

  // Apply the best suggestion
  console.log('\n🎯 Applying best scheduling suggestion...');
  const applied = scheduleController.applyScheduleSuggestion(0);
  
  if (applied) {
    const scheduledBlocks = scheduleController.getScheduledBlocks();
    console.log(`✅ Successfully scheduled ${scheduledBlocks.length} focus blocks`);
    
    // Display scheduled blocks
    console.log('\n📅 Scheduled Focus Blocks:');
    scheduledBlocks.forEach((block, index) => {
      const startTime = block.startTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      const taskTitles = block.taskIds.map(id => 
        exampleTasks.find(t => t.id === id)?.title || 'Unknown Task'
      ).join(', ');
      
      console.log(`${index + 1}. ${startTime} - ${block.duration}min (${block.type})`);
      console.log(`   📝 ${taskTitles}`);
    });
  }

  // Demonstrate manual scheduling
  console.log('\n🔧 Demonstrating manual scheduling...');
  const manualStartTime = new Date();
  manualStartTime.setHours(15, 30, 0, 0); // 3:30 PM
  
  const manualScheduled = scheduleController.scheduleBlock(
    ['task-2'], // Update documentation
    manualStartTime,
    45, // 45 minutes
    'custom'
  );
  
  if (manualScheduled) {
    console.log('✅ Manually scheduled documentation task at 15:30');
  } else {
    console.log('❌ Failed to schedule manual block (conflict detected)');
  }

  // Validate the final schedule
  console.log('\n🔍 Validating final schedule...');
  const validation = scheduleController.validateSchedule();
  
  if (validation.valid) {
    console.log('✅ Schedule validation passed');
  } else {
    console.log('⚠️  Schedule validation issues:');
    validation.errors.forEach(error => console.log(`   - ${error}`));
  }

  // Get conflicts
  const conflicts = scheduleController.getConflicts();
  if (conflicts.length > 0) {
    console.log('\n⚠️  Schedule Conflicts:');
    conflicts.forEach(conflict => {
      console.log(`   ${conflict.type}: ${conflict.message}`);
      if (conflict.suggestions.length > 0) {
        console.log(`   Suggestions: ${conflict.suggestions.join(', ')}`);
      }
    });
  }

  // Export final schedule
  console.log('\n📤 Exporting schedule summary...');
  const exportData = scheduleController.exportSchedule();
  
  console.log('\n📊 Schedule Summary:');
  console.log(`   Total Blocks: ${exportData.summary.totalBlocks}`);
  console.log(`   Total Duration: ${exportData.summary.totalDuration} minutes`);
  console.log(`   Peak Window Blocks: ${exportData.summary.peakWindowBlocks}`);
  console.log(`   Tasks Covered: ${exportData.summary.tasksCovered}/${exampleTasks.length}`);
  console.log(`   Conflicts: ${exportData.summary.conflicts}`);

  // Demonstrate auto-scheduling
  console.log('\n🤖 Demonstrating auto-scheduling...');
  scheduleController.clearSchedule();
  const autoScheduled = await scheduleController.autoSchedule();
  
  if (autoScheduled) {
    const autoBlocks = scheduleController.getScheduledBlocks();
    console.log(`✅ Auto-scheduled ${autoBlocks.length} blocks using AI optimization`);
  } else {
    console.log('❌ Auto-scheduling failed');
  }

  console.log('\n🎉 Focus Block Scheduler demo completed!');
}

// Demonstrate calendar integration
async function demonstrateCalendarIntegration() {
  console.log('\n📅 Calendar Integration Demo\n');
  
  const scheduleController = new ScheduleController();
  const calendarService = scheduleController.getScheduleService().getCalendarIntegration();
  
  // Get available slots for today
  console.log('🔍 Finding available time slots...');
  const today = new Date();
  const availableSlots = await calendarService.getAvailableSlots(today, 25);
  
  console.log(`✅ Found ${availableSlots.length} available slots:`);
  availableSlots.forEach((slot, index) => {
    const startTime = slot.startTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    const endTime = slot.endTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    console.log(`${index + 1}. ${startTime} - ${endTime} (${slot.duration}min, ${slot.quality} quality)`);
  });

  // Analyze meeting density
  console.log('\n📊 Analyzing meeting density...');
  const densityAnalysis = await calendarService.analyzeMeetingDensity(today);
  
  console.log(`Average density: ${densityAnalysis.averageDensity.toFixed(1)} meetings/hour`);
  console.log(`Peak hours: ${densityAnalysis.peakHours.join(', ')}`);
  console.log(`Quiet hours: ${densityAnalysis.quietHours.join(', ')}`);

  // Suggest optimal buffers
  console.log('\n⏰ Suggesting optimal buffer times...');
  const bufferSuggestions = await calendarService.suggestOptimalBuffers(today);
  
  console.log(`Before meetings: ${bufferSuggestions.beforeMeetings} minutes`);
  console.log(`After meetings: ${bufferSuggestions.afterMeetings} minutes`);
  console.log(`Between blocks: ${bufferSuggestions.betweenBlocks} minutes`);
  console.log(`Reasoning: ${bufferSuggestions.reasoning.join(', ')}`);

  console.log('\n🎉 Calendar integration demo completed!');
}

// Run the demonstrations
async function runDemo() {
  try {
    await demonstrateScheduling();
    await demonstrateCalendarIntegration();
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Export for use in other examples
export {
  demonstrateScheduling,
  demonstrateCalendarIntegration,
  exampleTasks
};

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo();
}