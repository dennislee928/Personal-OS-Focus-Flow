/**
 * Calendar Integration Service
 *
 * Handles integration with external calendar systems for:
 * - Conflict detection and resolution
 * - Available time slot identification
 * - Meeting density analysis
 * - Buffer time management
 */
export class CalendarIntegrationService {
    options;
    cachedEvents = new Map();
    lastSync = new Map();
    constructor(options) {
        this.options = options;
    }
    /**
     * Get available time slots for a specific date
     */
    async getAvailableSlots(date, minDuration = 25) {
        // Sync calendar events for the date
        await this.syncCalendarEvents(date);
        // Get all events for the date
        const dayEvents = this.getEventsForDate(date);
        // Generate availability slots
        const slots = this.generateAvailabilitySlots(date, dayEvents, minDuration);
        // Analyze and score slots
        return this.analyzeSlotQuality(slots, dayEvents);
    }
    /**
     * Check for conflicts with a proposed time slot
     */
    async checkConflicts(startTime, endTime) {
        await this.syncCalendarEvents(startTime);
        const dayEvents = this.getEventsForDate(startTime);
        const conflicts = dayEvents.filter(event => this.isTimeOverlap(startTime, endTime, event.startTime, event.endTime));
        const suggestions = conflicts.length > 0 ?
            await this.generateConflictResolutions(startTime, endTime, conflicts) : [];
        return {
            hasConflict: conflicts.length > 0,
            conflicts,
            suggestions
        };
    }
    /**
     * Find the next available time slot after a given time
     */
    async findNextAvailableSlot(afterTime, duration) {
        const searchDate = new Date(afterTime);
        const maxSearchDays = 7; // Search up to 7 days ahead
        for (let day = 0; day < maxSearchDays; day++) {
            const currentDate = new Date(searchDate);
            currentDate.setDate(currentDate.getDate() + day);
            // Skip weekends if configured
            if (this.options.excludeWeekends && this.isWeekend(currentDate)) {
                continue;
            }
            const availableSlots = await this.getAvailableSlots(currentDate, duration);
            // Find first slot after the specified time
            const validSlots = availableSlots.filter(slot => day > 0 || slot.startTime >= afterTime);
            if (validSlots.length > 0) {
                return validSlots[0];
            }
        }
        return null;
    }
    /**
     * Analyze meeting density for a time period
     */
    async analyzeMeetingDensity(date) {
        await this.syncCalendarEvents(date);
        const dayEvents = this.getEventsForDate(date);
        const hourlyDensity = new Map();
        // Initialize all hours
        for (let hour = 0; hour < 24; hour++) {
            hourlyDensity.set(hour, 0);
        }
        // Count meetings per hour
        for (const event of dayEvents) {
            const startHour = event.startTime.getHours();
            const endHour = event.endTime.getHours();
            for (let hour = startHour; hour <= endHour; hour++) {
                const current = hourlyDensity.get(hour) || 0;
                hourlyDensity.set(hour, current + 1);
            }
        }
        // Analyze patterns
        const densityValues = Array.from(hourlyDensity.values());
        const averageDensity = densityValues.reduce((sum, val) => sum + val, 0) / densityValues.length;
        const peakHours = Array.from(hourlyDensity.entries())
            .filter(([_, density]) => density > averageDensity * 1.5)
            .map(([hour, _]) => hour);
        const quietHours = Array.from(hourlyDensity.entries())
            .filter(([_, density]) => density < averageDensity * 0.5)
            .map(([hour, _]) => hour);
        return {
            hourlyDensity,
            peakHours,
            quietHours,
            averageDensity
        };
    }
    /**
     * Suggest optimal buffer times based on calendar patterns
     */
    async suggestOptimalBuffers(date) {
        const densityAnalysis = await this.analyzeMeetingDensity(date);
        const dayEvents = this.getEventsForDate(date);
        const reasoning = [];
        let beforeMeetings = this.options.bufferTime;
        let afterMeetings = this.options.bufferTime;
        let betweenBlocks = 15;
        // Adjust based on meeting density
        if (densityAnalysis.averageDensity > 3) {
            beforeMeetings += 5;
            afterMeetings += 5;
            betweenBlocks += 10;
            reasoning.push('Increased buffers due to high meeting density');
        }
        // Analyze meeting types and durations
        const longMeetings = dayEvents.filter(event => (event.endTime.getTime() - event.startTime.getTime()) > 60 * 60 * 1000 // > 1 hour
        );
        if (longMeetings.length > 2) {
            afterMeetings += 10;
            reasoning.push('Extended post-meeting buffers for long meetings');
        }
        // Check for back-to-back meetings
        const backToBackCount = this.countBackToBackMeetings(dayEvents);
        if (backToBackCount > 3) {
            betweenBlocks += 5;
            reasoning.push('Increased block spacing due to back-to-back meetings');
        }
        return {
            beforeMeetings,
            afterMeetings,
            betweenBlocks,
            reasoning
        };
    }
    /**
     * Sync calendar events from all enabled providers
     */
    async syncCalendarEvents(date) {
        const dateKey = date.toDateString();
        const now = new Date();
        for (const provider of this.options.providers) {
            if (!provider.enabled)
                continue;
            const lastSyncTime = this.lastSync.get(provider.name);
            const syncIntervalMs = provider.syncInterval * 60 * 1000;
            // Check if sync is needed
            if (lastSyncTime && (now.getTime() - lastSyncTime.getTime()) < syncIntervalMs) {
                continue;
            }
            try {
                const events = await this.fetchEventsFromProvider(provider, date);
                this.cachedEvents.set(`${provider.name}-${dateKey}`, events);
                this.lastSync.set(provider.name, now);
            }
            catch (error) {
                console.warn(`Failed to sync calendar events from ${provider.name}:`, error);
            }
        }
    }
    /**
     * Fetch events from a specific calendar provider
     */
    async fetchEventsFromProvider(provider, date) {
        // This would implement actual API calls to calendar providers
        // For now, return mock data
        const mockEvents = [
            {
                id: 'mock-1',
                title: 'Team Standup',
                startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0),
                endTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 30),
                type: 'meeting'
            },
            {
                id: 'mock-2',
                title: 'Project Review',
                startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 14, 0),
                endTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 15, 0),
                type: 'meeting'
            }
        ];
        return mockEvents;
    }
    /**
     * Get all events for a specific date
     */
    getEventsForDate(date) {
        const dateKey = date.toDateString();
        const allEvents = [];
        for (const provider of this.options.providers) {
            if (!provider.enabled)
                continue;
            const providerEvents = this.cachedEvents.get(`${provider.name}-${dateKey}`) || [];
            allEvents.push(...providerEvents);
        }
        // Remove duplicates and sort by start time
        const uniqueEvents = this.removeDuplicateEvents(allEvents);
        return uniqueEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    }
    /**
     * Generate availability slots between calendar events
     */
    generateAvailabilitySlots(date, events, minDuration) {
        const slots = [];
        // Parse working hours
        const workStart = this.parseTime(this.options.workingHours.start);
        const workEnd = this.parseTime(this.options.workingHours.end);
        const dayStart = new Date(date);
        dayStart.setHours(workStart.hours, workStart.minutes, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(workEnd.hours, workEnd.minutes, 0, 0);
        // Filter events to working hours only
        const workingHourEvents = events.filter(event => event.startTime < dayEnd && event.endTime > dayStart);
        let currentTime = dayStart;
        for (const event of workingHourEvents) {
            // Check if there's a gap before this event
            const eventStart = new Date(Math.max(event.startTime.getTime(), dayStart.getTime()));
            const gapDuration = (eventStart.getTime() - currentTime.getTime()) / (1000 * 60);
            if (gapDuration >= minDuration + this.options.bufferTime) {
                const slotStart = new Date(currentTime);
                const slotEnd = new Date(eventStart.getTime() - this.options.bufferTime * 60 * 1000);
                slots.push({
                    startTime: slotStart,
                    endTime: slotEnd,
                    duration: (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60),
                    quality: 'medium',
                    bufferBefore: 0,
                    bufferAfter: this.options.bufferTime,
                    meetingDensity: 0
                });
            }
            // Move current time to after this event
            currentTime = new Date(Math.max(event.endTime.getTime() + this.options.bufferTime * 60 * 1000, currentTime.getTime()));
        }
        // Check for gap after last event
        if (currentTime < dayEnd) {
            const remainingDuration = (dayEnd.getTime() - currentTime.getTime()) / (1000 * 60);
            if (remainingDuration >= minDuration) {
                slots.push({
                    startTime: new Date(currentTime),
                    endTime: dayEnd,
                    duration: remainingDuration,
                    quality: 'medium',
                    bufferBefore: this.options.bufferTime,
                    bufferAfter: 0,
                    meetingDensity: 0
                });
            }
        }
        return slots;
    }
    /**
     * Analyze and score slot quality
     */
    analyzeSlotQuality(slots, events) {
        return slots.map(slot => {
            // Calculate meeting density around this slot
            const surroundingEvents = this.getEventsInTimeRange(events, new Date(slot.startTime.getTime() - 2 * 60 * 60 * 1000), // 2 hours before
            new Date(slot.endTime.getTime() + 2 * 60 * 60 * 1000) // 2 hours after
            );
            slot.meetingDensity = surroundingEvents.length / 4; // Normalize to meetings per hour
            // Determine quality based on various factors
            if (slot.duration >= 90 && slot.meetingDensity <= 0.5) {
                slot.quality = 'high';
            }
            else if (slot.duration >= 45 && slot.meetingDensity <= 1) {
                slot.quality = 'medium';
            }
            else {
                slot.quality = 'low';
            }
            return slot;
        });
    }
    /**
     * Generate conflict resolution suggestions
     */
    async generateConflictResolutions(startTime, endTime, conflicts) {
        const resolutions = [];
        const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
        // Strategy 1: Find next available slot
        const nextSlot = await this.findNextAvailableSlot(endTime, duration);
        if (nextSlot) {
            resolutions.push({
                type: 'reschedule',
                originalTime: startTime,
                suggestedTime: nextSlot.startTime,
                reason: 'Move to next available time slot',
                impact: 'low'
            });
        }
        // Strategy 2: Split into smaller blocks
        if (duration > 50) {
            resolutions.push({
                type: 'split',
                originalTime: startTime,
                reason: 'Split into multiple smaller focus blocks',
                impact: 'medium'
            });
        }
        // Strategy 3: Defer to next day
        const nextDay = new Date(startTime);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDaySlot = await this.findNextAvailableSlot(nextDay, duration);
        if (nextDaySlot) {
            resolutions.push({
                type: 'defer',
                originalTime: startTime,
                suggestedTime: nextDaySlot.startTime,
                reason: 'Defer to next available day',
                impact: 'high'
            });
        }
        // Strategy 4: Override (if flexible conflict resolution)
        if (this.options.conflictResolution === 'flexible') {
            resolutions.push({
                type: 'override',
                originalTime: startTime,
                reason: 'Schedule anyway with notification',
                impact: 'high'
            });
        }
        return resolutions;
    }
    /**
     * Helper methods
     */
    isTimeOverlap(start1, end1, start2, end2) {
        return start1 < end2 && start2 < end1;
    }
    isWeekend(date) {
        const day = date.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    }
    parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return { hours, minutes };
    }
    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.title}-${event.startTime.getTime()}-${event.endTime.getTime()}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    countBackToBackMeetings(events) {
        let count = 0;
        for (let i = 0; i < events.length - 1; i++) {
            const gap = events[i + 1].startTime.getTime() - events[i].endTime.getTime();
            if (gap <= 5 * 60 * 1000) { // 5 minutes or less
                count++;
            }
        }
        return count;
    }
    getEventsInTimeRange(events, start, end) {
        return events.filter(event => this.isTimeOverlap(start, end, event.startTime, event.endTime));
    }
    /**
     * Update integration options
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }
    /**
     * Get current integration options
     */
    getOptions() {
        return { ...this.options };
    }
    /**
     * Clear cached events (force refresh)
     */
    clearCache() {
        this.cachedEvents.clear();
        this.lastSync.clear();
    }
}
