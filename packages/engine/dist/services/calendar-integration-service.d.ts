/**
 * Calendar Integration Service
 *
 * Handles integration with external calendar systems for:
 * - Conflict detection and resolution
 * - Available time slot identification
 * - Meeting density analysis
 * - Buffer time management
 */
import { CalendarEvent } from './schedule-service.js';
import { TimeRange } from '../types/ritual.js';
export interface CalendarProvider {
    name: string;
    type: 'google' | 'outlook' | 'apple' | 'exchange' | 'caldav';
    enabled: boolean;
    credentials?: any;
    syncInterval: number;
}
export interface CalendarIntegrationOptions {
    providers: CalendarProvider[];
    bufferTime: number;
    workingHours: TimeRange;
    excludeWeekends: boolean;
    excludeAllDayEvents: boolean;
    conflictResolution: 'strict' | 'flexible' | 'override';
}
export interface AvailabilitySlot {
    startTime: Date;
    endTime: Date;
    duration: number;
    quality: 'high' | 'medium' | 'low';
    bufferBefore: number;
    bufferAfter: number;
    meetingDensity: number;
}
export interface ConflictResolution {
    type: 'reschedule' | 'split' | 'defer' | 'override';
    originalTime: Date;
    suggestedTime?: Date;
    reason: string;
    impact: 'low' | 'medium' | 'high';
}
export declare class CalendarIntegrationService {
    private options;
    private cachedEvents;
    private lastSync;
    constructor(options: CalendarIntegrationOptions);
    /**
     * Get available time slots for a specific date
     */
    getAvailableSlots(date: Date, minDuration?: number): Promise<AvailabilitySlot[]>;
    /**
     * Check for conflicts with a proposed time slot
     */
    checkConflicts(startTime: Date, endTime: Date): Promise<{
        hasConflict: boolean;
        conflicts: CalendarEvent[];
        suggestions: ConflictResolution[];
    }>;
    /**
     * Find the next available time slot after a given time
     */
    findNextAvailableSlot(afterTime: Date, duration: number): Promise<AvailabilitySlot | null>;
    /**
     * Analyze meeting density for a time period
     */
    analyzeMeetingDensity(date: Date): Promise<{
        hourlyDensity: Map<number, number>;
        peakHours: number[];
        quietHours: number[];
        averageDensity: number;
    }>;
    /**
     * Suggest optimal buffer times based on calendar patterns
     */
    suggestOptimalBuffers(date: Date): Promise<{
        beforeMeetings: number;
        afterMeetings: number;
        betweenBlocks: number;
        reasoning: string[];
    }>;
    /**
     * Sync calendar events from all enabled providers
     */
    private syncCalendarEvents;
    /**
     * Fetch events from a specific calendar provider
     */
    private fetchEventsFromProvider;
    /**
     * Get all events for a specific date
     */
    private getEventsForDate;
    /**
     * Generate availability slots between calendar events
     */
    private generateAvailabilitySlots;
    /**
     * Analyze and score slot quality
     */
    private analyzeSlotQuality;
    /**
     * Generate conflict resolution suggestions
     */
    private generateConflictResolutions;
    /**
     * Helper methods
     */
    private isTimeOverlap;
    private isWeekend;
    private parseTime;
    private removeDuplicateEvents;
    private countBackToBackMeetings;
    private getEventsInTimeRange;
    /**
     * Update integration options
     */
    updateOptions(newOptions: Partial<CalendarIntegrationOptions>): void;
    /**
     * Get current integration options
     */
    getOptions(): CalendarIntegrationOptions;
    /**
     * Clear cached events (force refresh)
     */
    clearCache(): void;
}
