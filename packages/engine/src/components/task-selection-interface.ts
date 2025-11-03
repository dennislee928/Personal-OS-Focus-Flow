/**
 * Task Selection Interface Component - UI for Ivy-6 task selection
 */

import { Task } from '../types/ritual.js';
import { TaskSelectionController, TaskSelectionUIState, TaskSelectionControllerConfig } from '../controllers/task-selection-controller.js';
import { DragDropOrdering, DragDropConfig } from './drag-drop-ordering.js';

export interface TaskSelectionInterfaceConfig extends TaskSelectionControllerConfig {
  container?: HTMLElement;
  theme?: 'light' | 'dark';
  showPriorityScores?: boolean;
  enableKeyboardShortcuts?: boolean;
}

export interface TaskSelectionInterfaceState {
  isVisible: boolean;
  isLoading: boolean;
  selectedCount: number;
  maxTasks: number;
  hasErrors: boolean;
  errorMessages: string[];
}

export class TaskSelectionInterface {
  private controller: TaskSelectionController;
  private config: TaskSelectionInterfaceConfig;
  private container: HTMLElement;
  private state: TaskSelectionInterfaceState;
  private dragDrop?: DragDropOrdering;
  private elements: {
    root?: HTMLElement;
    header?: HTMLElement;
    filterInput?: HTMLInputElement;
    sortSelect?: HTMLSelectElement;
    taskList?: HTMLElement;
    selectedTasksList?: HTMLElement;
    suggestions?: HTMLElement;
    footer?: HTMLElement;
    errorDisplay?: HTMLElement;
    completeButton?: HTMLButtonElement;
  } = {};

  constructor(config: TaskSelectionInterfaceConfig = {}) {
    this.config = config;
    this.container = config.container || document.body;

    this.state = {
      isVisible: false,
      isLoading: false,
      selectedCount: 0,
      maxTasks: 6,
      hasErrors: false,
      errorMessages: []
    };

    this.controller = new TaskSelectionController({
      ...config,
      events: {
        onSelectionChange: (uiState) => this.handleSelectionChange(uiState),
        onValidationError: (errors) => this.handleValidationError(errors),
        onSelectionComplete: (taskIds) => this.handleSelectionComplete(taskIds),
        onSuggestionAccepted: (taskId) => this.handleSuggestionAccepted(taskId),
        ...config.events
      }
    });

    this.createInterface();
    this.setupKeyboardShortcuts();
  }

  /**
   * Show the interface with available tasks
   */
  show(tasks: Task[]): void {
    this.controller.initialize(tasks);
    this.state.isVisible = true;
    this.render();
  }

  /**
   * Hide the interface
   */
  hide(): void {
    this.state.isVisible = false;
    if (this.elements.root) {
      this.elements.root.style.display = 'none';
    }
  }

  /**
   * Get current selection
   */
  getSelection(): string[] {
    return this.controller.getUIState().selectedTaskIds;
  }

