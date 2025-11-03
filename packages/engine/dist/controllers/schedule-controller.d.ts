/**
 * Schedule Controller
 *
 * Coordinates between the schedule planning interface and schedule service
 * Manages the scheduling workflow and user interactions
 */
import { SchedulePlanningInterface, SchedulePlanningOptions } from '../components/schedule-planning-interface.js';
import { ScheduleService, SchedulingSuggestion } from '../services/schedule-service.js';
import { FocusBlock, Task, RitualPreferences } from '../types/ritual.js';
export interface ScheduleControllerOptions {
    planningOptions?: Partial<SchedulePlanningOptions>;
    preferences?: RitualPreferences;
    calendarIntegration?: boolean;
}
export declare class ScheduleController {
    private planningInterface;
    private scheduleService;
    private currentTasks;
    private currentDate;
    private suggestions;
    constructor(options?: ScheduleControllerOptions);
    /**
     * Initialize the scheduling process with selected tasks
     */
    initializeScheduling(tasks: Task[], date?: Date): Promise<void>;
    /**
     * Get the current schedule state
     */
    getScheduleState(): {
        planningState: import("../components/schedule-planning-interface.js").SchedulePlanningState;
        suggestions: SchedulingSuggestion[];
        currentTasks: Task[];
        currentDate: Date;
    };
    /**
     * Apply a scheduling suggestion
     */
    applyScheduleSuggestion(suggestionIndex: number): boolean;
    /**
     * Manually schedule a focus block
     */
    scheduleBlock(taskIds: string[], startTime: Date, duration?: number, type?: 'pomodoro' | 'custom'): boolean;
    /**
     * Remove a scheduled block
     */
    removeBlock(blockId: string): boolean;
    /**
     * Update block timing (for drag and drop)
     */
    updateBlockTiming(blockId: string, newStartTime: Date, newDuration?: number): boolean;
    /**
     * Get the final scheduled blocks
     */
    getScheduledBlocks(): FocusBlock[];
    /**
     * Validate the current schedule
     */
    validateSchedule(): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Get schedule conflicts
     */
    getConflicts(): import("../components/schedule-planning-interface.js").ScheduleConflict[];
    /**
     * Clear all scheduled blocks
     */
    clearSchedule(): void;
    /**
     * Auto-schedule using the best suggestion
     */
    autoSchedule(): Promise<boolean>;
    /**
     * Get scheduling suggestions with details
     */
    getSchedulingSuggestions(): SchedulingSuggestion[];
    /**
     * Regenerate suggestions with updated parameters
     */
    regenerateSuggestions(tasks?: Task[], date?: Date): Promise<void>;
    /**
     * Update scheduling preferences
     */
    updatePreferences(preferences: Partial<RitualPreferences>): Promise<void>;
    /**
     * Export schedule for integration with other systems
     */
    exportSchedule(): {
        blocks: FocusBlock[];
        summary: {
            totalBlocks: number;
            totalDuration: number;
            peakWindowBlocks: number;
            tasksCovered: number;
            conflicts: number;
        };
    };
    /**
     * Load calendar events for conflict detection
     */
    private loadCalendarEvents;
    /**
     * Set up event listeners for the planning interface
     */
    private setupEventListeners;
    /**
     * Check if time is in peak window
     */
    private isInPeakWindow;
    /**
     * Parse time string (HH:MM) to hours and minutes
     */
    private parseTime;
    /**
     * Get the planning interface for direct access
     */
    getPlanningInterface(): SchedulePlanningInterface;
    /**
     * Get the schedule service for direct access
     */
    getScheduleService(): ScheduleService;
}
