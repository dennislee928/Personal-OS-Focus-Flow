/**
 * Task Selection Service - Implements Ivy-6 method with priority scoring
 */
import { Task, TaskPriorityScore, TaskSelectionState, TaskSelectionConstraints } from '../types/ritual.js';
export interface TaskSelectionServiceConfig {
    constraints?: Partial<TaskSelectionConstraints>;
    priorityWeights?: {
        dueDateUrgency: number;
        importance: number;
        effort: number;
        contextBalance: number;
        dependencies: number;
    };
}
export declare class TaskSelectionService {
    private constraints;
    private priorityWeights;
    constructor(config?: TaskSelectionServiceConfig);
    /**
     * Calculate priority scores for all available tasks
     */
    calculatePriorityScores(tasks: Task[], selectedTaskIds?: string[]): TaskPriorityScore[];
    /**
     * Get smart task suggestions based on current selection
     */
    getSuggestions(tasks: Task[], selectedTaskIds: string[]): Task[];
    /**
     * Detect task dependencies and suggest prerequisite tasks
     */
    detectDependencies(tasks: Task[], targetTaskId: string): {
        prerequisites: Task[];
        dependents: Task[];
        canBeCompleted: boolean;
    };
    /**
     * Calculate total workload for a set of tasks
     */
    calculateTotalWorkload(tasks: Task[]): number;
    /**
     * Estimate realistic daily capacity based on task complexity
     */
    estimateRealisticCapacity(tasks: Task[]): {
        totalMinutes: number;
        deepWorkMinutes: number;
        shallowWorkMinutes: number;
        recommendedTaskCount: number;
        capacityWarnings: string[];
    };
    /**
     * Get optimal task ordering based on energy levels and dependencies
     */
    getOptimalTaskOrder(tasks: Task[]): Task[];
    private applyEnergyBasedOrdering;
    /**
     * Validate task selection against constraints
     */
    validateSelection(tasks: Task[], selectedTaskIds: string[]): string[];
    /**
     * Get current selection state
     */
    getSelectionState(tasks: Task[], selectedTaskIds: string[]): TaskSelectionState;
    private calculateDueDateUrgency;
    private calculateImportanceScore;
    private calculateEffortScore;
    private calculateContextBalance;
    private calculateDependencyScore;
    private validateDependencies;
}
