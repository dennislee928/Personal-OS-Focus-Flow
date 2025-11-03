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
export declare class DueDatePicker {
    private delegationService;
    private config;
    private state;
    constructor(delegationService: DelegationService, config?: Partial<DueDatePickerConfig>);
    /**
     * Initialize picker for a specific item
     */
    initializeForItem(item: InboxItem): Promise<DueDatePickerState>;
    /**
     * Get current picker state
     */
    getState(): DueDatePickerState;
    /**
     * Select a date directly
     */
    selectDate(date: Date): DueDatePickerState;
    /**
     * Select a deferral template
     */
    selectTemplate(templateId: string): DueDatePickerState;
    /**
     * Select a quick option
     */
    selectQuickOption(optionId: string): DueDatePickerState;
    /**
     * Navigate calendar to different month
     */
    navigateCalendar(direction: 'previous' | 'next'): DueDatePickerState;
    /**
     * Set calendar to specific month/year
     */
    setCalendarMonth(year: number, month: number): DueDatePickerState;
    /**
     * Toggle custom date mode
     */
    toggleCustomDateMode(): DueDatePickerState;
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
    }>;
    /**
     * Validate current selection
     */
    validateSelection(): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Get selected date
     */
    getSelectedDate(): Date | null;
    /**
     * Get selected template
     */
    getSelectedTemplate(): DeferralTemplate | null;
    /**
     * Clear selection
     */
    clearSelection(): DueDatePickerState;
    /**
     * Reset picker state
     */
    reset(): DueDatePickerState;
    private initializeOptions;
    private generateQuickOptions;
    private suggestDefaultOption;
    private isValidDate;
    private isWorkingDay;
    private getNextWorkingDay;
    private adjustToWorkingDay;
    private isSameDay;
}
