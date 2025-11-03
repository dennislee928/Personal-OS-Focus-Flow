/**
 * Core types for the Daily Start Ritual system
 */
export declare enum RitualStep {
    CAPTURE = "capture",
    CLARIFY = "clarify",
    SELECT = "select",
    SCHEDULE = "schedule",
    START = "start"
}
export interface TimeRange {
    start: string;
    end: string;
}
export interface ClarifyDecision {
    itemId: string;
    action: 'do' | 'delegate' | 'defer';
    assignee?: string;
    dueDate?: Date;
    estimatedDuration: number;
    context: '@deep' | '@shallow';
}
export interface FocusBlock {
    id: string;
    startTime: Date;
    duration: number;
    taskIds: string[];
    type: 'pomodoro' | 'custom';
    breakDuration: number;
}
export interface RitualMetrics {
    totalDuration: number;
    stepDurations: Record<RitualStep, number>;
    itemsCaptured: number;
    itemsClarified: number;
    blocksScheduled: number;
    keyboardShortcutsUsed: number;
}
export interface DailyRitual {
    id: string;
    date: Date;
    startTime: Date;
    completionTime?: Date;
    status: 'in_progress' | 'completed' | 'cancelled';
    capturedItems: string[];
    clarifiedItems: ClarifyDecision[];
    selectedTasks: string[];
    scheduledBlocks: FocusBlock[];
    metrics: RitualMetrics;
}
export interface RitualPreferences {
    autoAdvanceSteps: boolean;
    showTimeReminders: boolean;
    defaultBlockDuration: number;
    peakWorkWindow: TimeRange;
    keyboardShortcuts: Record<string, string>;
}
export interface InboxItem {
    id: string;
    content: string;
    createdAt: Date;
    source: 'manual' | 'voice' | 'import';
    tags: string[];
    estimatedDuration?: number;
    priority?: number;
}
export interface TaskSuggestion {
    text: string;
    frequency: number;
    lastUsed: Date;
    tags: string[];
}
export interface CaptureMetrics {
    entriesCount: number;
    averageEntryTime: number;
    keyboardShortcutsUsed: number;
    voiceEntriesCount: number;
    autocompleteUsed: number;
}
export interface RitualState {
    current: DailyRitual | null;
    history: DailyRitual[];
    preferences: RitualPreferences;
    currentStep: RitualStep;
    stepStartTime: Date;
    pendingItems: InboxItem[];
    selectedTaskIds: string[];
    draftSchedule: FocusBlock[];
}
export interface RitualSummary {
    ritualId: string;
    completionTime: Date;
    totalDuration: number;
    selectedTasks: string[];
    scheduledBlocks: FocusBlock[];
    metrics: RitualMetrics;
}
export interface Task {
    id: string;
    title: string;
    description?: string;
    dueDate?: Date;
    importance: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    context: '@deep' | '@shallow';
    dependencies: string[];
    estimatedDuration: number;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface TaskPriorityScore {
    taskId: string;
    score: number;
    factors: {
        dueDateUrgency: number;
        importance: number;
        effort: number;
        contextBalance: number;
        dependencies: number;
    };
}
export interface TaskSelectionState {
    availableTasks: Task[];
    selectedTaskIds: string[];
    priorityScores: TaskPriorityScore[];
    remainingSlots: number;
    validationErrors: string[];
    suggestions: Task[];
}
export interface TaskSelectionConstraints {
    maxTasks: 6;
    minTasks: 1;
    maxDeepWorkTasks: 4;
    maxShallowTasks: 4;
    maxDailyEffort: number;
}
