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

export class AssigneeSelector {
  private delegationService: DelegationService;
  private config: AssigneeSelectorConfig;
  private state: AssigneeSelectorState = {
    assignees: [],
    suggestedAssignees: [],
    selectedAssignee: null,
    searchQuery: '',
    filteredAssignees: [],
    isLoading: false,
    error: null
  };

  constructor(delegationService: DelegationService, config: Partial<AssigneeSelectorConfig> = {}) {
    this.delegationService = delegationService;
    this.config = {
      showAvailability: true,
      showWorkload: true,
      showSkills: false,
      enableSearch: true,
      enableSuggestions: true,
      maxSuggestions: 5,
      ...config
    };

    this.loadAssignees();
  }

  /**
   * Initialize selector for a specific item
   */
  async initializeForItem(item: InboxItem): Promise<AssigneeSelectorState> {
    this.state.isLoading = true;
    this.state.error = null;

    try {
      // Load all assignees
      this.loadAssignees();

      // Get suggestions for this item
      if (this.config.enableSuggestions) {
        this.state.suggestedAssignees = this.delegationService
          .suggestAssignees(item)
          .slice(0, this.config.maxSuggestions);
      }

      // Initialize filtered list
      this.updateFilteredAssignees();

      this.state.isLoading = false;
    } catch (error) {
      this.state.error = (error as Error).message;
      this.state.isLoading = false;
    }

    return this.getState();
  }

  /**
   * Get current selector state
   */
  getState(): AssigneeSelectorState {
    return { ...this.state };
  }

  /**
   * Update search query and filter assignees
   */
  updateSearchQuery(query: string): AssigneeSelectorState {
    this.state.searchQuery = query;
    this.updateFilteredAssignees();
    return this.getState();
  }

  /**
   * Select an assignee
   */
  selectAssignee(assigneeId: string): AssigneeSelectorState {
    const assignee = this.state.assignees.find(a => a.id === assigneeId);
    this.state.selectedAssignee = assignee || null;
    return this.getState();
  }

  /**
   * Clear selection
   */
  clearSelection(): AssigneeSelectorState {
    this.state.selectedAssignee = null;
    return this.getState();
  }

  /**
   * Filter assignees by criteria
   */
  filterByCriteria(criteria: AssigneeSelectionCriteria): AssigneeSelectorState {
    const filteredAssignees = this.delegationService.getAvailableAssignees(criteria);
    this.state.filteredAssignees = filteredAssignees;
    return this.getState();
  }

  /**
   * Get assignee display information
   */
  getAssigneeDisplayInfo(assignee: Assignee): {
    name: string;
    subtitle: string;
    statusColor: 'green' | 'yellow' | 'red' | 'gray';
    workloadPercentage?: number;
    skills?: string[];
  } {
    let subtitle = '';
    let statusColor: 'green' | 'yellow' | 'red' | 'gray' = 'gray';

    // Build subtitle with availability and role
    const parts: string[] = [];
    
    if (assignee.role) {
      parts.push(assignee.role);
    }

    if (this.config.showAvailability && assignee.availability) {
      parts.push(assignee.availability);
      
      // Set status color based on availability
      switch (assignee.availability) {
        case 'available':
          statusColor = 'green';
          break;
        case 'busy':
          statusColor = 'yellow';
          break;
        case 'away':
          statusColor = 'red';
          break;
      }
    }

    if (this.config.showWorkload && assignee.workload !== undefined) {
      parts.push(`${assignee.workload}% workload`);
      
      // Adjust status color based on workload if availability not shown
      if (!this.config.showAvailability) {
        if (assignee.workload < 70) {
          statusColor = 'green';
        } else if (assignee.workload < 90) {
          statusColor = 'yellow';
        } else {
          statusColor = 'red';
        }
      }
    }

    subtitle = parts.join(' • ');

    return {
      name: assignee.name,
      subtitle,
      statusColor,
      workloadPercentage: this.config.showWorkload ? assignee.workload : undefined,
      skills: this.config.showSkills ? assignee.skills : undefined
    };
  }

  /**
   * Validate current selection
   */
  validateSelection(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.state.selectedAssignee) {
      errors.push('Please select an assignee');
      return { isValid: false, errors, warnings };
    }

    const assignee = this.state.selectedAssignee;

    // Check availability
    if (assignee.availability === 'away') {
      warnings.push(`${assignee.name} is currently away`);
    }

    // Check workload
    if (assignee.workload !== undefined) {
      if (assignee.workload > 90) {
        warnings.push(`${assignee.name} has high workload (${assignee.workload}%)`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get selected assignee ID
   */
  getSelectedAssigneeId(): string | null {
    return this.state.selectedAssignee?.id || null;
  }

  /**
   * Reset selector state
   */
  reset(): AssigneeSelectorState {
    this.state = {
      assignees: this.state.assignees, // Keep loaded assignees
      suggestedAssignees: [],
      selectedAssignee: null,
      searchQuery: '',
      filteredAssignees: this.state.assignees,
      isLoading: false,
      error: null
    };

    return this.getState();
  }

  private loadAssignees(): void {
    this.state.assignees = this.delegationService.getAssignees();
    this.updateFilteredAssignees();
  }

  private updateFilteredAssignees(): void {
    let filtered = [...this.state.assignees];

    // Apply search filter
    if (this.config.enableSearch && this.state.searchQuery.trim()) {
      const query = this.state.searchQuery.toLowerCase();
      filtered = filtered.filter(assignee => 
        assignee.name.toLowerCase().includes(query) ||
        assignee.email?.toLowerCase().includes(query) ||
        assignee.role?.toLowerCase().includes(query) ||
        assignee.skills?.some(skill => skill.toLowerCase().includes(query))
      );
    }

    this.state.filteredAssignees = filtered;
  }
}