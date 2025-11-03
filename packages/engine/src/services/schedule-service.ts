/**
 * Schedule Service
 * 
 * Handles focus block scheduling logic, calendar integration,
 * and smart scheduling algorithms
 */

import { FocusBlock, Task, TimeRange, RitualPreferences } from '../types/ritual.js';
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
  bufferTime: number; // minutes between blocks
}

export interface SchedulingSuggestion {
  blocks: FocusBlock[];
  score: number;
  reasoning: string[];
  conflicts: string[];
}

export class ScheduleService {
  private options: SchedulingOptions;
  private calendarEvents: CalendarEvent[] = [];
  private smartSchedulingService: SmartSchedulingService;
  private calendarIntegrationService: CalendarIntegrationService;

  constructor(options: Partial<SchedulingOptions> = {}, schedulingContext?: Partial<SchedulingContext>, calendarOptions?: CalendarIntegrationOptions) {
    this.options = {
      peakWindow: { start: '09:00', end: '12:00' },
      workingHours: { start: '08:00', end: '18:00' },
      defaultBlockDuration: 25,
      defaultBreakDuration: 5,
      maxBlocksPerDay: 8,
      minBlocksPerDay: 2,
      allowOverlap: false,
      bufferTime: 5,
      ...options
    };

    // Initialize smart scheduling service
    this.smartSchedulingService = new SmartSchedulingService(schedulingContext);

    // Initialize calendar integration service
    const defaultCalendarOptions: CalendarIntegrationOptions = {
      providers: [],
      bufferTime: this.options.bufferTime,
      workingHours: this.options.workingHours,
      excludeWeekends: true,
      excludeAllDayEvents: true,
      conflictResolution: 'flexible'
    };
    this.calendarIntegrationService = new CalendarIntegrationService(calendarOptions || defaultCalendarOptions);
  }

  /**
   * Set calendar events for conflict detection
   */
  setCalendarEvents(events: CalendarEvent[]): void {
    this.calendarEvents = events;
    this.smartSchedulingService.setCalendarEvents(events);
  }

  /**
   * Check for conflicts with calendar events
   */
  async checkScheduleConflicts(blocks: FocusBlock[]): Promise<{
    conflicts: any[];
    resolutions: any[];
  }> {
    const conflicts: any[] = [];
    const resolutions: any[] = [];

    for (const block of blocks) {
      const blockEnd = new Date(block.startTime.getTime() + block.duration * 60000);
      const conflictCheck = await this.calendarIntegrationService.checkConflicts(block.startTime, blockEnd);
      
      if (conflictCheck.hasConflict) {
        conflicts.push({
          blockId: block.id,
          conflicts: conflictCheck.conflicts
        });
        resolutions.push(...conflictCheck.suggestions);
      }
    }

    return { conflicts, resolutions };
  }

  /**
   * Get calendar integration service
   */
  getCalendarIntegration(): CalendarIntegrationService {
    return this.calendarIntegrationService;
  }

  /**
   * Get smart scheduling service
   */
  getSmartScheduling(): SmartSchedulingService {
    return this.smartSchedulingService;
  }

  /**
   * Update scheduling context for smart algorithms
   */
  updateSchedulingContext(context: Partial<SchedulingContext>): void {
    this.smartSchedulingService.updateContext(context);
  }

