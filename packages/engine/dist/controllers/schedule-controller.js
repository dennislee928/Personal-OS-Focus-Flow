/**
 * Schedule Controller
 *
 * Coordinates between the schedule planning interface and schedule service
 * Manages the scheduling workflow and user interactions
 */
import { SchedulePlanningInterface } from '../components/schedule-planning-interface.js';
import { ScheduleService } from '../services/schedule-service.js';
export class ScheduleController {
    planningInterface;
    scheduleService;
    currentTasks = [];
    currentDate = new Date();
    suggestions = [];
    constructor(options = {}) {
        // Initialize planning interface
        this.planningInterface = new SchedulePlanningInterface(options.planningOptions);
        // Initialize schedule service
        const serviceOptions = options.preferences ? {
            peakWindow: options.preferences.peakWorkWindow,
            defaultBlockDuration: options.preferences.defaultBlockDuration,
            workingHours: { start: '08:00', end: '18:00' } // Default, can be customized
        } : {};
        this.scheduleService = new ScheduleService(serviceOptions);
        // Set up event listeners
        this.setupEventListeners();
    }
    /**
     * Initialize the scheduling process with selected tasks
     */
    async initializeScheduling(tasks, date = new Date()) {
        this.currentTasks = tasks;
        this.currentDate = date;
        // Load calendar events if integration is enabled
        await this.loadCalendarEvents(date);
        // Generate scheduling suggestions
        this.suggestions = await this.scheduleService.generateScheduleSuggestions(tasks, date);
        // Initialize the planning interface
        this.planningInterface.initialize(tasks, date);
        // Apply the best suggestion as default
        if (this.suggestions.length > 0) {
            this.applyScheduleSuggestion(0);
        }
    }
    /**
     * Get the current schedule state
     */
    getScheduleState() {
        return {
            planningState: this.planningInterface.getState(),
            suggestions: this.suggestions,
            currentTasks: this.currentTasks,
            currentDate: this.currentDate
        };
    }
    /**
     * Apply a scheduling suggestion
     */
    applyScheduleSuggestion(suggestionIndex) {
        if (suggestionIndex < 0 || suggestionIndex >= this.suggestions.length) {
            return false;
        }
        const suggestion = this.suggestions[suggestionIndex];
        // Clear current schedule
        this.clearSchedule();
        // Apply suggested blocks
        for (const block of suggestion.blocks) {
            this.planningInterface.scheduleBlock(block.taskIds, block.startTime, block.duration, block.type);
        }
        return true;
    }
    /**
     * Manually schedule a focus block
     */
    scheduleBlock(taskIds, startTime, duration, type = 'pomodoro') {
        return this.planningInterface.scheduleBlock(taskIds, startTime, duration, type);
    }
    /**
     * Remove a scheduled block
     */
    removeBlock(blockId) {
        return this.planningInterface.removeBlock(blockId);
    }
    /**
     * Update block timing (for drag and drop)
     */
    updateBlockTiming(blockId, newStartTime, newDuration) {
        return this.planningInterface.updateBlockTiming(blockId, newStartTime, newDuration);
    }
    /**
     * Get the final scheduled blocks
     */
    getScheduledBlocks() {
        return this.planningInterface.getScheduledBlocks();
    }
    /**
     * Validate the current schedule
     */
    validateSchedule() {
        const blocks = this.planningInterface.getScheduledBlocks();
        return this.scheduleService.validateSchedule(blocks);
    }
    /**
     * Get schedule conflicts
     */
    getConflicts() {
        return this.planningInterface.getConflicts();
    }
    /**
     * Clear all scheduled blocks
     */
    clearSchedule() {
        const blocks = this.planningInterface.getScheduledBlocks();
        for (const block of blocks) {
            this.planningInterface.removeBlock(block.id);
        }
    }
    /**
     * Auto-schedule using the best suggestion
     */
    async autoSchedule() {
        if (this.suggestions.length === 0) {
            // Generate new suggestions if none exist
            this.suggestions = await this.scheduleService.generateScheduleSuggestions(this.currentTasks, this.currentDate);
        }
        return this.applyScheduleSuggestion(0);
    }
    /**
     * Get scheduling suggestions with details
     */
    getSchedulingSuggestions() {
        return this.suggestions;
    }
    /**
     * Regenerate suggestions with updated parameters
     */
    async regenerateSuggestions(tasks, date) {
        const targetTasks = tasks || this.currentTasks;
        const targetDate = date || this.currentDate;
        this.suggestions = await this.scheduleService.generateScheduleSuggestions(targetTasks, targetDate);
    }
    /**
     * Update scheduling preferences
     */
    async updatePreferences(preferences) {
        if (preferences.peakWorkWindow) {
            this.scheduleService.updateOptions({
                peakWindow: preferences.peakWorkWindow
            });
        }
        if (preferences.defaultBlockDuration) {
            this.scheduleService.updateOptions({
                defaultBlockDuration: preferences.defaultBlockDuration
            });
        }
        // Regenerate suggestions with new preferences
        await this.regenerateSuggestions();
    }
    /**
     * Export schedule for integration with other systems
     */
    exportSchedule() {
        const blocks = this.planningInterface.getScheduledBlocks();
        const conflicts = this.planningInterface.getConflicts();
        const totalDuration = blocks.reduce((sum, block) => sum + block.duration, 0);
        const peakWindowBlocks = blocks.filter(block => this.isInPeakWindow(block.startTime)).length;
        const scheduledTaskIds = new Set(blocks.flatMap(block => block.taskIds));
        return {
            blocks,
            summary: {
                totalBlocks: blocks.length,
                totalDuration,
                peakWindowBlocks,
                tasksCovered: scheduledTaskIds.size,
                conflicts: conflicts.length
            }
        };
    }
    /**
     * Load calendar events for conflict detection
     */
    async loadCalendarEvents(date) {
        // This would integrate with actual calendar APIs
        // For now, we'll use mock data or empty array
        const mockEvents = [
        // Example calendar events
        // {
        //   id: 'meeting-1',
        //   title: 'Team Standup',
        //   startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0),
        //   endTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 30),
        //   type: 'meeting'
        // }
        ];
        this.scheduleService.setCalendarEvents(mockEvents);
    }
    /**
     * Set up event listeners for the planning interface
     */
    setupEventListeners() {
        this.planningInterface.on('blockScheduled', (block) => {
            // Validate schedule after each change
            const validation = this.validateSchedule();
            if (!validation.valid) {
                console.warn('Schedule validation issues:', validation.errors);
            }
        });
        this.planningInterface.on('blockRemoved', (block) => {
            // Re-validate after removal
            this.validateSchedule();
        });
        this.planningInterface.on('blockUpdated', (block) => {
            // Validate timing changes
            const validation = this.validateSchedule();
            if (!validation.valid) {
                console.warn('Schedule validation issues after update:', validation.errors);
            }
        });
        this.planningInterface.on('conflictDetected', (conflict) => {
            console.warn('Schedule conflict detected:', conflict);
        });
    }
    /**
     * Check if time is in peak window
     */
    isInPeakWindow(time) {
        const options = this.scheduleService.getOptions();
        const peakStart = this.parseTime(options.peakWindow.start);
        const peakEnd = this.parseTime(options.peakWindow.end);
        const hours = time.getHours();
        const minutes = time.getMinutes();
        const timeInMinutes = hours * 60 + minutes;
        const peakStartMinutes = peakStart.hours * 60 + peakStart.minutes;
        const peakEndMinutes = peakEnd.hours * 60 + peakEnd.minutes;
        return timeInMinutes >= peakStartMinutes && timeInMinutes < peakEndMinutes;
    }
    /**
     * Parse time string (HH:MM) to hours and minutes
     */
    parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return { hours, minutes };
    }
    /**
     * Get the planning interface for direct access
     */
    getPlanningInterface() {
        return this.planningInterface;
    }
    /**
     * Get the schedule service for direct access
     */
    getScheduleService() {
        return this.scheduleService;
    }
}
