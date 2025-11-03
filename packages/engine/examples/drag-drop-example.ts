/**
 * Drag and Drop Ordering Example
 * Demonstrates enhanced drag-and-drop functionality for task reordering
 */

import { TaskSelectionInterface } from '../src/components/task-selection-interface.js';
import { Task } from '../src/types/ritual.js';

// Sample tasks for demonstration
const sampleTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Review quarterly reports',
    description: 'Analyze Q3 performance metrics and prepare summary',
    importance: 'high',
    effort: 'medium',
    context: '@deep',
    dependencies: [],
    estimatedDuration: 90,
    tags: ['analysis', 'reports'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    dueDate: new Date('2024-01-20')
  },
  {
    id: 'task-2',
    title: 'Update project documentation',
    description: 'Refresh API docs and user guides',
    importance: 'medium',
    effort: 'low',
    context: '@shallow',
    dependencies: [],
    estimatedDuration: 45,
    tags: ['documentation', 'maintenance'],
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-14')
  },
  {
    id: 'task-3',
    title: 'Implement user authentication',
    description: 'Build secure login system with JWT tokens',
    importance: 'high',
    effort: 'high',
    context: '@deep',
    dependencies: ['task-5'],
    estimatedDuration: 180,
    tags: ['development', 'security'],
    createdAt: new Date('2024-01-13'),
    updatedAt: new Date('2024-01-13'),
    dueDate: new Date('2024-01-25')
  },
  {
    id: 'task-4',
    title: 'Team standup meeting',
    description: 'Daily sync with development team',
    importance: 'medium',
    effort: 'low',
    context: '@shallow',
    dependencies: [],
    estimatedDuration: 30,
    tags: ['meeting', 'communication'],
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16')
  },
  {
    id: 'task-5',
    title: 'Database schema design',
    description: 'Design user tables and relationships',
    importance: 'high',
    effort: 'medium',
    context: '@deep',
    dependencies: [],
    estimatedDuration: 120,
    tags: ['database', 'design'],
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
    dueDate: new Date('2024-01-18')
  },
  {
    id: 'task-6',
    title: 'Code review for PR #123',
    description: 'Review authentication module implementation',
    importance: 'medium',
    effort: 'low',
    context: '@shallow',
    dependencies: ['task-3'],
    estimatedDuration: 60,
    tags: ['review', 'quality'],
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16')
  },
  {
    id: 'task-7',
    title: 'Performance optimization',
    description: 'Optimize database queries and API responses',
    importance: 'medium',
    effort: 'high',
    context: '@deep',
    dependencies: [],
    estimatedDuration: 150,
    tags: ['performance', 'optimization'],
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-11')
  },
  {
    id: 'task-8',
    title: 'Client presentation prep',
    description: 'Prepare slides for project demo',
    importance: 'high',
    effort: 'medium',
    context: '@shallow',
    dependencies: ['task-3', 'task-5'],
    estimatedDuration: 75,
    tags: ['presentation', 'client'],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    dueDate: new Date('2024-01-22')
  }
];

/**
 * Initialize the drag-and-drop task selection demo
 */
