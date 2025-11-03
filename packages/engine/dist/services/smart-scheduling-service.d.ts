/**
 * Smart Scheduling Service
 *
 * Advanced algorithms for optimal focus block placement including:
 * - Calendar integration and conflict detection
 * - Workload balancing across time periods
 * - Machine learning-based optimization
 * - Context-aware scheduling
 */
import { Task, TimeRange } from '../types/ritual.js';
import { CalendarEvent, SchedulingSuggestion } from './schedule-service.js';
export interface SchedulingContext {
    userEnergyLevels: EnergyLevel[];
    historicalPerformance: PerformanceData[];
    workloadConstraints: WorkloadConstraints;
    environmentalFactors: EnvironmentalFactors;
}
export interface EnergyLevel {
    timeSlot: TimeRange;
    energyScore: number;
    focusCapability: 'high' | 'medium' | 'low';
    preferredTaskTypes: string[];
}
export interface PerformanceData {
    date: Date;
    timeSlot: TimeRange;
    taskType: string;
    completionRate: number;
    qualityScore: number;
    interruptionCount: number;
}
export interface WorkloadConstraints {
    maxConsecutiveBlocks: number;
    requiredBreakDuration: number;
    maxDailyFocusTime: number;
    preferredBlockSizes: number[];
    contextSwitchPenalty: number;
}
export interface EnvironmentalFactors {
    meetingDensity: number;
    interruptionLikelihood: number;
    noiseLevel: 'low' | 'medium' | 'high';
    collaborationRequirements: string[];
}
export interface OptimizationWeights {
    energyAlignment: number;
    calendarFit: number;
    workloadBalance: number;
    contextGrouping: number;
    historicalPerformance: number;
    taskPriority: number;
}
export declare class SmartSchedulingService {
    private context;
    private weights;
    private calendarEvents;
    constructor(context?: Partial<SchedulingContext>, weights?: Partial<OptimizationWeights>);
    /**
     * Generate optimized schedule using advanced algorithms
     */
    generateOptimizedSchedule(tasks: Task[], date: Date, availableSlots: TimeSlot[]): SchedulingSuggestion;
    /**
     * Analyze tasks to understand scheduling requirements
     */
    private analyzeTasks;
    /**
     * Score time slots for each task based on multiple factors
     */
    private scoreTimeSlots;
    /**
     * Calculate comprehensive score for a task-slot combination
     */
    private calculateSlotScore;
    /**
     * Score how well task energy requirements match slot energy levels
     */
    private scoreEnergyAlignment;
    /**
     * Score calendar fit (avoiding conflicts, respecting buffers)
     */
    private scoreCalendarFit;
    /**
     * Score based on historical performance data
     */
    private scoreHistoricalPerformance;
    /**
     * Genetic algorithm optimization for task-slot assignment
     */
    private geneticAlgorithmOptimization;
    /**
     * Apply workload balancing to prevent overloading time periods
     */
    private applyWorkloadBalancing;
    /**
     * Resolve conflicts and validate final schedule
     */
    private resolveConflictsAndValidate;
    /**
     * Get default energy levels based on common patterns
     */
    private getDefaultEnergyLevels;
    /**
     * Calculate task complexity score
     */
    private calculateComplexityScore;
    /**
     * Calculate energy requirement for task
     */
    private calculateEnergyRequirement;
    /**
     * Update scheduling context with new data
     */
    updateContext(newContext: Partial<SchedulingContext>): void;
    /**
     * Update optimization weights
     */
    updateWeights(newWeights: Partial<OptimizationWeights>): void;
    /**
     * Set calendar events for conflict detection
     */
    setCalendarEvents(events: CalendarEvent[]): void;
    /**
     * Get current scheduling context
     */
    getContext(): SchedulingContext;
    /**
     * Get current optimization weights
     */
    getWeights(): OptimizationWeights;
    private parseTime;
    private getUserEnergyLevel;
    private findOptimalTimeSlots;
    private analyzeDependencies;
    private calculateContextSwitchCost;
    private calculateInterruptionSensitivity;
    private scoreContextOptimality;
    private scoreWorkloadBalance;
    private scorePriorityAlignment;
    private findNearestEventDistance;
    private calculateMeetingDensity;
    private isTimeSlotSimilar;
    private initializePopulation;
    private evaluateFitness;
    private selectElite;
    private tournamentSelection;
    private crossover;
    private mutate;
    private findAlternativeSlot;
    private findSlotById;
    private calculateOverallScore;
    private validateFinalSchedule;
}
interface TimeSlot {
    id: string;
    startTime: string;
    endTime: string;
    duration: number;
}
export {};
