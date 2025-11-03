/**
 * Example demonstrating the capture interface and engine functionality
 */

import { 
  createRitualSystem,
  CaptureController,
  CaptureService,
  VoiceService,
  InboxService,
  MemoryStorageAdapter,
  MemoryInboxAdapter
} from '../src/index.js';

async function demonstrateCaptureInterface() {
  console.log('🚀 Daily Start Ritual - Capture Interface Demo\n');

  // Create storage and inbox adapters
  const storageAdapter = new MemoryStorageAdapter();
  const inboxAdapter = new MemoryInboxAdapter();

  // Create the ritual system with capture functionality
  const system = createRitualSystem(storageAdapter, inboxAdapter);
  
  console.log('✅ System initialized with capture functionality');
  console.log(`📱 Voice support: ${system.voiceService.isVoiceSupported() ? 'Available' : 'Not available'}\n`);

  // Set up event handlers for the capture controller
  system.captureController.on('onItemCaptured', (result) => {
    console.log(`✨ Task captured: "${result.item.content}"`);
    console.log(`   📊 Save time: ${result.saveTime.toFixed(2)}ms`);
    console.log(`   🏷️  Tags: ${result.item.tags.join(', ') || 'none'}`);
    console.log(`   ⏱️  Estimated duration: ${result.item.estimatedDuration}min`);
    console.log(`   🎯 Priority: ${result.item.priority || 'not set'}`);
    console.log(`   🤖 Autocomplete used: ${result.usedAutocomplete ? 'Yes' : 'No'}\n`);
  });

  system.captureController.on('onError', (error) => {
    console.error(`❌ Error: ${error.message}\n`);
  });

  system.captureController.on('onMetricsUpdate', (metrics) => {
    console.log(`📈 Metrics - Entries: ${metrics.entriesCount}, Avg time: ${metrics.averageEntryTime.toFixed(2)}ms\n`);
  });

  // Initialize the capture controller
  await system.captureController.initialize();

  // Demonstrate rapid task entry
  console.log('📝 Demonstrating rapid task entry...\n');

  const sampleTasks = [
    'Review quarterly budget report @admin',
    'Implement user authentication feature @development @deep',
    'Call client about project timeline @meeting urgent',
    'Research new productivity tools @research @deep',
    'Reply to emails from yesterday @email @shallow',
    'Fix bug in payment processing @development urgent'
  ];

  // Capture tasks one by one to show individual processing
  for (const task of sampleTasks) {
    system.captureController.handleInputChange(task);
    await system.captureController.captureCurrentInput();
    
    // Small delay to show the processing
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Demonstrate batch capture
  console.log('📦 Demonstrating batch capture...\n');
  
  const batchTasks = [
    'Prepare presentation for board meeting',
    'Update project documentation',
    'Schedule team retrospective'
  ];

  const batchResults = await system.captureService.batchCapture(batchTasks);
  console.log(`✅ Batch captured ${batchResults.length} tasks\n`);

  // Show suggestions functionality
  console.log('💡 Demonstrating autocomplete suggestions...\n');
  
  // Load suggestions from captured items
  await system.captureService.loadSuggestionsFromInbox();
  
  // Test suggestions
  const suggestions = system.captureService.getSuggestions('review');
  console.log(`🔍 Suggestions for "review": ${suggestions.length} found`);
  suggestions.forEach((suggestion, index) => {
    console.log(`   ${index + 1}. "${suggestion.text}" (used ${suggestion.frequency} times)`);
  });
  console.log();

  // Show inbox integration
  console.log('📥 Inbox integration status...\n');
  
  if (system.inboxService) {
    const allItems = await system.inboxService.getItems();
    console.log(`📊 Total items in inbox: ${allItems.length}`);
    
    const metrics = system.inboxService.getMetrics();
    console.log(`📈 Inbox metrics:`);
    console.log(`   - Items by source: ${JSON.stringify(metrics.itemsBySource)}`);
    console.log(`   - Items by tag: ${JSON.stringify(metrics.itemsByTag)}`);
    console.log(`   - Average processing time: ${metrics.averageProcessingTime.toFixed(2)}ms`);
    console.log();
  }

  // Show capture metrics
  const captureMetrics = system.captureService.getMetrics();
  console.log('📊 Final capture metrics:');
  console.log(`   - Total entries: ${captureMetrics.entriesCount}`);
  console.log(`   - Average entry time: ${captureMetrics.averageEntryTime.toFixed(2)}ms`);
  console.log(`   - Voice entries: ${captureMetrics.voiceEntriesCount}`);
  console.log(`   - Autocomplete usage: ${captureMetrics.autocompleteUsed}`);
  console.log(`   - Keyboard shortcuts used: ${captureMetrics.keyboardShortcutsUsed}`);
  console.log();

  // Show keyboard shortcuts
  console.log('⌨️  Available keyboard shortcuts:');
  const shortcuts = system.captureController.getKeyboardShortcuts();
  Object.entries(shortcuts).forEach(([action, key]) => {
    console.log(`   - ${action}: ${key}`);
  });
  console.log();

  // Show voice commands (if supported)
  if (system.voiceService.isVoiceSupported()) {
    console.log('🎤 Available voice commands:');
    const voiceCommands = system.captureController.getVoiceCommandsHelp();
    voiceCommands.forEach(command => {
      console.log(`   - ${command}`);
    });
  } else {
    console.log('🎤 Voice commands not available (browser/environment limitation)');
  }

  console.log('\n🎉 Capture interface demonstration complete!');
  console.log('💡 The capture system provides:');
  console.log('   ✅ Sub-100ms task entry performance');
  console.log('   ✅ Intelligent autocomplete suggestions');
  console.log('   ✅ Voice input support (when available)');
  console.log('   ✅ Automatic categorization and tagging');
  console.log('   ✅ Batch processing capabilities');
  console.log('   ✅ Comprehensive keyboard shortcuts');
  console.log('   ✅ Seamless inbox integration');
}

// Run the demonstration
demonstrateCaptureInterface().catch(console.error);