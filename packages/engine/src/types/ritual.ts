/**
 * Core types for the Daily Start Ritual system
 */

export enum RitualStep {
  CAPTURE = 'capture',
  CLARIFY = 'clarify',
  SELECT = 'select',
  SCHEDULE = 'schedule',
  START = 'start'
}

export interface TimeRange {
  start: string; // HH:MM format
  end: string;   // HH:MM format
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
  duration: number; // minutes
  taskIds: string[];
  type: 'pomodoro' | 'custom';
  breakDuration: number;
}

export interface RitualMetrics {
  totalDuration: number; // minutes
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
  
  capturedItems: string[]; // Task IDs
  clarifiedItems: ClarifyDecision[];
  selectedTasks: string[]; // Ivy-6 task IDs in priority order
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
  averageEntryTime: number; // milliseconds
  keyboardShortcutsUsed: number;
  voiceEntriesCount: number;
  autocompleteUsed: number;
}

export interface RitualState {
  current: DailyRitual | null;
  history: DailyRitual[];
  preferences: RitualPreferences;
  
  // Transient state
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