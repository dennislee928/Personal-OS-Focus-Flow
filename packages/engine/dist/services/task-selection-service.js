/**
 * Task Selection Service - Implements Ivy-6 method with priority scoring
 */
export class TaskSelectionService {
    constraints;
    priorityWeights;
    constructor(config = {}) {
        this.constraints = {
            maxTasks: 6,
            minTasks: 1,
            maxDeepWorkTasks: 4,
            maxShallowTasks: 4,
            maxDailyEffort: 480, // 8 hours in minutes
            ...config.constraints
        };
        this.priorityWeights = {
            dueDateUrgency: 0.3,
            importance: 0.25,
            effort: 0.2,
            contextBalance: 0.15,
            dependencies: 0.1,
            ...config.priorityWeights
        };
    }
    /**
     * Calculate priority scores for all available tasks
     */
    calculatePriorityScores(tasks, selectedTaskIds = []) {
        const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
        return tasks.map(task => {
            const factors = {
                dueDateUrgency: this.calculateDueDateUrgency(task),
                importance: this.calculateImportanceScore(task),
                effort: this.calculateEffortScore(task),
                contextBalance: this.calculateContextBalance(task, selectedTasks),
                dependencies: this.calculateDependencyScore(task, tasks, selectedTaskIds)
            };
            const score = Object.entries(factors).reduce((total, [key, value]) => {
                const weight = this.priorityWeights[key];
                return total + (value * weight);
            }, 0);
            return {
                taskId: task.id,
                score,
                factors
            };
        });
    }
    /**
     * Get smart task suggestions based on current selection
     */
    getSuggestions(tasks, selectedTaskIds) {
        const priorityScores = this.calculatePriorityScores(tasks, selectedTaskIds);
        const availableTasks = tasks.filter(t => !selectedTaskIds.includes(t.id));
        const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
        // Apply additional filtering for better suggestions
        const filteredTasks = availableTasks.filter(task => {
            // Check workload capacity
            const currentWorkload = this.calculateTotalWorkload(selectedTasks);
            if (currentWorkload + task.estimatedDuration > this.constraints.maxDailyEffort) {
                return false;
            }
            // Check dependency readiness
            const hasUnmetDependencies = task.dependencies.some(depId => !selectedTaskIds.includes(depId) && !tasks.some(t => t.id === depId));
            if (hasUnmetDependencies) {
                return false;
            }
            return true;
        });
        // Sort by priority score and return top suggestions
        const sortedTasks = filteredTasks
            .map(task => ({
            task,
            score: priorityScores.find(ps => ps.taskId === task.id)?.score || 0
        }))
            .sort((a, b) => b.score - a.score)
            .slice(0, Math.min(5, this.constraints.maxTasks - selectedTaskIds.length))
            .map(item => item.task);
        return sortedTasks;
    }
    /**
     * Detect task dependencies and suggest prerequisite tasks
     */
    detectDependencies(tasks, targetTaskId) {
        const targetTask = tasks.find(t => t.id === targetTaskId);
        if (!targetTask) {
            return { prerequisites: [], dependents: [], canBeCompleted: false };
        }
        // Find prerequisite tasks
        const prerequisites = targetTask.dependencies
            .map(depId => tasks.find(t => t.id === depId))
            .filter(task => task !== undefined);
        // Find dependent tasks (tasks that depend on this one)
        const dependents = tasks.filter(task => task.dependencies.includes(targetTaskId));
        // Check if all prerequisites are available
        const canBeCompleted = targetTask.dependencies.every(depId => tasks.some(t => t.id === depId));
        return { prerequisites, dependents, canBeCompleted };
    }
    /**
     * Calculate total workload for a set of tasks
     */
    calculateTotalWorkload(tasks) {
        return tasks.reduce((total, task) => total + task.estimatedDuration, 0);
    }
    /**
     * Estimate realistic daily capacity based on task complexity
     */
    estimateRealisticCapacity(tasks) {
        const deepWorkTasks = tasks.filter(t => t.context === '@deep');
        const shallowTasks = tasks.filter(t => t.context === '@shallow');
        const deepWorkMinutes = this.calculateTotalWorkload(deepWorkTasks);
        const shallowWorkMinutes = this.calculateTotalWorkload(shallowTasks);
        const totalMinutes = deepWorkMinutes + shallowWorkMinutes;
        const warnings = [];
        // Deep work capacity check (typically 3-4 hours max per day)
        const maxDeepWork = 240; // 4 hours
        if (deepWorkMinutes > maxDeepWork) {
            warnings.push(`Deep work time (${deepWorkMinutes}min) exceeds recommended daily limit (${maxDeepWork}min)`);
        }
        // Total capacity check
        if (totalMinutes > this.constraints.maxDailyEffort) {
            warnings.push(`Total workload (${totalMinutes}min) exceeds daily capacity (${this.constraints.maxDailyEffort}min)`);
        }
        // Task count recommendation based on complexity
        const avgTaskDuration = totalMinutes / tasks.length;
        const complexityFactor = deepWorkTasks.length / tasks.length;
        let recommendedTaskCount = 6; // Default Ivy-6
        if (avgTaskDuration > 60 && complexityFactor > 0.5) {
            recommendedTaskCount = 4; // Fewer tasks for complex work
            warnings.push('Consider selecting fewer tasks due to high complexity and duration');
        }
        else if (avgTaskDuration < 30 && complexityFactor < 0.3) {
            recommendedTaskCount = 8; // More tasks for simple work
        }
        return {
            totalMinutes,
            deepWorkMinutes,
            shallowWorkMinutes,
            recommendedTaskCount: Math.min(recommendedTaskCount, this.constraints.maxTasks),
            capacityWarnings: warnings
        };
    }
    /**
     * Get optimal task ordering based on energy levels and dependencies
     */
    getOptimalTaskOrder(tasks) {
        // Create dependency graph
        const dependencyMap = new Map();
        tasks.forEach(task => {
            dependencyMap.set(task.id, task.dependencies);
        });
        // Topological sort for dependency order
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();
        const visit = (taskId) => {
            if (visiting.has(taskId)) {
                return false; // Circular dependency
            }
            if (visited.has(taskId)) {
                return true;
            }
            visiting.add(taskId);
            const dependencies = dependencyMap.get(taskId) || [];
            for (const depId of dependencies) {
                if (!visit(depId)) {
                    return false;
                }
            }
            visiting.delete(taskId);
            visited.add(taskId);
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                sorted.unshift(task); // Add to beginning for correct order
            }
            return true;
        };
        // Visit all tasks
        for (const task of tasks) {
            if (!visited.has(task.id)) {
                visit(task.id);
            }
        }
        // Apply energy-based ordering within dependency constraints
        return this.applyEnergyBasedOrdering(sorted);
    }
    applyEnergyBasedOrdering(tasks) {
        // Group tasks by dependency level
        const levels = [];
        const processed = new Set();
        for (const task of tasks) {
            if (processed.has(task.id))
                continue;
            // Find tasks at the same dependency level
            const level = [];
            const queue = [task];
            while (queue.length > 0) {
                const current = queue.shift();
                if (processed.has(current.id))
                    continue;
                // Check if all dependencies are already processed
                const dependenciesMet = current.dependencies.every(depId => processed.has(depId) || !tasks.some(t => t.id === depId));
                if (dependenciesMet) {
                    level.push(current);
                    processed.add(current.id);
                }
            }
            if (level.length > 0) {
                // Sort within level: deep work first (when energy is high), then by importance
                level.sort((a, b) => {
                    if (a.context !== b.context) {
                        return a.context === '@deep' ? -1 : 1;
                    }
                    return this.calculateImportanceScore(b) - this.calculateImportanceScore(a);
                });
                levels.push(level);
            }
        }
        return levels.flat();
    }
    /**
     * Validate task selection against constraints
     */
    validateSelection(tasks, selectedTaskIds) {
        const errors = [];
        const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
        // Check task count constraints
        if (selectedTaskIds.length > this.constraints.maxTasks) {
            errors.push(`Cannot select more than ${this.constraints.maxTasks} tasks. Currently selected: ${selectedTaskIds.length}`);
        }
        if (selectedTaskIds.length < this.constraints.minTasks && selectedTaskIds.length > 0) {
            errors.push(`Must select at least ${this.constraints.minTasks} task`);
        }
        // Check context balance
        const deepWorkTasks = selectedTasks.filter(t => t.context === '@deep').length;
        const shallowTasks = selectedTasks.filter(t => t.context === '@shallow').length;
        if (deepWorkTasks > this.constraints.maxDeepWorkTasks) {
            errors.push(`Too many deep work tasks. Maximum: ${this.constraints.maxDeepWorkTasks}, selected: ${deepWorkTasks}`);
        }
        if (shallowTasks > this.constraints.maxShallowTasks) {
            errors.push(`Too many shallow tasks. Maximum: ${this.constraints.maxShallowTasks}, selected: ${shallowTasks}`);
        }
        // Check total effort
        const totalEffort = selectedTasks.reduce((sum, task) => sum + task.estimatedDuration, 0);
        if (totalEffort > this.constraints.maxDailyEffort) {
            errors.push(`Total estimated effort exceeds daily capacity. Maximum: ${this.constraints.maxDailyEffort} minutes, selected: ${totalEffort} minutes`);
        }
        // Check dependencies
        const dependencyErrors = this.validateDependencies(tasks, selectedTaskIds);
        errors.push(...dependencyErrors);
        return errors;
    }
    /**
     * Get current selection state
     */
    getSelectionState(tasks, selectedTaskIds) {
        const priorityScores = this.calculatePriorityScores(tasks, selectedTaskIds);
        const validationErrors = this.validateSelection(tasks, selectedTaskIds);
        const suggestions = this.getSuggestions(tasks, selectedTaskIds);
        return {
            availableTasks: tasks,
            selectedTaskIds,
            priorityScores,
            remainingSlots: Math.max(0, this.constraints.maxTasks - selectedTaskIds.length),
            validationErrors,
            suggestions
        };
    }
    calculateDueDateUrgency(task) {
        if (!task.dueDate)
            return 0.3; // Default medium urgency for tasks without due dates
        const now = new Date();
        const dueDate = new Date(task.dueDate);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 0)
            return 1.0; // Overdue
        if (daysUntilDue <= 1)
            return 0.9; // Due today/tomorrow
        if (daysUntilDue <= 3)
            return 0.7; // Due this week
        if (daysUntilDue <= 7)
            return 0.5; // Due next week
        return 0.3; // Due later
    }
    calculateImportanceScore(task) {
        switch (task.importance) {
            case 'high': return 1.0;
            case 'medium': return 0.6;
            case 'low': return 0.3;
            default: return 0.5;
        }
    }
    calculateEffortScore(task) {
        // Prefer medium effort tasks - not too easy, not too overwhelming
        switch (task.effort) {
            case 'low': return 0.6; // Quick wins are good
            case 'medium': return 1.0; // Optimal effort level
            case 'high': return 0.4; // Avoid too many high-effort tasks
            default: return 0.5;
        }
    }
    calculateContextBalance(task, selectedTasks) {
        const deepWorkCount = selectedTasks.filter(t => t.context === '@deep').length;
        const shallowCount = selectedTasks.filter(t => t.context === '@shallow').length;
        if (task.context === '@deep') {
            // Prefer deep work if we have too many shallow tasks
            if (shallowCount > deepWorkCount + 1)
                return 1.0;
            if (deepWorkCount >= this.constraints.maxDeepWorkTasks)
                return 0.0;
            return 0.7;
        }
        else {
            // Prefer shallow work if we have too many deep tasks
            if (deepWorkCount > shallowCount + 1)
                return 1.0;
            if (shallowCount >= this.constraints.maxShallowTasks)
                return 0.0;
            return 0.7;
        }
    }
    calculateDependencyScore(task, allTasks, selectedTaskIds) {
        // Check if task's dependencies are already selected
        const unmetDependencies = task.dependencies.filter(depId => !selectedTaskIds.includes(depId));
        if (unmetDependencies.length === 0) {
            return 1.0; // All dependencies met
        }
        // Check if dependencies are available to be selected
        const availableDependencies = unmetDependencies.filter(depId => allTasks.some(t => t.id === depId));
        if (availableDependencies.length < unmetDependencies.length) {
            return 0.0; // Some dependencies are missing entirely
        }
        // Reduce score based on number of unmet dependencies
        return Math.max(0.2, 1.0 - (unmetDependencies.length * 0.3));
    }
    validateDependencies(tasks, selectedTaskIds) {
        const errors = [];
        const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
        for (const task of selectedTasks) {
            const unmetDependencies = task.dependencies.filter(depId => !selectedTaskIds.includes(depId));
            if (unmetDependencies.length > 0) {
                const dependencyTitles = unmetDependencies
                    .map(depId => tasks.find(t => t.id === depId)?.title || depId)
                    .join(', ');
                errors.push(`Task "${task.title}" requires these tasks to be selected first: ${dependencyTitles}`);
            }
        }
        return errors;
    }
}
