/**
 * Assignee Selector Component - Interface for selecting assignees during delegation
 */
import { Assignee, DelegationService } from '../services/delegation-service.js';
import { InboxItem } from '../types/ritual.js';
export interface AssigneeSelectorConfig {
    showAvailability: boolean;
    showWorkload: boolean;
    showSkills: boolean;
    enableSearch: boolean;
    enableSuggestions: boolean;
    maxSuggestions: number;
}
export interface AssigneeSelectorState {
    assignees: Assignee[];
    suggestedAssignees: Assignee[];
    selectedAssignee: Assignee | null;
    searchQuery: string;
    filteredAssignees: Assignee[];
    isLoading: boolean;
    error: string | null;
}
export interface AssigneeSelectionCriteria {
    availability?: 'available' | 'busy' | 'away';
    maxWorkload?: number;
    requiredSkills?: string[];
}
export declare class AssigneeSelector {
    private delegationService;
    private config;
    private state;
    constructor(delegationService: DelegationService, config?: Partial<AssigneeSelectorConfig>);
    /**
     * Initialize selector for a specific item
     */
    initializeForItem(item: InboxItem): Promise<AssigneeSelectorState>;
    /**
     * Get current selector state
     */
    getState(): AssigneeSelectorState;
    /**
     * Update search query and filter assignees
     */
    updateSearchQuery(query: string): AssigneeSelectorState;
    /**
     * Select an assignee
     */
    selectAssignee(assigneeId: string): AssigneeSelectorState;
    /**
     * Clear selection
     */
    clearSelection(): AssigneeSelectorState;
    /**
     * Filter assignees by criteria
     */
    filterByCriteria(criteria: AssigneeSelectionCriteria): AssigneeSelectorState;
    /**
     * Get assignee display information
     */
    getAssigneeDisplayInfo(assignee: Assignee): {
        name: string;
        subtitle: string;
        statusColor: 'green' | 'yellow' | 'red' | 'gray';
        workloadPercentage?: number;
        skills?: string[];
    };
    /**
     * Validate current selection
     */
    validateSelection(): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Get selected assignee ID
     */
    getSelectedAssigneeId(): string | null;
    /**
     * Reset selector state
     */
    reset(): AssigneeSelectorState;
    private loadAssignees;
    private updateFilteredAssignees;
}