  /**
   * Generate optimal schedule suggestions for selected tasks
   */
  async generateScheduleSuggestions(tasks: Task[], date: Date): Promise<SchedulingSuggestion[]> {
    const suggestions: SchedulingSuggestion[] = [];
    
    // Get available time slots from calendar integration
    const availableSlots = await this.calendarIntegrationService.getAvailableSlots(date, this.options.defaultBlockDuration);
    
    // Strategy 1: Smart AI-optimized scheduling
    if (availableSlots.length > 0) {
      const timeSlots = availableSlots.map(slot => ({
        id: `slot-${slot.startTime.getTime()}`,
        startTime: slot.startTime.toTimeString().slice(0, 5),
        endTime: slot.endTime.toTimeString().slice(0, 5),
        duration: slot.duration
      }));
      
      const smartStrategy = this.smartSchedulingService.generateOptimizedSchedule(tasks, date, timeSlots);
      suggestions.push(smartStrategy);
    }
    
    // Strategy 2: Peak window prioritization
    const peakStrategy = this.generatePeakWindowSchedule(tasks, date);
    if (peakStrategy) suggestions.push(peakStrategy);
    
    // Strategy 3: Balanced workload
    const balancedStrategy = this.generateBalancedSchedule(tasks, date);
    if (balancedStrategy) suggestions.push(balancedStrategy);
    
    // Strategy 4: Context-based grouping
    const contextStrategy = this.generateContextGroupedSchedule(tasks, date);
    if (contextStrategy) suggestions.push(contextStrategy);
    
    // Sort by score (highest first)
    return suggestions.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate schedule prioritizing peak window for deep work
   */
  private generatePeakWindowSchedule(tasks: Task[], date: Date): SchedulingSuggestion | null {
    const blocks: FocusBlock[] = [];
    const reasoning: string[] = [];
    const conflicts: string[] = [];
    
    // Separate deep and shallow work tasks
    const deepTasks = tasks.filter(t => t.context === '@deep');
    const shallowTasks = tasks.filter(t => t.context === '@shallow');
    
    reasoning.push(`Prioritizing ${deepTasks.length} deep work tasks in peak window (${this.options.peakWindow.start}-${this.options.peakWindow.end})`);
    
    // Get available slots
    const availableSlots = this.getAvailableTimeSlots(date);
    const peakSlots = availableSlots.filter(slot => this.isInPeakWindow(slot.startTime));
    const regularSlots = availableSlots.filter(slot => !this.isInPeakWindow(slot.startTime));
    
    let blockId = 0;
    
    // Schedule deep work in peak slots
    for (let i = 0; i < Math.min(deepTasks.length, peakSlots.length); i++) {
      const task = deepTasks[i];
      const slot = peakSlots[i];
      
      blocks.push({
        id: `peak-block-${blockId++}`,
        startTime: slot.startTime,
        duration: this.calculateOptimalDuration(task),
        taskIds: [task.id],
        type: 'pomodoro',
        breakDuration: this.options.defaultBreakDuration
      });
    }
    
    // Schedule remaining tasks in regular slots
    const remainingTasks = [...deepTasks.slice(peakSlots.length), ...shallowTasks];
    for (let i = 0; i < Math.min(remainingTasks.length, regularSlots.length); i++) {
      const task = remainingTasks[i];
      const slot = regularSlots[i];
      
      blocks.push({
        id: `regular-block-${blockId++}`,
        startTime: slot.startTime,
        duration: this.calculateOptimalDuration(task),
        taskIds: [task.id],
        type: 'pomodoro',
        breakDuration: this.options.defaultBreakDuration
      });
    }
    
    // Check for unscheduled tasks
    if (blocks.length < tasks.length) {
      conflicts.push(`${tasks.length - blocks.length} tasks could not be scheduled due to time constraints`);
    }
    
    const score = this.calculateScheduleScore(blocks, tasks, 'peak-priority');
    
    return {
      blocks,
      score,
      reasoning,
      conflicts
    };
  }

  /**
   * Generate balanced schedule across the day
   */
  private generateBalancedSchedule(tasks: Task[], date: Date): SchedulingSuggestion | null {
    const blocks: FocusBlock[] = [];
    const reasoning: string[] = ['Distributing tasks evenly across available time slots'];
    const conflicts: string[] = [];
    
    const availableSlots = this.getAvailableTimeSlots(date);
    const slotsPerTask = Math.floor(availableSlots.length / tasks.length);
    
    reasoning.push(`Allocating ${slotsPerTask} time slots per task for balanced workload`);
    
    let blockId = 0;
    let slotIndex = 0;
    
    for (const task of tasks) {
      if (slotIndex >= availableSlots.length) {
        conflicts.push(`Insufficient time slots for task: ${task.title}`);
        continue;
      }
      
      const slot = availableSlots[slotIndex];
      blocks.push({
        id: `balanced-block-${blockId++}`,
        startTime: slot.startTime,
        duration: this.calculateOptimalDuration(task),
        taskIds: [task.id],
        type: 'pomodoro',
        breakDuration: this.options.defaultBreakDuration
      });
      
      slotIndex += Math.max(1, slotsPerTask);
    }
    
    const score = this.calculateScheduleScore(blocks, tasks, 'balanced');
    
    return {
      blocks,
      score,
      reasoning,
      conflicts
    };
  }

  /**
   * Generate schedule grouping similar context tasks
   */
  private generateContextGroupedSchedule(tasks: Task[], date: Date): SchedulingSuggestion | null {
    const blocks: FocusBlock[] = [];
    const reasoning: string[] = ['Grouping tasks by context for better focus flow'];
    const conflicts: string[] = [];
    
    // Group tasks by context
    const deepTasks = tasks.filter(t => t.context === '@deep');
    const shallowTasks = tasks.filter(t => t.context === '@shallow');
    
    reasoning.push(`Creating ${Math.ceil(deepTasks.length / 2)} deep work blocks and ${Math.ceil(shallowTasks.length / 3)} shallow work blocks`);
    
    const availableSlots = this.getAvailableTimeSlots(date);
    let blockId = 0;
    let slotIndex = 0;
    
    // Create deep work blocks (1-2 tasks per block)
    for (let i = 0; i < deepTasks.length; i += 2) {
      if (slotIndex >= availableSlots.length) break;
      
      const taskGroup = deepTasks.slice(i, i + 2);
      const slot = availableSlots[slotIndex++];
      
      blocks.push({
        id: `deep-block-${blockId++}`,
        startTime: slot.startTime,
        duration: this.calculateGroupDuration(taskGroup),
        taskIds: taskGroup.map(t => t.id),
        type: 'pomodoro',
        breakDuration: this.options.defaultBreakDuration
      });
    }
    
    // Create shallow work blocks (2-3 tasks per block)
    for (let i = 0; i < shallowTasks.length; i += 3) {
      if (slotIndex >= availableSlots.length) break;
      
      const taskGroup = shallowTasks.slice(i, i + 3);
      const slot = availableSlots[slotIndex++];
      
      blocks.push({
        id: `shallow-block-${blockId++}`,
        startTime: slot.startTime,
        duration: this.calculateGroupDuration(taskGroup),
        taskIds: taskGroup.map(t => t.id),
        type: 'pomodoro',
        breakDuration: this.options.defaultBreakDuration
      });
    }
    
    const scheduledTaskIds = new Set(blocks.flatMap(b => b.taskIds));
    const unscheduledTasks = tasks.filter(t => !scheduledTaskIds.has(t.id));
    
    if (unscheduledTasks.length > 0) {
      conflicts.push(`${unscheduledTasks.length} tasks could not be grouped efficiently`);
    }
    
    const score = this.calculateScheduleScore(blocks, tasks, 'context-grouped');
    
    return {
      blocks,
      score,
      reasoning,
      conflicts
    };
  }

  /**
   * Get available time slots for scheduling
   */
  private getAvailableTimeSlots(date: Date): { startTime: Date; endTime: Date }[] {
    const slots: { startTime: Date; endTime: Date }[] = [];
    
    const workStart = this.parseTime(this.options.workingHours.start);
    const workEnd = this.parseTime(this.options.workingHours.end);
    
    let currentTime = new Date(date);
    currentTime.setHours(workStart.hours, workStart.minutes, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(workEnd.hours, workEnd.minutes, 0, 0);
    
    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + this.options.defaultBlockDuration * 60000);
      
      if (slotEnd <= endTime && !this.hasCalendarConflict(currentTime, slotEnd)) {
        slots.push({
          startTime: new Date(currentTime),
          endTime: slotEnd
        });
      }
      
      // Move to next slot (block + break + buffer)
      const nextSlotTime = this.options.defaultBlockDuration + 
                          this.options.defaultBreakDuration + 
                          this.options.bufferTime;
      currentTime = new Date(currentTime.getTime() + nextSlotTime * 60000);
    }
    
    return slots;
  }

