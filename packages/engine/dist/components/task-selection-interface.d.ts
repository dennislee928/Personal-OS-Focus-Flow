/**
 * Task Selection Interface Component - UI for Ivy-6 task selection
 */
import { Task } from '../types/ritual.js';
import { TaskSelectionControllerConfig } from '../controllers/task-selection-controller.js';
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
export declare class TaskSelectionInterface {
    private controller;
    private config;
    private container;
    private state;
    private dragDrop?;
    private elements;
    constructor(config?: TaskSelectionInterfaceConfig);
    /**
     * Show the interface with available tasks
     */
    show(tasks: Task[]): void;
    /**
     * Hide the interface
     */
    hide(): void;
    /**
     * Get current selection
     */
    getSelection(): string[];
    private createInterface;
    private setupEventListeners;
    private setupKeyboardShortcuts;
    private render;
    private setupDragDrop;
    private renderTaskList;
    private renderSelectedTasks;
    private renderSuggestions;
    private renderSelectionCounter;
    private renderErrors;
    private updateCompleteButton;
    private handleSelectionChange;
    private handleValidationError;
    private handleSelectionComplete;
    private handleSuggestionAccepted;
    private renderWorkloadSummary;
    private toggleWorkloadAnalysis;
}
