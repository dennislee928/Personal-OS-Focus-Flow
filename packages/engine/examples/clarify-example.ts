/**
 * Example usage of the Clarify Processor with GTD 2-minute rule
 */

import { 
  ClarifyService, 
  ClarifyController, 
  DelegationService,
  InboxItem,
  Assignee 
} from '../src/index.js';

// Sample inbox items for demonstration
const sampleInboxItems: InboxItem[] = [
  {
    id: 'item-1',
    content: 'Reply to client email about project timeline',
    createdAt: new Date(),
    source: 'manual',
    tags: ['email', 'client'],
    estimatedDuration: 5
  },
  {
    id: 'item-2', 
    content: 'Implement user authentication system',
    createdAt: new Date(),
    source: 'manual',
    tags: ['development', 'deep'],
    estimatedDuration: 120
  },
  {
    id: 'item-3',
    content: 'Schedule team meeting for next week',
    createdAt: new Date(),
    source: 'manual',
    tags: ['admin', 'meeting'],
    estimatedDuration: 10
  },
  {
    id: 'item-4',
    content: 'Research new deployment strategies',
    createdAt: new Date(),
    source: 'manual',
    tags: ['research', 'deep'],
    estimatedDuration: 90
  }
];

// Sample assignees for delegation
const sampleAssignees: Assignee[] = [
  {
    id: 'john-doe',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Senior Developer',
    availability: 'available',
    workload: 60,
    skills: ['javascript', 'react', 'node.js']
  },
  {
    id: 'jane-smith',
    name: 'Jane Smith', 
    email: 'jane@example.com',
    role: 'Project Manager',
    availability: 'available',
    workload: 45,
    skills: ['project-management', 'coordination']
  },
  {
    id: 'bob-wilson',
    name: 'Bob Wilson',
    email: 'bob@example.com', 
    role: 'DevOps Engineer',
    availability: 'busy',
    workload: 85,
    skills: ['docker', 'kubernetes', 'aws']
  }
];

async function demonstrateClarifyProcess() {
  console.log('🎯 Daily Start Ritual - Clarify Processor Demo\n');

  // Initialize services
  const clarifyService = new ClarifyService({
    twoMinuteThreshold: 120000, // 2 minutes
    batchProcessingEnabled: true,
    autoAdvanceEnabled: true
  });

  const delegationService = new DelegationService({
    enableAssigneeValidation: true,
    enableWorkloadTracking: true,
    defaultDeferralDays: 1
  });

  // Add sample assignees
  sampleAssignees.forEach(assignee => {
    delegationService.addAssignee(assignee);
  });

  // Initialize controller
  const clarifyController = new ClarifyController(clarifyService, delegationService, {
    enableKeyboardShortcuts: true,
    showProgressIndicator: true,
    enableBatchSuggestions: true,
    autoStartTimer: false // Disable for demo
  });

  try {
    // Start clarify process
    console.log('📥 Starting clarify process with', sampleInboxItems.length, 'items...\n');
    
    let state = await clarifyController.startClarifyProcess(sampleInboxItems);
    
    // Process each item
    for (let i = 0; i < sampleInboxItems.length; i++) {
      const currentItem = state.currentItem;
      if (!currentItem) break;

      console.log(`📋 Processing item ${i + 1}/${sampleInboxItems.length}:`);
      console.log(`   Content: "${currentItem.content}"`);
      console.log(`   Estimated Duration: ${currentItem.estimatedDuration} minutes`);
      console.log(`   Tags: [${currentItem.tags.join(', ')}]`);

      // Demonstrate 2-minute rule logic
      let action: 'do' | 'delegate' | 'defer';
      let assignee: string | undefined;
      let dueDate: Date | undefined;

      if (currentItem.estimatedDuration && currentItem.estimatedDuration <= 2) {
        // 2-minute rule: Do it now
        action = 'do';
        console.log('   ⚡ 2-minute rule: Do it now!');
      } else if (currentItem.tags.includes('development') && currentItem.estimatedDuration && currentItem.estimatedDuration > 60) {
        // Delegate complex development tasks
        action = 'delegate';
        assignee = 'john-doe'; // Assign to senior developer
        console.log('   👥 Delegating to John Doe (Senior Developer)');
      } else if (currentItem.tags.includes('research')) {
        // Defer research tasks to dedicated time
        action = 'defer';
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 2); // Defer 2 days
        console.log('   📅 Deferring until', dueDate.toDateString());
      } else {
        // Default to doing it
        action = 'do';
        console.log('   ✅ Will do this task');
      }

      // Get context suggestion from tagger
      const contextTagger = clarifyController.getContextTagger();
      await contextTagger.initializeForItem(currentItem);
      const contextState = contextTagger.getState();
      const suggestedContext = contextState.suggestedContext || '@shallow';

      console.log(`   🏷️  Context: ${suggestedContext} (${contextState.suggestionReason})`);

      // Make decision
      try {
        state = await clarifyController.makeDecision({
          action,
          assignee,
          dueDate,
          estimatedDuration: currentItem.estimatedDuration || 15,
          context: suggestedContext
        });

        console.log('   ✅ Decision recorded\n');
      } catch (error) {
        console.log('   ❌ Error making decision:', (error as Error).message, '\n');
      }

      // Move to next item if not at the end
      if (i < sampleInboxItems.length - 1) {
        state = await clarifyController.nextItem();
      }
    }

    // Complete the clarify process
    const decisions = await clarifyController.completeClarifyProcess();
    
    console.log('🎉 Clarify process completed!\n');
    console.log('📊 Summary:');
    console.log(`   Total items processed: ${decisions.length}`);
    
    const actionCounts = decisions.reduce((acc, decision) => {
      acc[decision.action] = (acc[decision.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`   Actions taken:`);
    console.log(`     - Do: ${actionCounts.do || 0}`);
    console.log(`     - Delegate: ${actionCounts.delegate || 0}`);
    console.log(`     - Defer: ${actionCounts.defer || 0}`);

    // Show metrics
    const metrics = clarifyController.getMetrics();
    console.log(`\n📈 Performance Metrics:`);
    console.log(`   Average decision time: ${Math.round(metrics.averageDecisionTime)}ms`);
    console.log(`   2-minute rule usage: ${metrics.twoMinuteRuleUsage} times`);

    const delegationMetrics = delegationService.getMetrics();
    console.log(`   Items delegated: ${delegationMetrics.totalDelegated}`);
    console.log(`   Items deferred: ${delegationMetrics.totalDeferred}`);

  } catch (error) {
    console.error('❌ Error during clarify process:', error);
  }
}

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateClarifyProcess().catch(console.error);
}

export { demonstrateClarifyProcess };