  /**
   * Check if time is in peak work window
   */
  private isInPeakWindow(time: Date): boolean {
    const peakStart = this.parseTime(this.options.peakWindow.start);
    const peakEnd = this.parseTime(this.options.peakWindow.end);
    
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    const peakStartMinutes = peakStart.hours * 60 + peakStart.minutes;
    const peakEndMinutes = peakEnd.hours * 60 + peakEnd.minutes;
    
    return timeInMinutes >= peakStartMinutes && timeInMinutes < peakEndMinutes;
  }

  /**
   * Check for calendar conflicts
   */
  private hasCalendarConflict(startTime: Date, endTime: Date): boolean {
    return this.calendarEvents.some(event => {
      return startTime < event.endTime && endTime > event.startTime;
    });
  }

  /**
   * Calculate optimal duration for a task
   */
  private calculateOptimalDuration(task: Task): number {
    // Base duration on task properties
    let duration = this.options.defaultBlockDuration;
    
    // Adjust for estimated duration
    if (task.estimatedDuration) {
      duration = Math.min(task.estimatedDuration, 50); // Cap at 50 minutes
    }
    
    // Deep work tasks get longer blocks
    if (task.context === '@deep') {
      duration = Math.max(duration, 25);
    }
    
    // High importance tasks get more time
    if (task.importance === 'high') {
      duration += 10;
    }
    
    return Math.min(duration, 50); // Maximum 50 minutes per block
  }

  /**
   * Calculate duration for a group of tasks
   */
  private calculateGroupDuration(tasks: Task[]): number {
    const totalEstimated = tasks.reduce((sum, task) => sum + (task.estimatedDuration || 15), 0);
    return Math.min(totalEstimated, 50); // Cap at 50 minutes
  }