function initializeDragDropDemo(): void {
  console.log('🎯 Initializing Enhanced Drag-and-Drop Task Selection Demo');

  // Create container for the demo
  const container = document.createElement('div');
  container.id = 'drag-drop-demo';
  container.innerHTML = `
    <div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
      <h1>Enhanced Drag-and-Drop Task Selection</h1>
      <p>This demo showcases the enhanced drag-and-drop functionality for task reordering with:</p>
      <ul>
        <li>✨ Visual indicators for task order and importance</li>
        <li>📱 Touch-friendly reordering for mobile compatibility</li>
        <li>⌨️ Keyboard shortcuts for reordering without mouse</li>
        <li>🎨 Enhanced visual feedback and animations</li>
        <li>♿ Accessibility features and screen reader support</li>
      </ul>
      
      <div class="demo-instructions" style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <h3>How to Use:</h3>
        <ul>
          <li><strong>Mouse:</strong> Drag tasks by the handle (⋮⋮) to reorder</li>
          <li><strong>Touch:</strong> Long press on handle, then drag to reorder</li>
          <li><strong>Keyboard:</strong> Focus task + Ctrl+↑/↓ to move, Ctrl+Home/End for top/bottom</li>
        </ul>
      </div>
      
      <div id="task-selection-container"></div>
      
      <div class="demo-output" style="margin-top: 20px; padding: 16px; background: #f1f5f9; border-radius: 8px;">
        <h3>Current Selection Order:</h3>
        <div id="selection-output">No tasks selected yet</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Initialize task selection interface
  const taskSelectionContainer = document.getElementById('task-selection-container')!;
  const selectionOutput = document.getElementById('selection-output')!;

  const taskSelection = new TaskSelectionInterface({
    container: taskSelectionContainer,
    enableKeyboardShortcuts: true,
    showPriorityScores: true,
    events: {
      onSelectionChange: (state) => {
        updateSelectionOutput(state, selectionOutput);
      },
      onSelectionComplete: (taskIds) => {
        console.log('✅ Selection completed:', taskIds);
        alert(`Selection completed! Selected ${taskIds.length} tasks in priority order.`);
      }
    }
  });

  // Show the interface with sample tasks
  taskSelection.show(sampleTasks);

  console.log('✨ Demo initialized! Try selecting and reordering tasks.');
}

/**
 * Update the selection output display
 */
function updateSelectionOutput(state: any, outputElement: HTMLElement): void {
  if (state.selectedTaskIds.length === 0) {
    outputElement.innerHTML = 'No tasks selected yet';
    return;
  }

  const selectedTasks = state.tasks.filter((task: Task) => 
    state.selectedTaskIds.includes(task.id)
  );

  // Sort by selection order
  const orderedTasks = state.selectedTaskIds
    .map((id: string) => selectedTasks.find((task: Task) => task.id === id))
    .filter((task: Task | undefined) => task !== undefined) as Task[];

  outputElement.innerHTML = `
    <ol style="margin: 0; padding-left: 20px;">
      ${orderedTasks.map((task, index) => `
        <li style="margin-bottom: 8px;">
          <strong>${task.title}</strong>
          <span style="color: #64748b; font-size: 14px;">
            (${task.context}, ${task.effort} effort, ${task.estimatedDuration}min)
            ${index === 0 ? ' 🐸 <em>Frog Task</em>' : ''}
          </span>
        </li>
      `).join('')}
    </ol>
    <div style="margin-top: 12px; font-size: 14px; color: #64748b;">
      Total estimated time: ${orderedTasks.reduce((sum, task) => sum + task.estimatedDuration, 0)} minutes
    </div>
  `;
}

/**
 * Demonstrate keyboard shortcuts
 */
function demonstrateKeyboardShortcuts(): void {
  console.log('⌨️ Keyboard Shortcuts for Task Reordering:');
  console.log('  • Focus a task and use Ctrl+↑ to move up');
  console.log('  • Focus a task and use Ctrl+↓ to move down');
  console.log('  • Focus a task and use Ctrl+Home to move to top');
  console.log('  • Focus a task and use Ctrl+End to move to bottom');
  console.log('  • Use Delete/Backspace to remove from selection');
  console.log('  • Use Ctrl+Enter to complete selection');
  console.log('  • Use Escape to clear all selections');
}

/**
 * Demonstrate touch gestures
 */
function demonstrateTouchGestures(): void {
  console.log('📱 Touch Gestures for Task Reordering:');
  console.log('  • Long press on drag handle (⋮⋮) to start dragging');
  console.log('  • Drag to desired position and release');
  console.log('  • Haptic feedback provided when drag starts');
  console.log('  • Visual feedback shows drop zones and position changes');
}

// Export for use in other examples
export {
  initializeDragDropDemo,
  demonstrateKeyboardShortcuts,
  demonstrateTouchGestures,
  sampleTasks
};

// Auto-initialize if running directly
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeDragDropDemo();
    demonstrateKeyboardShortcuts();
    demonstrateTouchGestures();
  });
}