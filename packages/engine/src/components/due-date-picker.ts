/**
 * Due Date Picker Component - Interface for selecting due dates during deferral
 */

import { DeferralTemplate, DelegationService } from '../services/delegation-service.js';
import { InboxItem } from '../types/ritual.js';

export interface DueDatePickerConfig {
  showTemplates: boolean;
  showCalendar: boolean;
  enableQuickOptions: boolean;
  enableCustomDate: boolean;
  minDate?: Date;
  maxDate?: Date;
  workingDaysOnly: boolean;
}

export interface DueDatePickerState {
  selectedDate: Date | null;
  selectedTemplate: DeferralTemplate | null;
  availableTemplates: DeferralTemplate[];
  quickOptions: QuickDateOption[];
  calendarMonth: Date;
  isCustomDateMode: boolean;
  error: string | null;
}

export interface QuickDateOption {
  id: string;
  label: string;
  date: Date;
  description?: string;
  isWorkingDay: boolean;
}

export class DueDatePicker {
  private delegationService: DelegationService;
  private config: DueDatePickerConfig;
  private state: DueDatePickerState;

  constructor(delegationService: DelegationService, config: Partial<DueDatePickerConfig> = {}) {
    this.delegationService = delegationService;
    this.config = {
      showTemplates: true,
      showCalendar: true,
      enableQuickOptions: true,
      enableCustomDate: true,
      workingDaysOnly: false,
      ...config
    };

    const now = new Date();
    this.state = {
      selectedDate: null,
      selectedTemplate: null,
      availableTemplates: [],
      quickOptions: [],
      calendarMonth: new Date(now.getFullYear(), now.getMonth(), 1),
      isCustomDateMode: false,
      error: null
    };

    this.initializeOptions();
  }

  /**
   * Initialize picker for a specific item
   */
  async initializeForItem(item: InboxItem): Promise<DueDatePickerState> {
    try {
      // Load deferral templates
      this.state.availableTemplates = this.delegationService.getDeferralTemplates();

      // Generate quick options
      this.generateQuickOptions();

      // Suggest default based on item context
      this.suggestDefaultOption(item);

      this.state.error = null;
    } catch (error) {
      this.state.error = (error as Error).message;
    }

    return this.getState();
  }

  /**
   * Get current picker state
   */
  getState(): DueDatePickerState {
    return { ...this.state };
  }

  /**
   * Select a date directly
   */
  selectDate(date: Date): DueDatePickerState {
    if (!this.isValidDate(date)) {
      this.state.error = 'Selected date is not valid';
      return this.getState();
    }

    this.state.selectedDate = new Date(date);
    this.state.selectedTemplate = null;
    this.state.isCustomDateMode = true;
    this.state.error = null;

    return this.getState();
  }

  /**
   * Select a deferral template
   */
  selectTemplate(templateId: string): DueDatePickerState {
    const template = this.state.availableTemplates.find(t => t.id === templateId);
    if (!template) {
      this.state.error = 'Template not found';
      return this.getState();
    }

    this.state.selectedTemplate = template;
    
    // Calculate date based on template
    const date = new Date();
    date.setDate(date.getDate() + template.defaultDuration);
    
    // Adjust for working days if needed
    if (this.config.workingDaysOnly) {
      const adjustedDate = this.adjustToWorkingDay(date);
      this.state.selectedDate = adjustedDate;
    } else {
      this.state.selectedDate = date;
    }
    this.state.isCustomDateMode = false;
    this.state.error = null;

    return this.getState();
  }

  /**
   * Select a quick option
   */
  selectQuickOption(optionId: string): DueDatePickerState {
    const option = this.state.quickOptions.find(o => o.id === optionId);
    if (!option) {
      this.state.error = 'Quick option not found';
      return this.getState();
    }

    this.state.selectedDate = new Date(option.date);
    this.state.selectedTemplate = null;
    this.state.isCustomDateMode = false;
    this.state.error = null;

    return this.getState();
  }

  /**
   * Navigate calendar to different month
   */
  navigateCalendar(direction: 'previous' | 'next'): DueDatePickerState {
    const currentMonth = this.state.calendarMonth;
    
    if (direction === 'previous') {
      this.state.calendarMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    } else {
      this.state.calendarMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }

    return this.getState();
  }

  /**
   * Set calendar to specific month/year
   */
  setCalendarMonth(year: number, month: number): DueDatePickerState {
    this.state.calendarMonth = new Date(year, month, 1);
    return this.getState();
  }

  /**
   * Toggle custom date mode
   */
  toggleCustomDateMode(): DueDatePickerState {
    this.state.isCustomDateMode = !this.state.isCustomDateMode;
    
    if (!this.state.isCustomDateMode) {
      // Reset to template-based selection
      this.state.selectedTemplate = null;
    }

    return this.getState();
  }

  /**
   * Get calendar days for current month
   */
  getCalendarDays(): Array<{
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    isDisabled: boolean;
    isWorkingDay: boolean;
  }> {
    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
      isWorkingDay: boolean;
    }> = [];

    const currentMonth = this.state.calendarMonth;
    const today = new Date();
    const selectedDate = this.state.selectedDate;

