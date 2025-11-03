/**
 * Schedule Service
 *
 * Handles focus block scheduling logic, calendar integration,
 * and smart scheduling algorithms
 */
import { FocusBlock, Task, TimeRange } from '../types/ritual.js';
import { SmartSchedulingService, SchedulingContext } from './smart-scheduling-service.js';
import { CalendarIntegrationService, CalendarIntegrationOptions } from './calendar-integration-service.js';
export interface CalendarEvent {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    type: 'meeting' | 'appointment' | 'block' | 'other';
}
export interface SchedulingOptions {
    peakWindow: TimeRange;
    workingHours: TimeRange;
    defaultBlockDuration: number;
    defaultBreakDuration: number;
    maxBlocksPerDay: number;
    minBlocksPerDay: number;
    allowOverlap: boolean;
    bufferTime: number;
}
export interface SchedulingSuggestion {
    blocks: FocusBlock[];
    score: number;
    reasoning: string[];
    conflicts: string[];
}
export declare class ScheduleService {
    private options;
    private calendarEvents;
    private smartSchedulingService;
    private calendarIntegrationService;
    constructor(options?: Partial<SchedulingOptions>, schedulingContext?: Partial<SchedulingContext>, calendarOptions?: CalendarIntegrationOptions);
    /**
     * Set calendar events for conflict detection
     */
    setCalendarEvents(events: CalendarEvent[]): void;
    /**
     * Check for conflicts with calendar events
     */
    checkScheduleConflicts(blocks: FocusBlock[]): Promise<{
        conflicts: any[];
        resolutions: any[];
    }>;
    /**
     * Get calendar integration service
     */
    getCalendarIntegration(): CalendarIntegrationService;
    /**
     * Get smart scheduling service
     */
    getSmartScheduling(): SmartSchedulingService;
    /**
     * Update scheduling context for smart algorithms
     */
    updateSchedulingContext(context: Partial<SchedulingContext>): void;
    /**
     * Generate optimal schedule suggestions for selected tasks
     */
    generateScheduleSuggestions(tasks: Task[], date: Date): Promise<SchedulingSuggestion[]>;
    /**
     * Generate schedule prioritizing peak window for deep work
     */
    private generatePeakWindowSchedule;
    /**
     * Generate balanced schedule across the day
     */
    private generateBalancedSchedule;
    /**
     * Generate schedule grouping similar context tasks
     */
    private generateContextGroupedSchedule;
    /**
     * Get available time slots for scheduling
     */
    private getAvailableTimeSlots;
    /**
     * Check if time is in peak work window
     */
    private isInPeakWindow;
    /**
     * Check for calendar conflicts
     */
    private hasCalendarConflict;
    /**
     * Calculate optimal duration for a task
     */
    private calculateOptimalDuration;
    /**
     * Calculate duration for a group of tasks
     */
    private calculateGroupDuration;
    /**
     * Calculate score for a schedule
     */
    private calculateScheduleScore;
    /**
     * Calculate time spread of blocks (in minutes)
     */
    private calculateTimeSpread;
    /**
     * Calculate context consistency within blocks
     */
    private calculateContextConsistency;
    /**
     * Detect conflicts in a schedule
     */
    private detectScheduleConflicts;
    /**
     * Validate a schedule against constraints
     */
    validateSchedule(blocks: FocusBlock[]): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Check if time is within working hours
     */
    private isWithinWorkingHours;
    /**
     * Parse time string (HH:MM) to hours and minutes
     */
    private parseTime;
    /**
     * Update scheduling options
     */
    updateOptions(newOptions: Partial<SchedulingOptions>): void;
    /**
     * Get current scheduling options
     */
    getOptions(): SchedulingOptions;
}