  /**
   * Calculate score for a schedule
   */
  private calculateScheduleScore(blocks: FocusBlock[], tasks: Task[], strategy: string): number {
    let score = 0;
    
    // Base score for number of scheduled tasks
    const scheduledTaskIds = new Set(blocks.flatMap(b => b.taskIds));
    score += (scheduledTaskIds.size / tasks.length) * 40;
    
    // Bonus for meeting minimum blocks requirement
    if (blocks.length >= this.options.minBlocksPerDay) {
      score += 20;
    }
    
    // Strategy-specific scoring
    switch (strategy) {
      case 'peak-priority':
        // Bonus for deep work in peak hours
        const peakBlocks = blocks.filter(b => this.isInPeakWindow(b.startTime));
        const deepTasksInPeak = peakBlocks.filter(b => 
          b.taskIds.some(id => tasks.find(t => t.id === id)?.context === '@deep')
        );
        score += (deepTasksInPeak.length / Math.max(1, peakBlocks.length)) * 30;
        break;
        
      case 'balanced':
        // Bonus for even distribution
        const timeSpread = this.calculateTimeSpread(blocks);
        score += Math.min(timeSpread / 60, 10); // Up to 10 points for 6+ hour spread
        break;
        
      case 'context-grouped':
        // Bonus for context consistency within blocks
        const contextConsistency = this.calculateContextConsistency(blocks, tasks);
        score += contextConsistency * 20;
        break;
    }
    
    // Penalty for conflicts
    const conflicts = this.detectScheduleConflicts(blocks);
    score -= conflicts.length * 5;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate time spread of blocks (in minutes)
   */
  private calculateTimeSpread(blocks: FocusBlock[]): number {
    if (blocks.length === 0) return 0;
    
    const times = blocks.map(b => b.startTime.getTime());
    const earliest = Math.min(...times);
    const latest = Math.max(...times);
    
    return (latest - earliest) / (1000 * 60); // Convert to minutes
  }

  /**
   * Calculate context consistency within blocks
   */
  private calculateContextConsistency(blocks: FocusBlock[], tasks: Task[]): number {
    if (blocks.length === 0) return 0;
    
    let consistentBlocks = 0;
    
    for (const block of blocks) {
      const blockTasks = block.taskIds.map(id => tasks.find(t => t.id === id)).filter(Boolean) as Task[];
      if (blockTasks.length <= 1) {
        consistentBlocks++;
        continue;
      }
      
      const contexts = new Set(blockTasks.map(t => t.context));
      if (contexts.size === 1) {
        consistentBlocks++;
      }
    }
    
    return consistentBlocks / blocks.length;
  }

  /**
   * Detect conflicts in a schedule
   */
  private detectScheduleConflicts(blocks: FocusBlock[]): string[] {
    const conflicts: string[] = [];
    
    // Check for overlapping blocks
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const block1 = blocks[i];
        const block2 = blocks[j];
        
        const end1 = new Date(block1.startTime.getTime() + block1.duration * 60000);
        const end2 = new Date(block2.startTime.getTime() + block2.duration * 60000);
        
        if (block1.startTime < end2 && block2.startTime < end1) {
          conflicts.push(`Blocks ${block1.id} and ${block2.id} overlap`);
        }
      }
    }
    
    // Check for calendar conflicts
    for (const block of blocks) {
      const blockEnd = new Date(block.startTime.getTime() + block.duration * 60000);
      if (this.hasCalendarConflict(block.startTime, blockEnd)) {
        conflicts.push(`Block ${block.id} conflicts with calendar event`);
      }
    }
    
    return conflicts;
  }

  /**
   * Validate a schedule against constraints
   */
  validateSchedule(blocks: FocusBlock[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check minimum blocks
    if (blocks.length < this.options.minBlocksPerDay) {
      errors.push(`Schedule must have at least ${this.options.minBlocksPerDay} focus blocks`);
    }
    
    // Check maximum blocks
    if (blocks.length > this.options.maxBlocksPerDay) {
      errors.push(`Schedule cannot exceed ${this.options.maxBlocksPerDay} focus blocks`);
    }
    
    // Check for conflicts
    const conflicts = this.detectScheduleConflicts(blocks);
    errors.push(...conflicts);
    
    // Check working hours
    for (const block of blocks) {
      if (!this.isWithinWorkingHours(block.startTime)) {
        errors.push(`Block ${block.id} is outside working hours`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if time is within working hours
   */
  private isWithinWorkingHours(time: Date): boolean {
    const workStart = this.parseTime(this.options.workingHours.start);
    const workEnd = this.parseTime(this.options.workingHours.end);
    
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    const workStartMinutes = workStart.hours * 60 + workStart.minutes;
    const workEndMinutes = workEnd.hours * 60 + workEnd.minutes;
    
    return timeInMinutes >= workStartMinutes && timeInMinutes < workEndMinutes;
  }

  /**
   * Parse time string (HH:MM) to hours and minutes
   */
  private parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  /**
   * Update scheduling options
   */
  updateOptions(newOptions: Partial<SchedulingOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current scheduling options
   */
  getOptions(): SchedulingOptions {
    return { ...this.options };
  }
}