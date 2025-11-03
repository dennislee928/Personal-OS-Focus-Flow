/**
 * Task Selection Controller - Manages Ivy-6 task selection interface
 */
import { Task } from '../types/ritual.js';
import { TaskSelectionServiceConfig } from '../services/task-selection-service.js';
export interface TaskSelectionUIState {
    tasks: Task[];
    selectedTaskIds: string[];
    remainingSlots: number;
    validationErrors: string[];
    suggestions: Task[];
    isValid: boolean;
    showSuggestions: boolean;
    filterText: string;
    sortBy: 'priority' | 'dueDate' | 'title' | 'effort';
    sortDirection: 'asc' | 'desc';
}
export interface TaskSelectionControllerEvents {
    onSelectionChange: (state: TaskSelectionUIState) => void;
    onValidationError: (errors: string[]) => void;
    onSelectionComplete: (selectedTaskIds: string[]) => void;
    onSuggestionAccepted: (taskId: string) => void;
}
export interface TaskSelectionControllerConfig extends TaskSelectionServiceConfig {
    events?: Partial<TaskSelectionControllerEvents>;
    enableSuggestions?: boolean;
    enableFiltering?: boolean;
}
export declare class TaskSelectionController {
    private selectionService;
    private events;
    private config;
    private uiState;
    constructor(config?: TaskSelectionControllerConfig);
    /**
     * Initialize the controller with available tasks
     */
    initialize(tasks: Task[]): void;
    /**
     * Toggle task selection
     */
    toggleTaskSelection(taskId: string): void;
    /**
     * Select a task
     */
    selectTask(taskId: string): void;
    /**
     * Deselect a task
     */
    deselectTask(taskId: string): void;
    /**
     * Clear all selections
     */
    clearSelection(): void;
    /**
     * Accept a suggested task
     */
    acceptSuggestion(taskId: string): void;
    /**
     * Set filter text for task list
     */
    setFilter(filterText: string): void;
    /**
     * Set sorting criteria
     */
    setSorting(sortBy: TaskSelectionUIState['sortBy'], direction?: 'asc' | 'desc'): void;
    /**
     * Toggle suggestions visibility
     */
    toggleSuggestions(): void;
    /**
     * Complete the selection process
     */
    completeSelection(): void;
    /**
     * Get current UI state
     */
    getUIState(): TaskSelectionUIState;
    /**
     * Get filtered and sorted tasks for display
     */
    getDisplayTasks(): Task[];
    /**
     * Get task priority score for display
     */
    getTaskPriorityScore(taskId: string): number;
    /**
     * Reorder selected tasks by moving a task to a new position
     */
    reorderTask(taskId: string, newIndex: number): void;
    /**
     * Move task up in priority order
     */
    moveTaskUp(taskId: string): void;
    /**
     * Move task down in priority order
     */
    moveTaskDown(taskId: string): void;
    /**
     * Set the complete order of selected tasks
     */
    setTaskOrder(orderedTaskIds: string[]): void;
    /**
     * Get the current task order with position information
     */
    getTaskOrder(): Array<{
        taskId: string;
        position: number;
        title: string;
    }>;
    /**
     * Get dependency information for a task
     */
    getTaskDependencies(taskId: string): {
        prerequisites: Task[];
        dependents: Task[];
        canBeCompleted: boolean;
    };
    /**
     * Get workload analysis for current selection
     */
    getWorkloadAnalysis(): {
        totalMinutes: number;
        deepWorkMinutes: number;
        shallowWorkMinutes: number;
        recommendedTaskCount: number;
        capacityWarnings: string[];
    };
    /**
     * Get optimal task ordering suggestion
     */
    getOptimalOrdering(): string[];
    /**
     * Apply optimal ordering to current selection
     */
    applyOptimalOrdering(): void;
    /**
     * Check if current selection has dependency issues
     */
    hasDependencyIssues(): boolean;
    /**
     * Get tasks that should be added to resolve dependencies
     */
    getMissingDependencies(): Task[];
    /**
     * Check if a task can be selected
     */
    canSelectTask(taskId: string): boolean;
    private updateState;
}
