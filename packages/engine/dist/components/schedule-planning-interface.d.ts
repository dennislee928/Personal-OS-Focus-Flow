/**
 * Schedule Planning Interface Component
 *
 * Provides a calendar-style interface for focus block placement with:
 * - Default 09:00-12:00 peak window scheduling
 * - Pomodoro timing (25-minute blocks + 5-minute breaks)
 * - Manual override capability for custom timing
 */
import { FocusBlock, TimeRange, Task } from '../types/ritual.js';
export interface ScheduleSlot {
    id: string;
    startTime: Date;
    endTime: Date;
    available: boolean;
    suggested: boolean;
    conflictReason?: string;
}
export interface SchedulePlanningOptions {
    peakWindow: TimeRange;
    defaultBlockDuration: number;
    defaultBreakDuration: number;
    maxBlocksPerDay: number;
    workingHours: TimeRange;
}
export interface SchedulePlanningState {
    selectedDate: Date;
    availableSlots: ScheduleSlot[];
    scheduledBlocks: FocusBlock[];
    selectedTasks: Task[];
    options: SchedulePlanningOptions;
    conflicts: ScheduleConflict[];
}
export interface ScheduleConflict {
    id: string;
    type: 'calendar' | 'overlap' | 'duration';
    message: string;
    affectedBlocks: string[];
    suggestions: string[];
}
export declare class SchedulePlanningInterface {
    private state;
    private eventListeners;
    constructor(options?: Partial<SchedulePlanningOptions>);
    /**
     * Initialize the interface with selected tasks
     */
    initialize(selectedTasks: Task[], date?: Date): void;
    /**
     * Generate available time slots for the selected date
     */
    private generateAvailableSlots;
    /**
     * Check if a time is within the peak work window
     */
    private isInPeakWindow;
    /**
     * Suggest optimal schedule based on task priorities and peak windows
     */
    private suggestOptimalSchedule;
    /**
     * Manually schedule a focus block at a specific time
     */
    scheduleBlock(taskIds: string[], startTime: Date, duration?: number, type?: 'pomodoro' | 'custom'): boolean;
    /**
     * Remove a scheduled focus block
     */
    removeBlock(blockId: string): boolean;
    /**
     * Update block timing (drag and drop support)
     */
    updateBlockTiming(blockId: string, newStartTime: Date, newDuration?: number): boolean;
    /**
     * Check for scheduling conflicts
     */
    private checkForConflicts;
    /**
     * Update available slots based on scheduled blocks
     */
    private updateAvailableSlots;
    /**
     * Validate the current schedule
     */
    private validateSchedule;
    /**
     * Add a conflict to the state
     */
    private addConflict;
    /**
     * Get the current schedule state
     */
    getState(): SchedulePlanningState;
    /**
     * Get scheduled blocks
     */
    getScheduledBlocks(): FocusBlock[];
    /**
     * Get schedule conflicts
     */
    getConflicts(): ScheduleConflict[];
    /**
     * Parse time string (HH:MM) to hours and minutes
     */
    private parseTime;
    /**
     * Event system for UI updates
     */
    on(event: string, callback: Function): void;
    private emit;
    /**
     * Render the interface (returns HTML structure for UI framework integration)
     */
    render(): string;
    private renderTimeColumn;
    private renderScheduleSlots;
    private renderScheduledBlocks;
    private renderConflicts;
    private calculateBlockPosition;
    private calculateBlockHeight;
}