    // Get first day of month and calculate start of calendar grid
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const startOfGrid = new Date(firstDay);
    startOfGrid.setDate(startOfGrid.getDate() - firstDay.getDay()); // Start on Sunday

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startOfGrid);
      date.setDate(startOfGrid.getDate() + i);

      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
      const isToday = this.isSameDay(date, today);
      const isSelected = selectedDate ? this.isSameDay(date, selectedDate) : false;
      const isDisabled = !this.isValidDate(date);
      const isWorkingDay = this.isWorkingDay(date);

      days.push({
        date: new Date(date),
        isCurrentMonth,
        isToday,
        isSelected,
        isDisabled,
        isWorkingDay
      });
    }

    return days;
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

    if (!this.state.selectedDate) {
      errors.push('Please select a due date');
      return { isValid: false, errors, warnings };
    }

    if (!this.isValidDate(this.state.selectedDate)) {
      errors.push('Selected date is not valid');
      return { isValid: false, errors, warnings };
    }

    // Check if date is too far in the future
    const daysDiff = Math.ceil((this.state.selectedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      warnings.push('Due date is more than a year in the future');
    }

    // Check if date is on a weekend (if working days preferred)
    if (this.config.workingDaysOnly && !this.isWorkingDay(this.state.selectedDate)) {
      warnings.push('Selected date is not a working day');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get selected date
   */
  getSelectedDate(): Date | null {
    return this.state.selectedDate ? new Date(this.state.selectedDate) : null;
  }

  /**
   * Get selected template
   */
  getSelectedTemplate(): DeferralTemplate | null {
    return this.state.selectedTemplate;
  }

  /**
   * Clear selection
   */
  clearSelection(): DueDatePickerState {
    this.state.selectedDate = null;
    this.state.selectedTemplate = null;
    this.state.isCustomDateMode = false;
    this.state.error = null;

    return this.getState();
  }

  /**
   * Reset picker state
   */
  reset(): DueDatePickerState {
    const now = new Date();
    this.state = {
      selectedDate: null,
      selectedTemplate: null,
      availableTemplates: this.state.availableTemplates, // Keep loaded templates
      quickOptions: this.state.quickOptions, // Keep generated options
      calendarMonth: new Date(now.getFullYear(), now.getMonth(), 1),
      isCustomDateMode: false,
      error: null
    };

    return this.getState();
  }

  private initializeOptions(): void {
    this.generateQuickOptions();
  }

  private generateQuickOptions(): void {
    const options: QuickDateOption[] = [];
    const today = new Date();

    // Tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    options.push({
      id: 'tomorrow',
      label: 'Tomorrow',
      date: tomorrow,
      description: tomorrow.toLocaleDateString(),
      isWorkingDay: this.isWorkingDay(tomorrow)
    });

    // Next working day
    const nextWorkingDay = this.getNextWorkingDay(today);
    if (!this.isSameDay(nextWorkingDay, tomorrow)) {
      options.push({
        id: 'next-working-day',
        label: 'Next Working Day',
        date: nextWorkingDay,
        description: nextWorkingDay.toLocaleDateString(),
        isWorkingDay: true
      });
    }

    // Next week
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    options.push({
      id: 'next-week',
      label: 'Next Week',
      date: nextWeek,
      description: nextWeek.toLocaleDateString(),
      isWorkingDay: this.isWorkingDay(nextWeek)
    });

    // Next month
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    options.push({
      id: 'next-month',
      label: 'Next Month',
      date: nextMonth,
      description: nextMonth.toLocaleDateString(),
      isWorkingDay: this.isWorkingDay(nextMonth)
    });

    this.state.quickOptions = options;
  }

  private suggestDefaultOption(item: InboxItem): void {
    // Suggest based on item context and tags
    const hasDeepTag = item.tags.includes('deep') || item.tags.includes('@deep');
    const hasUrgentTag = item.tags.includes('urgent');

    if (hasUrgentTag) {
      // Suggest tomorrow for urgent items
      this.selectQuickOption('tomorrow');
    } else if (hasDeepTag) {
      // Suggest next week for deep work items
      this.selectQuickOption('next-week');
    } else {
      // Default to next working day
      this.selectQuickOption('next-working-day');
    }
  }

  private isValidDate(date: Date): boolean {
    const now = new Date();
    
    // Must be in the future
    if (date <= now) {
      return false;
    }

    // Check against min/max dates if configured
    if (this.config.minDate && date < this.config.minDate) {
      return false;
    }

    if (this.config.maxDate && date > this.config.maxDate) {
      return false;
    }

    return true;
  }

  private isWorkingDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
  }

  private getNextWorkingDay(fromDate: Date): Date {
    const date = new Date(fromDate);
    date.setDate(date.getDate() + 1);

    while (!this.isWorkingDay(date)) {
      date.setDate(date.getDate() + 1);
    }

    return date;
  }

  private adjustToWorkingDay(date: Date): Date {
    if (this.isWorkingDay(date)) {
      return date;
    }

    // If weekend, move to next Monday
    const adjusted = new Date(date);
    while (!this.isWorkingDay(adjusted)) {
      adjusted.setDate(adjusted.getDate() + 1);
    }

    return adjusted;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
}