  private createInterface(): void {
    this.elements.root = document.createElement('div');
    this.elements.root.className = 'task-selection-interface';
    this.elements.root.innerHTML = `
      <div class="task-selection-header">
        <h2>Select Your Top 6 Tasks</h2>
        <div class="selection-counter">
          <span class="selected-count">0</span> / <span class="max-count">6</span> selected
        </div>
      </div>
      
      <div class="task-selection-controls">
        <input type="text" class="filter-input" placeholder="Filter tasks..." />
        <select class="sort-select">
          <option value="priority">Sort by Priority</option>
          <option value="dueDate">Sort by Due Date</option>
          <option value="title">Sort by Title</option>
          <option value="effort">Sort by Effort</option>
        </select>
      </div>

      <div class="error-display" style="display: none;"></div>

      <div class="task-selection-main">
        <div class="available-tasks-section">
          <h3>Available Tasks</h3>
          <div class="task-list"></div>
        </div>

        <div class="selected-tasks-section">
          <div class="selected-tasks-header">
            <h3>Selected Tasks (Drag to Reorder)</h3>
            <div class="optimization-controls">
              <button class="optimize-order-btn">🎯 Optimize Order</button>
              <button class="workload-analysis-btn">📊 Workload Analysis</button>
            </div>
          </div>
          <div class="workload-summary"></div>
          <div class="selected-tasks-list"></div>
          <div class="ordering-instructions">
            <p>Drag tasks to reorder by priority. Top task = highest priority (your "frog").</p>
            <p>Keyboard: Focus task + Ctrl+↑/↓ to move, Ctrl+Home/End for top/bottom</p>
          </div>
        </div>
      </div>

      <div class="suggestions-container">
        <h3>Suggested Tasks</h3>
        <div class="suggestions-list"></div>
      </div>

      <div class="task-selection-footer">
        <button class="clear-button">Clear All</button>
        <button class="complete-button" disabled>Complete Selection</button>
      </div>
    `;

    this.elements.header = this.elements.root.querySelector('.task-selection-header')!;
    this.elements.filterInput = this.elements.root.querySelector('.filter-input') as HTMLInputElement;
    this.elements.sortSelect = this.elements.root.querySelector('.sort-select') as HTMLSelectElement;
    this.elements.taskList = this.elements.root.querySelector('.task-list')!;
    this.elements.selectedTasksList = this.elements.root.querySelector('.selected-tasks-list')!;
    this.elements.suggestions = this.elements.root.querySelector('.suggestions-list')!;
    this.elements.footer = this.elements.root.querySelector('.task-selection-footer')!;
    this.elements.errorDisplay = this.elements.root.querySelector('.error-display')!;
    this.elements.completeButton = this.elements.root.querySelector('.complete-button') as HTMLButtonElement;

    // Additional elements for optimization features
    const workloadSummary = this.elements.root.querySelector('.workload-summary')!;
    const optimizeBtn = this.elements.root.querySelector('.optimize-order-btn')!;
    const workloadBtn = this.elements.root.querySelector('.workload-analysis-btn')!;

    this.setupEventListeners();
    this.setupDragDrop();
    this.container.appendChild(this.elements.root);
  }

