/**
 * Task Selection Controller - Manages Ivy-6 task selection interface
 */
import { TaskSelectionService } from '../services/task-selection-service.js';
export class TaskSelectionController {
    selectionService;
    events;
    config;
    uiState;
    constructor(config = {}) {
        this.config = config;
        this.selectionService = new TaskSelectionService(config);
        this.events = {
            onSelectionChange: () => { },
            onValidationError: () => { },
            onSelectionComplete: () => { },
            onSuggestionAccepted: () => { },
            ...config.events
        };
        this.uiState = {
            tasks: [],
            selectedTaskIds: [],
            remainingSlots: 6,
            validationErrors: [],
            suggestions: [],
            isValid: false,
            showSuggestions: config.enableSuggestions !== false,
            filterText: '',
            sortBy: 'priority',
            sortDirection: 'desc'
        };
    }
    /**
     * Initialize the controller with available tasks
     */
    initialize(tasks) {
        this.uiState.tasks = tasks;
        this.updateState();
    }
    /**
     * Toggle task selection
     */
    toggleTaskSelection(taskId) {
        const isSelected = this.uiState.selectedTaskIds.includes(taskId);
        if (isSelected) {
            this.deselectTask(taskId);
        }
        else {
            this.selectTask(taskId);
        }
    }
    /**
     * Select a task
     */
    selectTask(taskId) {
        if (this.uiState.selectedTaskIds.includes(taskId)) {
            return; // Already selected
        }
        if (this.uiState.selectedTaskIds.length >= 6) {
            this.events.onValidationError(['Cannot select more than 6 tasks']);
            return;
        }
        this.uiState.selectedTaskIds.push(taskId);
        this.updateState();
    }
    /**
     * Deselect a task
     */
    deselectTask(taskId) {
        const index = this.uiState.selectedTaskIds.indexOf(taskId);
        if (index > -1) {
            this.uiState.selectedTaskIds.splice(index, 1);
            this.updateState();
        }
    }
    /**
     * Clear all selections
     */
    clearSelection() {
        this.uiState.selectedTaskIds = [];
        this.updateState();
    }
    /**
     * Accept a suggested task
     */
    acceptSuggestion(taskId) {
        this.selectTask(taskId);
        this.events.onSuggestionAccepted(taskId);
    }
    /**
     * Set filter text for task list
     */
    setFilter(filterText) {
        this.uiState.filterText = filterText;
        this.updateState();
    }
    /**
     * Set sorting criteria
     */
    setSorting(sortBy, direction) {
        this.uiState.sortBy = sortBy;
        if (direction) {
            this.uiState.sortDirection = direction;
        }
        else {
            // Toggle direction if same sort field
            this.uiState.sortDirection = this.uiState.sortDirection === 'asc' ? 'desc' : 'asc';
        }
        this.updateState();
    }
    /**
     * Toggle suggestions visibility
     */
    toggleSuggestions() {
        this.uiState.showSuggestions = !this.uiState.showSuggestions;
        this.updateState();
    }
    /**
     * Complete the selection process
     */
    completeSelection() {
        if (this.uiState.isValid) {
            this.events.onSelectionComplete(this.uiState.selectedTaskIds);
        }
        else {
            this.events.onValidationError(this.uiState.validationErrors);
        }
    }
    /**
     * Get current UI state
     */
    getUIState() {
        return { ...this.uiState };
    }
    /**
     * Get filtered and sorted tasks for display
     */
    getDisplayTasks() {
        let tasks = [...this.uiState.tasks];
        // Apply filter
        if (this.uiState.filterText) {
            const filterLower = this.uiState.filterText.toLowerCase();
            tasks = tasks.filter(task => task.title.toLowerCase().includes(filterLower) ||
                task.description?.toLowerCase().includes(filterLower) ||
                task.tags.some(tag => tag.toLowerCase().includes(filterLower)));
        }
        // Apply sorting
        tasks.sort((a, b) => {
            let comparison = 0;
            switch (this.uiState.sortBy) {
                case 'priority':
                    const selectionState = this.selectionService.getSelectionState(this.uiState.tasks, this.uiState.selectedTaskIds);
                    const aScore = selectionState.priorityScores.find(ps => ps.taskId === a.id)?.score || 0;
                    const bScore = selectionState.priorityScores.find(ps => ps.taskId === b.id)?.score || 0;
                    comparison = bScore - aScore; // Higher score first
                    break;
                case 'dueDate':
                    const aDate = a.dueDate?.getTime() || Infinity;
                    const bDate = b.dueDate?.getTime() || Infinity;
                    comparison = aDate - bDate;
                    break;
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'effort':
                    const effortOrder = { low: 1, medium: 2, high: 3 };
                    comparison = effortOrder[a.effort] - effortOrder[b.effort];
                    break;
            }
            return this.uiState.sortDirection === 'asc' ? comparison : -comparison;
        });
        return tasks;
    }
    /**
     * Get task priority score for display
     */
    getTaskPriorityScore(taskId) {
        const selectionState = this.selectionService.getSelectionState(this.uiState.tasks, this.uiState.selectedTaskIds);
        return selectionState.priorityScores.find(ps => ps.taskId === taskId)?.score || 0;
    }
    /**
     * Reorder selected tasks by moving a task to a new position
     */
    reorderTask(taskId, newIndex) {
        const currentIndex = this.uiState.selectedTaskIds.indexOf(taskId);
        if (currentIndex === -1 || newIndex < 0 || newIndex >= this.uiState.selectedTaskIds.length) {
            return;
        }
        // Remove task from current position
        const [movedTask] = this.uiState.selectedTaskIds.splice(currentIndex, 1);
        // Insert at new position
        this.uiState.selectedTaskIds.splice(newIndex, 0, movedTask);
        this.updateState();
    }
    /**
     * Move task up in priority order
     */
    moveTaskUp(taskId) {
        const currentIndex = this.uiState.selectedTaskIds.indexOf(taskId);
        if (currentIndex > 0) {
            this.reorderTask(taskId, currentIndex - 1);
        }
    }
    /**
     * Move task down in priority order
     */
    moveTaskDown(taskId) {
        const currentIndex = this.uiState.selectedTaskIds.indexOf(taskId);
        if (currentIndex < this.uiState.selectedTaskIds.length - 1) {
            this.reorderTask(taskId, currentIndex + 1);
        }
    }
    /**
     * Set the complete order of selected tasks
     */
    setTaskOrder(orderedTaskIds) {
        // Validate that all provided IDs are currently selected
        const validIds = orderedTaskIds.filter(id => this.uiState.selectedTaskIds.includes(id));
        if (validIds.length === this.uiState.selectedTaskIds.length) {
            this.uiState.selectedTaskIds = validIds;
            this.updateState();
        }
    }
    /**
     * Get the current task order with position information
     */
    getTaskOrder() {
        return this.uiState.selectedTaskIds.map((taskId, index) => {
            const task = this.uiState.tasks.find(t => t.id === taskId);
            return {
                taskId,
                position: index + 1,
                title: task?.title || 'Unknown Task'
            };
        });
    }
    /**
     * Get dependency information for a task
     */
    getTaskDependencies(taskId) {
        return this.selectionService.detectDependencies(this.uiState.tasks, taskId);
    }
    /**
     * Get workload analysis for current selection
     */
    getWorkloadAnalysis() {
        const selectedTasks = this.uiState.tasks.filter(t => this.uiState.selectedTaskIds.includes(t.id));
        return this.selectionService.estimateRealisticCapacity(selectedTasks);
    }
    /**
     * Get optimal task ordering suggestion
     */
    getOptimalOrdering() {
        const selectedTasks = this.uiState.tasks.filter(t => this.uiState.selectedTaskIds.includes(t.id));
        const optimalOrder = this.selectionService.getOptimalTaskOrder(selectedTasks);
        return optimalOrder.map(task => task.id);
    }
    /**
     * Apply optimal ordering to current selection
     */
    applyOptimalOrdering() {
        const optimalOrder = this.getOptimalOrdering();
        this.setTaskOrder(optimalOrder);
    }
    /**
     * Check if current selection has dependency issues
     */
    hasDependencyIssues() {
        const selectedTasks = this.uiState.tasks.filter(t => this.uiState.selectedTaskIds.includes(t.id));
        for (const task of selectedTasks) {
            const unmetDependencies = task.dependencies.filter(depId => !this.uiState.selectedTaskIds.includes(depId));
            if (unmetDependencies.length > 0) {
                return true;
            }
        }
        return false;
    }
    /**
     * Get tasks that should be added to resolve dependencies
     */
    getMissingDependencies() {
        const selectedTasks = this.uiState.tasks.filter(t => this.uiState.selectedTaskIds.includes(t.id));
        const missingDepIds = new Set();
        for (const task of selectedTasks) {
            task.dependencies.forEach(depId => {
                if (!this.uiState.selectedTaskIds.includes(depId)) {
                    missingDepIds.add(depId);
                }
            });
        }
        return Array.from(missingDepIds)
            .map(depId => this.uiState.tasks.find(t => t.id === depId))
            .filter(task => task !== undefined);
    }
    /**
     * Check if a task can be selected
     */
    canSelectTask(taskId) {
        if (this.uiState.selectedTaskIds.includes(taskId)) {
            return false; // Already selected
        }
        if (this.uiState.selectedTaskIds.length >= 6) {
            return false; // Max tasks reached
        }
        // Check if selecting this task would create validation errors
        const testSelection = [...this.uiState.selectedTaskIds, taskId];
        const errors = this.selectionService.validateSelection(this.uiState.tasks, testSelection);
        return errors.length === 0;
    }
    updateState() {
        const selectionState = this.selectionService.getSelectionState(this.uiState.tasks, this.uiState.selectedTaskIds);
        this.uiState.remainingSlots = selectionState.remainingSlots;
        this.uiState.validationErrors = selectionState.validationErrors;
        this.uiState.suggestions = selectionState.suggestions;
        this.uiState.isValid = selectionState.validationErrors.length === 0 &&
            this.uiState.selectedTaskIds.length > 0 &&
            this.uiState.selectedTaskIds.length <= 6;
        this.events.onSelectionChange(this.uiState);
        if (selectionState.validationErrors.length > 0) {
            this.events.onValidationError(selectionState.validationErrors);
        }
    }
}
