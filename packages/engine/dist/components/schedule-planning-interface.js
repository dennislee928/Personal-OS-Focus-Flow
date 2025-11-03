/**
 * Schedule Planning Interface Component
 *
 * Provides a calendar-style interface for focus block placement with:
 * - Default 09:00-12:00 peak window scheduling
 * - Pomodoro timing (25-minute blocks + 5-minute breaks)
 * - Manual override capability for custom timing
 */
export class SchedulePlanningInterface {
    state;
    eventListeners = new Map();
    constructor(options = {}) {
        this.state = {
            selectedDate: new Date(),
            availableSlots: [],
            scheduledBlocks: [],
            selectedTasks: [],
            options: {
                peakWindow: { start: '09:00', end: '12:00' },
                defaultBlockDuration: 25,
                defaultBreakDuration: 5,
                maxBlocksPerDay: 8,
                workingHours: { start: '08:00', end: '18:00' },
                ...options
            },
            conflicts: []
        };
    }
    /**
     * Initialize the interface with selected tasks
     */
    initialize(selectedTasks, date = new Date()) {
        this.state.selectedDate = date;
        this.state.selectedTasks = selectedTasks;
        this.generateAvailableSlots();
        this.suggestOptimalSchedule();
        this.emit('initialized', this.state);
    }
    /**
     * Generate available time slots for the selected date
     */
    generateAvailableSlots() {
        const slots = [];
        const workStart = this.parseTime(this.state.options.workingHours.start);
        const workEnd = this.parseTime(this.state.options.workingHours.end);
        const blockDuration = this.state.options.defaultBlockDuration;
        const breakDuration = this.state.options.defaultBreakDuration;
        const selectedDate = this.state.selectedDate;
        let currentTime = new Date(selectedDate);
        currentTime.setHours(workStart.hours, workStart.minutes, 0, 0);
        const endTime = new Date(selectedDate);
        endTime.setHours(workEnd.hours, workEnd.minutes, 0, 0);
        let slotId = 0;
        while (currentTime < endTime) {
            const slotEnd = new Date(currentTime.getTime() + blockDuration * 60000);
            if (slotEnd <= endTime) {
                const slot = {
                    id: `slot-${slotId++}`,
                    startTime: new Date(currentTime),
                    endTime: slotEnd,
                    available: true,
                    suggested: this.isInPeakWindow(currentTime)
                };
                slots.push(slot);
            }
            // Move to next slot (block + break)
            currentTime = new Date(currentTime.getTime() + (blockDuration + breakDuration) * 60000);
        }
        this.state.availableSlots = slots;
    }
    /**
     * Check if a time is within the peak work window
     */
    isInPeakWindow(time) {
        const peakStart = this.parseTime(this.state.options.peakWindow.start);
        const peakEnd = this.parseTime(this.state.options.peakWindow.end);
        const hours = time.getHours();
        const minutes = time.getMinutes();
        const timeInMinutes = hours * 60 + minutes;
        const peakStartMinutes = peakStart.hours * 60 + peakStart.minutes;
        const peakEndMinutes = peakEnd.hours * 60 + peakEnd.minutes;
        return timeInMinutes >= peakStartMinutes && timeInMinutes < peakEndMinutes;
    }
    /**
     * Suggest optimal schedule based on task priorities and peak windows
     */
    suggestOptimalSchedule() {
        const suggestedBlocks = [];
        const peakSlots = this.state.availableSlots.filter(slot => slot.suggested);
        const regularSlots = this.state.availableSlots.filter(slot => !slot.suggested);
        // Sort tasks by importance and context (deep work first in peak hours)
        const sortedTasks = [...this.state.selectedTasks].sort((a, b) => {
            if (a.context === '@deep' && b.context === '@shallow')
                return -1;
            if (a.context === '@shallow' && b.context === '@deep')
                return 1;
            if (a.importance === 'high' && b.importance !== 'high')
                return -1;
            if (a.importance !== 'high' && b.importance === 'high')
                return 1;
            return 0;
        });
        let taskIndex = 0;
        let blockId = 0;
        // Schedule deep work tasks in peak slots first
        for (const slot of peakSlots) {
            if (taskIndex >= sortedTasks.length)
                break;
            const task = sortedTasks[taskIndex];
            if (task.context === '@deep') {
                const block = {
                    id: `block-${blockId++}`,
                    startTime: slot.startTime,
                    duration: this.state.options.defaultBlockDuration,
                    taskIds: [task.id],
                    type: 'pomodoro',
                    breakDuration: this.state.options.defaultBreakDuration
                };
                suggestedBlocks.push(block);
                slot.available = false;
                taskIndex++;
            }
        }
        // Schedule remaining tasks in regular slots
        for (const slot of regularSlots) {
            if (taskIndex >= sortedTasks.length)
                break;
            if (!slot.available)
                continue;
            const task = sortedTasks[taskIndex];
            const block = {
                id: `block-${blockId++}`,
                startTime: slot.startTime,
                duration: this.state.options.defaultBlockDuration,
                taskIds: [task.id],
                type: 'pomodoro',
                breakDuration: this.state.options.defaultBreakDuration
            };
            suggestedBlocks.push(block);
            slot.available = false;
            taskIndex++;
        }
        this.state.scheduledBlocks = suggestedBlocks;
        this.validateSchedule();
    }
    /**
     * Manually schedule a focus block at a specific time
     */
    scheduleBlock(taskIds, startTime, duration, type = 'pomodoro') {
        const blockDuration = duration || this.state.options.defaultBlockDuration;
        const endTime = new Date(startTime.getTime() + blockDuration * 60000);
        // Check for conflicts
        const conflict = this.checkForConflicts(startTime, endTime);
        if (conflict) {
            this.addConflict({
                id: `conflict-${Date.now()}`,
                type: 'overlap',
                message: `Time slot conflicts with existing block`,
                affectedBlocks: [conflict.id],
                suggestions: ['Choose a different time slot', 'Adjust block duration']
            });
            return false;
        }
        const block = {
            id: `block-${Date.now()}`,
            startTime,
            duration: blockDuration,
            taskIds,
            type,
            breakDuration: type === 'pomodoro' ? this.state.options.defaultBreakDuration : 0
        };
        this.state.scheduledBlocks.push(block);
        this.updateAvailableSlots();
        this.validateSchedule();
        this.emit('blockScheduled', block);
        return true;
    }
    /**
     * Remove a scheduled focus block
     */
    removeBlock(blockId) {
        const index = this.state.scheduledBlocks.findIndex(block => block.id === blockId);
        if (index === -1)
            return false;
        const removedBlock = this.state.scheduledBlocks.splice(index, 1)[0];
        this.updateAvailableSlots();
        this.validateSchedule();
        this.emit('blockRemoved', removedBlock);
        return true;
    }
    /**
     * Update block timing (drag and drop support)
     */
    updateBlockTiming(blockId, newStartTime, newDuration) {
        const block = this.state.scheduledBlocks.find(b => b.id === blockId);
        if (!block)
            return false;
        const oldStartTime = block.startTime;
        const oldDuration = block.duration;
        // Temporarily update for conflict checking
        block.startTime = newStartTime;
        if (newDuration)
            block.duration = newDuration;
        const endTime = new Date(newStartTime.getTime() + block.duration * 60000);
        const conflict = this.checkForConflicts(newStartTime, endTime, blockId);
        if (conflict) {
            // Revert changes
            block.startTime = oldStartTime;
            block.duration = oldDuration;
            this.addConflict({
                id: `conflict-${Date.now()}`,
                type: 'overlap',
                message: `Cannot move block due to conflict`,
                affectedBlocks: [blockId, conflict.id],
                suggestions: ['Choose a different time', 'Adjust duration']
            });
            return false;
        }
        this.updateAvailableSlots();
        this.validateSchedule();
        this.emit('blockUpdated', block);
        return true;
    }
    /**
     * Check for scheduling conflicts
     */
    checkForConflicts(startTime, endTime, excludeBlockId) {
        return this.state.scheduledBlocks.find(block => {
            if (excludeBlockId && block.id === excludeBlockId)
                return false;
            const blockEnd = new Date(block.startTime.getTime() + block.duration * 60000);
            // Check for overlap
            return (startTime < blockEnd && endTime > block.startTime);
        }) || null;
    }
    /**
     * Update available slots based on scheduled blocks
     */
    updateAvailableSlots() {
        this.state.availableSlots.forEach(slot => {
            slot.available = !this.checkForConflicts(slot.startTime, slot.endTime);
        });
    }
    /**
     * Validate the current schedule
     */
    validateSchedule() {
        this.state.conflicts = [];
        // Check for minimum blocks
        if (this.state.scheduledBlocks.length < 2) {
            this.addConflict({
                id: 'min-blocks',
                type: 'duration',
                message: 'Schedule at least 2 focus blocks for optimal productivity',
                affectedBlocks: [],
                suggestions: ['Add more focus blocks', 'Use suggested schedule']
            });
        }
        // Check for task coverage
        const scheduledTaskIds = new Set(this.state.scheduledBlocks.flatMap(block => block.taskIds));
        const unscheduledTasks = this.state.selectedTasks.filter(task => !scheduledTaskIds.has(task.id));
        if (unscheduledTasks.length > 0) {
            this.addConflict({
                id: 'unscheduled-tasks',
                type: 'duration',
                message: `${unscheduledTasks.length} tasks not scheduled`,
                affectedBlocks: [],
                suggestions: ['Schedule remaining tasks', 'Defer less important tasks']
            });
        }
    }
    /**
     * Add a conflict to the state
     */
    addConflict(conflict) {
        this.state.conflicts.push(conflict);
        this.emit('conflictDetected', conflict);
    }
    /**
     * Get the current schedule state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Get scheduled blocks
     */
    getScheduledBlocks() {
        return [...this.state.scheduledBlocks];
    }
    /**
     * Get schedule conflicts
     */
    getConflicts() {
        return [...this.state.conflicts];
    }
    /**
     * Parse time string (HH:MM) to hours and minutes
     */
    parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return { hours, minutes };
    }
    /**
     * Event system for UI updates
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    emit(event, data) {
        const listeners = this.eventListeners.get(event) || [];
        listeners.forEach(callback => callback(data));
    }
    /**
     * Render the interface (returns HTML structure for UI framework integration)
     */
    render() {
        const slots = this.state.availableSlots;
        const blocks = this.state.scheduledBlocks;
        return `
      <div class="schedule-planning-interface">
        <div class="schedule-header">
          <h3>Focus Block Schedule - ${this.state.selectedDate.toDateString()}</h3>
          <div class="schedule-controls">
            <button class="btn-suggest" onclick="suggestSchedule()">Auto-Schedule</button>
            <button class="btn-clear" onclick="clearSchedule()">Clear All</button>
          </div>
        </div>
        
        <div class="schedule-grid">
          <div class="time-column">
            ${this.renderTimeColumn()}
          </div>
          <div class="schedule-column">
            ${this.renderScheduleSlots()}
            ${this.renderScheduledBlocks()}
          </div>
        </div>
        
        <div class="schedule-summary">
          <div class="blocks-count">Scheduled Blocks: ${blocks.length}</div>
          <div class="conflicts-count">Conflicts: ${this.state.conflicts.length}</div>
        </div>
        
        ${this.renderConflicts()}
      </div>
    `;
    }
    renderTimeColumn() {
        const workStart = this.parseTime(this.state.options.workingHours.start);
        const workEnd = this.parseTime(this.state.options.workingHours.end);
        let html = '';
        for (let hour = workStart.hours; hour < workEnd.hours; hour++) {
            html += `<div class="time-slot">${hour.toString().padStart(2, '0')}:00</div>`;
        }
        return html;
    }
    renderScheduleSlots() {
        return this.state.availableSlots.map(slot => {
            const classes = ['schedule-slot'];
            if (!slot.available)
                classes.push('occupied');
            if (slot.suggested)
                classes.push('suggested');
            return `
        <div class="${classes.join(' ')}" 
             data-slot-id="${slot.id}"
             data-start-time="${slot.startTime.toISOString()}">
          ${slot.suggested ? '⭐' : ''}
        </div>
      `;
        }).join('');
    }
    renderScheduledBlocks() {
        return this.state.scheduledBlocks.map(block => {
            const taskTitles = block.taskIds.map(id => this.state.selectedTasks.find(t => t.id === id)?.title || 'Unknown Task').join(', ');
            return `
        <div class="focus-block ${block.type}" 
             data-block-id="${block.id}"
             style="top: ${this.calculateBlockPosition(block)}px; height: ${this.calculateBlockHeight(block)}px;">
          <div class="block-header">
            <span class="block-type">${block.type === 'pomodoro' ? '🍅' : '⏱️'}</span>
            <span class="block-duration">${block.duration}min</span>
          </div>
          <div class="block-tasks">${taskTitles}</div>
          <div class="block-controls">
            <button onclick="editBlock('${block.id}')">✏️</button>
            <button onclick="removeBlock('${block.id}')">🗑️</button>
          </div>
        </div>
      `;
        }).join('');
    }
    renderConflicts() {
        if (this.state.conflicts.length === 0)
            return '';
        return `
      <div class="schedule-conflicts">
        <h4>Schedule Issues</h4>
        ${this.state.conflicts.map(conflict => `
          <div class="conflict ${conflict.type}">
            <div class="conflict-message">${conflict.message}</div>
            <div class="conflict-suggestions">
              ${conflict.suggestions.map(suggestion => `<button class="suggestion-btn">${suggestion}</button>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    }
    calculateBlockPosition(block) {
        const workStart = this.parseTime(this.state.options.workingHours.start);
        const blockStart = block.startTime;
        const minutesFromStart = (blockStart.getHours() - workStart.hours) * 60 +
            (blockStart.getMinutes() - workStart.minutes);
        return minutesFromStart * 2; // 2px per minute
    }
    calculateBlockHeight(block) {
        return block.duration * 2; // 2px per minute
    }
}