  private setupEventListeners(): void {
    // Filter input
    this.elements.filterInput?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.controller.setFilter(target.value);
    });

    // Sort select
    this.elements.sortSelect?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.controller.setSorting(target.value as any);
    });

    // Clear button
    this.elements.root?.querySelector('.clear-button')?.addEventListener('click', () => {
      this.controller.clearSelection();
    });

    // Complete button
    this.elements.completeButton?.addEventListener('click', () => {
      this.controller.completeSelection();
    });

    // Optimization buttons
    this.elements.root?.querySelector('.optimize-order-btn')?.addEventListener('click', () => {
      this.controller.applyOptimalOrdering();
    });

    this.elements.root?.querySelector('.workload-analysis-btn')?.addEventListener('click', () => {
      this.toggleWorkloadAnalysis();
    });
  }

  private setupKeyboardShortcuts(): void {
    if (!this.config.enableKeyboardShortcuts) return;

    document.addEventListener('keydown', (e) => {
      if (!this.state.isVisible) return;

      switch (e.key) {
        case 'Enter':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.controller.completeSelection();
          }
          break;
        case 'Escape':
          e.preventDefault();
          this.controller.clearSelection();
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.elements.filterInput?.focus();
          }
          break;
      }
    });
  }

  private render(): void {
    if (!this.elements.root || !this.state.isVisible) return;

    this.elements.root.style.display = 'block';
    this.renderTaskList();
    this.renderSelectedTasks();
    this.renderWorkloadSummary();
    this.renderSuggestions();
    this.renderSelectionCounter();
    this.renderErrors();
    this.updateCompleteButton();
  }

  private setupDragDrop(): void {
    if (!this.elements.selectedTasksList) return;

    this.dragDrop = new DragDropOrdering({
      container: this.elements.selectedTasksList,
      itemSelector: '.selected-task-item',
      handleSelector: '.drag-handle',
      dragClass: 'dragging',
      dropZoneClass: 'drop-zone-active',
      placeholderClass: 'drag-placeholder',
      enableTouch: true,
      enableKeyboard: true,
      onReorder: (fromIndex, toIndex, itemId) => {
        this.controller.reorderTask(itemId, toIndex);
      },
      onDragStart: (itemId) => {
        console.log('Started dragging task:', itemId);
      },
      onDragEnd: (itemId, finalIndex) => {
        console.log('Finished dragging task:', itemId, 'to position:', finalIndex);
      }
    });
  }

  private renderTaskList(): void {
    if (!this.elements.taskList) return;

    const tasks = this.controller.getDisplayTasks();
    const uiState = this.controller.getUIState();

    // Show only unselected tasks in the available list
    const availableTasks = tasks.filter(task => !uiState.selectedTaskIds.includes(task.id));

    if (availableTasks.length === 0) {
      this.elements.taskList.innerHTML = `
        <div class="empty-available">
          <p>All available tasks have been selected or filtered out.</p>
        </div>
      `;
      return;
    }

    this.elements.taskList.innerHTML = availableTasks.map(task => {
      const canSelect = this.controller.canSelectTask(task.id);
      const priorityScore = this.controller.getTaskPriorityScore(task.id);

      return `
        <div class="task-item ${!canSelect ? 'disabled' : ''}" data-task-id="${task.id}">
          <div class="task-content">
            <div class="task-title">${task.title}</div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            <div class="task-meta">
              <span class="task-context ${task.context}">${task.context}</span>
              <span class="task-effort effort-${task.effort}">${task.effort} effort</span>
              <span class="task-importance importance-${task.importance}">${task.importance} priority</span>
              ${task.dueDate ? `<span class="task-due-date">Due: ${task.dueDate.toLocaleDateString()}</span>` : ''}
              <span class="task-duration">${task.estimatedDuration}min</span>
              ${this.config.showPriorityScores ? `<span class="priority-score">Score: ${priorityScore.toFixed(2)}</span>` : ''}
            </div>
            ${task.dependencies.length > 0 ? `<div class="task-dependencies">Depends on: ${task.dependencies.length} task(s)</div>` : ''}
          </div>
          <div class="task-actions">
            <button class="select-task-btn" ${!canSelect ? 'disabled' : ''}>
              ${canSelect ? 'Select' : 'Cannot Select'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers for task items
    this.elements.taskList.querySelectorAll('.task-item').forEach(item => {
      const taskId = item.getAttribute('data-task-id')!;
      const selectBtn = item.querySelector('.select-task-btn') as HTMLButtonElement;

      const handleSelect = () => {
        if (!selectBtn.disabled) {
          this.controller.selectTask(taskId);
        }
      };

      item.addEventListener('click', handleSelect);
      selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleSelect();
      });
    });
  }

  private renderSelectedTasks(): void {
    if (!this.elements.selectedTasksList) return;

    const uiState = this.controller.getUIState();
    const selectedTasks = uiState.tasks.filter(task => uiState.selectedTaskIds.includes(task.id));

    // Sort selected tasks by their order in selectedTaskIds
    const orderedTasks = uiState.selectedTaskIds
      .map(id => selectedTasks.find(task => task.id === id))
      .filter(task => task !== undefined) as Task[];

    if (orderedTasks.length === 0) {
      this.elements.selectedTasksList.innerHTML = `
        <div class="empty-selection">
          <p>No tasks selected yet. Select up to 6 tasks from the available list.</p>
        </div>
      `;
      return;
    }

    this.elements.selectedTasksList.innerHTML = orderedTasks.map((task, index) => `
      <div class="selected-task-item" data-task-id="${task.id}" tabindex="0">
        <div class="drag-handle" title="Drag to reorder">
          <span class="drag-icon">⋮⋮</span>
        </div>
        <div class="task-priority-number">${index + 1}</div>
        <div class="task-content">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">
            <span class="task-context ${task.context}">${task.context}</span>
            <span class="task-effort effort-${task.effort}">${task.effort}</span>
            <span class="task-duration">${task.estimatedDuration}min</span>
            ${index === 0 ? '<span class="frog-indicator">🐸 Frog Task</span>' : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="move-up-btn" ${index === 0 ? 'disabled' : ''} title="Move up (Ctrl+↑)">↑</button>
          <button class="move-down-btn" ${index === orderedTasks.length - 1 ? 'disabled' : ''} title="Move down (Ctrl+↓)">↓</button>
          <button class="remove-task-btn" title="Remove from selection">×</button>
        </div>
      </div>
    `).join('');

    // Add event listeners for action buttons
    this.elements.selectedTasksList.querySelectorAll('.selected-task-item').forEach((item, index) => {
      const taskId = item.getAttribute('data-task-id')!;

      // Move up button
      const moveUpBtn = item.querySelector('.move-up-btn');
      moveUpBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.controller.moveTaskUp(taskId);
      });

      // Move down button
      const moveDownBtn = item.querySelector('.move-down-btn');
      moveDownBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.controller.moveTaskDown(taskId);
      });

      // Remove button
      const removeBtn = item.querySelector('.remove-task-btn');
      removeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.controller.deselectTask(taskId);
      });

      // Make item focusable and add keyboard support
      item.addEventListener('keydown', (e) => {
        const keyEvent = e as KeyboardEvent;
        switch (keyEvent.key) {
          case 'ArrowUp':
            if (keyEvent.ctrlKey || keyEvent.metaKey) {
              keyEvent.preventDefault();
              this.controller.moveTaskUp(taskId);
            }
            break;
          case 'ArrowDown':
            if (keyEvent.ctrlKey || keyEvent.metaKey) {
              keyEvent.preventDefault();
              this.controller.moveTaskDown(taskId);
            }
            break;
          case 'Home':
            if (keyEvent.ctrlKey || keyEvent.metaKey) {
              keyEvent.preventDefault();
              this.controller.reorderTask(taskId, 0);
            }
            break;
          case 'End':
            if (keyEvent.ctrlKey || keyEvent.metaKey) {
              keyEvent.preventDefault();
              this.controller.reorderTask(taskId, orderedTasks.length - 1);
            }
            break;
          case 'Delete':
          case 'Backspace':
            keyEvent.preventDefault();
            this.controller.deselectTask(taskId);
            break;
        }
      });
    });

    // Refresh drag-drop after rendering
    this.dragDrop?.refresh();
  }

  private renderSuggestions(): void {
    if (!this.elements.suggestions) return;

    const uiState = this.controller.getUIState();

    if (!uiState.showSuggestions || uiState.suggestions.length === 0) {
      this.elements.suggestions.parentElement!.style.display = 'none';
      return;
    }

    this.elements.suggestions.parentElement!.style.display = 'block';
    this.elements.suggestions.innerHTML = uiState.suggestions.map(task => `
      <div class="suggestion-item" data-task-id="${task.id}">
        <div class="suggestion-content">
          <div class="suggestion-title">${task.title}</div>
          <div class="suggestion-meta">
            <span class="task-context ${task.context}">${task.context}</span>
            <span class="task-effort effort-${task.effort}">${task.effort}</span>
            <span class="priority-score">Score: ${this.controller.getTaskPriorityScore(task.id).toFixed(2)}</span>
          </div>
        </div>
        <button class="accept-suggestion-btn">Add</button>
      </div>
    `).join('');

    // Add click handlers for suggestions
    this.elements.suggestions.querySelectorAll('.accept-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskId = (e.target as HTMLElement).closest('.suggestion-item')!.getAttribute('data-task-id')!;
        this.controller.acceptSuggestion(taskId);
      });
    });
  }

  private renderSelectionCounter(): void {
    const selectedCountEl = this.elements.root?.querySelector('.selected-count');
    const maxCountEl = this.elements.root?.querySelector('.max-count');

    if (selectedCountEl) selectedCountEl.textContent = this.state.selectedCount.toString();
    if (maxCountEl) maxCountEl.textContent = this.state.maxTasks.toString();
  }

  private renderErrors(): void {
    if (!this.elements.errorDisplay) return;

    if (this.state.hasErrors && this.state.errorMessages.length > 0) {
      this.elements.errorDisplay.style.display = 'block';
      this.elements.errorDisplay.innerHTML = `
        <div class="error-messages">
          ${this.state.errorMessages.map(msg => `<div class="error-message">${msg}</div>`).join('')}
        </div>
      `;
    } else {
      this.elements.errorDisplay.style.display = 'none';
    }
  }

  private updateCompleteButton(): void {
    if (!this.elements.completeButton) return;

    const uiState = this.controller.getUIState();
    const canComplete = uiState.isValid && uiState.selectedTaskIds.length > 0;

    this.elements.completeButton.disabled = !canComplete;
    this.elements.completeButton.textContent = canComplete
      ? `Complete Selection (${uiState.selectedTaskIds.length}/6)`
      : 'Select tasks to continue';
  }

  private handleSelectionChange(uiState: TaskSelectionUIState): void {
    this.state.selectedCount = uiState.selectedTaskIds.length;
    this.state.hasErrors = uiState.validationErrors.length > 0;
    this.state.errorMessages = uiState.validationErrors;

    this.render();
  }

  private handleValidationError(errors: string[]): void {
    this.state.hasErrors = true;
    this.state.errorMessages = errors;
    this.renderErrors();
  }

  private handleSelectionComplete(taskIds: string[]): void {
    // Override in config.events.onSelectionComplete for custom handling
    console.log('Selection completed:', taskIds);
  }

  private handleSuggestionAccepted(taskId: string): void {
    // Override in config.events.onSuggestionAccepted for custom handling
    console.log('Suggestion accepted:', taskId);
  }

  private renderWorkloadSummary(): void {
    const workloadSummary = this.elements.root?.querySelector('.workload-summary');
    if (!workloadSummary) return;

    const uiState = this.controller.getUIState();
    if (uiState.selectedTaskIds.length === 0) {
      workloadSummary.innerHTML = '';
      return;
    }

    const analysis = this.controller.getWorkloadAnalysis();
    const hasDependencyIssues = this.controller.hasDependencyIssues();
    const missingDeps = this.controller.getMissingDependencies();

    workloadSummary.innerHTML = `
      <div class="workload-summary-content">
        <div class="workload-stats">
          <span class="stat">
            <strong>Total:</strong> ${analysis.totalMinutes}min
          </span>
          <span class="stat">
            <strong>Deep Work:</strong> ${analysis.deepWorkMinutes}min
          </span>
          <span class="stat">
            <strong>Shallow:</strong> ${analysis.shallowWorkMinutes}min
          </span>
          <span class="stat ${analysis.totalMinutes > 480 ? 'warning' : ''}">
            <strong>Capacity:</strong> ${Math.round((analysis.totalMinutes / 480) * 100)}%
          </span>
        </div>
        
        ${analysis.capacityWarnings.length > 0 ? `
          <div class="capacity-warnings">
            ${analysis.capacityWarnings.map(warning => `
              <div class="warning-item">⚠️ ${warning}</div>
            `).join('')}
          </div>
        ` : ''}
        
        ${hasDependencyIssues ? `
          <div class="dependency-issues">
            <div class="warning-item">🔗 Dependency issues detected</div>
            ${missingDeps.length > 0 ? `
              <div class="missing-dependencies">
                Missing prerequisites: ${missingDeps.map(dep => dep.title).join(', ')}
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  private toggleWorkloadAnalysis(): void {
    const analysis = this.controller.getWorkloadAnalysis();
    const dependencies = this.controller.getUIState().selectedTaskIds.map(id =>
      this.controller.getTaskDependencies(id)
    );

    // Create detailed analysis modal or expand summary
    const detailsHtml = `
      <div class="workload-analysis-details">
        <h4>Detailed Workload Analysis</h4>
        
        <div class="capacity-breakdown">
          <h5>Time Allocation</h5>
          <div class="time-bars">
            <div class="time-bar">
              <label>Deep Work (${analysis.deepWorkMinutes}min)</label>
              <div class="bar">
                <div class="fill deep-work" style="width: ${(analysis.deepWorkMinutes / 480) * 100}%"></div>
              </div>
            </div>
            <div class="time-bar">
              <label>Shallow Work (${analysis.shallowWorkMinutes}min)</label>
              <div class="bar">
                <div class="fill shallow-work" style="width: ${(analysis.shallowWorkMinutes / 480) * 100}%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="recommendations">
          <h5>Recommendations</h5>
          <ul>
            <li>Recommended task count: ${analysis.recommendedTaskCount}</li>
            <li>Current selection: ${this.controller.getUIState().selectedTaskIds.length} tasks</li>
            ${analysis.deepWorkMinutes > 240 ? '<li>Consider reducing deep work tasks for better focus</li>' : ''}
            ${analysis.totalMinutes > 480 ? '<li>Total workload exceeds 8-hour capacity</li>' : ''}
          </ul>
        </div>

        <div class="dependency-analysis">
          <h5>Dependency Analysis</h5>
          ${dependencies.some(dep => !dep.canBeCompleted) ?
        '<p class="warning">⚠️ Some tasks have unmet dependencies</p>' :
        '<p class="success">✅ All dependencies are satisfied</p>'
      }
        </div>
      </div>
    `;

    // Toggle detailed view (you could implement this as a modal or expandable section)
    console.log('Workload Analysis:', detailsHtml);
  }
}