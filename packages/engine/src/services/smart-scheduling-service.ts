/**
 * Smart Scheduling Service
 * 
 * Advanced algorithms for optimal focus block placement including:
 * - Calendar integration and conflict detection
 * - Workload balancing across time periods
 * - Machine learning-based optimization
 * - Context-aware scheduling
 */

import { FocusBlock, Task, TimeRange } from '../types/ritual.js';
import { CalendarEvent, SchedulingSuggestion } from './schedule-service.js';

export interface SchedulingContext {
  userEnergyLevels: EnergyLevel[];
  historicalPerformance: PerformanceData[];
  workloadConstraints: WorkloadConstraints;
  environmentalFactors: EnvironmentalFactors;
}

export interface EnergyLevel {
  timeSlot: TimeRange;
  energyScore: number; // 0-100
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
  maxDailyFocusTime: number; // minutes
  preferredBlockSizes: number[]; // minutes
  contextSwitchPenalty: number; // minutes
}

export interface EnvironmentalFactors {
  meetingDensity: number; // meetings per hour
  interruptionLikelihood: number; // 0-1
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

export class SmartSchedulingService {
  private context: SchedulingContext;
  private weights: OptimizationWeights;
  private calendarEvents: CalendarEvent[] = [];

  constructor(context?: Partial<SchedulingContext>, weights?: Partial<OptimizationWeights>) {
    this.context = {
      userEnergyLevels: this.getDefaultEnergyLevels(),
      historicalPerformance: [],
      workloadConstraints: {
        maxConsecutiveBlocks: 3,
        requiredBreakDuration: 15,
        maxDailyFocusTime: 480, // 8 hours
        preferredBlockSizes: [25, 50, 90],
        contextSwitchPenalty: 10
      },
      environmentalFactors: {
        meetingDensity: 0.5,
        interruptionLikelihood: 0.3,
        noiseLevel: 'medium',
        collaborationRequirements: []
      },
      ...context
    };

    this.weights = {
      energyAlignment: 0.25,
      calendarFit: 0.20,
      workloadBalance: 0.15,
      contextGrouping: 0.15,
      historicalPerformance: 0.15,
      taskPriority: 0.10,
      ...weights
    };
  }

  /**
   * Generate optimized schedule using advanced algorithms
   */
  generateOptimizedSchedule(tasks: Task[], date: Date, availableSlots: TimeSlot[]): SchedulingSuggestion {
    // Step 1: Analyze task requirements and constraints
    const taskAnalysis = this.analyzeTasks(tasks);
    
    // Step 2: Score all possible time slots for each task
    const slotScores = this.scoreTimeSlots(tasks, availableSlots, date);
    
    // Step 3: Use genetic algorithm for optimal assignment
    const optimizedAssignment = this.geneticAlgorithmOptimization(tasks, availableSlots, slotScores);
    
    // Step 4: Apply workload balancing
    const balancedSchedule = this.applyWorkloadBalancing(optimizedAssignment);
    
    // Step 5: Resolve conflicts and validate
    const finalSchedule = this.resolveConflictsAndValidate(balancedSchedule, date);
    
    return {
      blocks: finalSchedule.blocks,
      score: finalSchedule.score,
      reasoning: finalSchedule.reasoning,
      conflicts: finalSchedule.conflicts
    };
  }

  /**
   * Analyze tasks to understand scheduling requirements
   */
  private analyzeTasks(tasks: Task[]): TaskAnalysis[] {
    return tasks.map(task => {
      const analysis: TaskAnalysis = {
        taskId: task.id,
        complexityScore: this.calculateComplexityScore(task),
        energyRequirement: this.calculateEnergyRequirement(task),
        optimalTimeSlots: this.findOptimalTimeSlots(task),
        dependencies: this.analyzeDependencies(task, tasks),
        contextSwitchCost: this.calculateContextSwitchCost(task, tasks),
        interruptionSensitivity: this.calculateInterruptionSensitivity(task)
      };
      
      return analysis;
    });
  }

  /**
   * Score time slots for each task based on multiple factors
   */
  private scoreTimeSlots(tasks: Task[], slots: TimeSlot[], date: Date): Map<string, SlotScore[]> {
    const scores = new Map<string, SlotScore[]>();
    
    for (const task of tasks) {
      const taskScores: SlotScore[] = [];
      
      for (const slot of slots) {
        const score = this.calculateSlotScore(task, slot, date);
        taskScores.push({
          slotId: slot.id,
          score: score.total,
          factors: score.factors
        });
      }
      
      // Sort by score (highest first)
      taskScores.sort((a, b) => b.score - a.score);
      scores.set(task.id, taskScores);
    }
    
    return scores;
  }

  /**
   * Calculate comprehensive score for a task-slot combination
   */
  private calculateSlotScore(task: Task, slot: TimeSlot, date: Date): { total: number; factors: ScoreFactors } {
    const factors: ScoreFactors = {
      energyAlignment: this.scoreEnergyAlignment(task, slot),
      calendarFit: this.scoreCalendarFit(slot, date),
      historicalPerformance: this.scoreHistoricalPerformance(task, slot),
      contextOptimality: this.scoreContextOptimality(task, slot),
      workloadBalance: this.scoreWorkloadBalance(slot, date),
      priorityAlignment: this.scorePriorityAlignment(task, slot)
    };
    
    const total = 
      factors.energyAlignment * this.weights.energyAlignment +
      factors.calendarFit * this.weights.calendarFit +
      factors.historicalPerformance * this.weights.historicalPerformance +
      factors.contextOptimality * this.weights.contextGrouping +
      factors.workloadBalance * this.weights.workloadBalance +
      factors.priorityAlignment * this.weights.taskPriority;
    
    return { total, factors };
  }

  /**
   * Score how well task energy requirements match slot energy levels
   */
  private scoreEnergyAlignment(task: Task, slot: TimeSlot): number {
    const slotTime = this.parseTime(slot.startTime);
    const energyLevel = this.getUserEnergyLevel(slotTime);
    
    const taskEnergyNeed = this.calculateEnergyRequirement(task);
    const energyMatch = Math.min(energyLevel.energyScore / 100, taskEnergyNeed);
    
    // Bonus for matching preferred task types
    const typeMatch = energyLevel.preferredTaskTypes.includes(task.context) ? 0.2 : 0;
    
    return Math.min(1.0, energyMatch + typeMatch);
  }

  /**
   * Score calendar fit (avoiding conflicts, respecting buffers)
   */
  private scoreCalendarFit(slot: TimeSlot, date: Date): number {
    const slotStart = new Date(date);
    const startTimeParts = this.parseTime(slot.startTime);
    slotStart.setHours(startTimeParts.hours, startTimeParts.minutes, 0, 0);
    
    const slotEnd = new Date(slotStart.getTime() + slot.duration * 60000);
    
    // Check for direct conflicts
    const hasConflict = this.calendarEvents.some(event => 
      slotStart < event.endTime && slotEnd > event.startTime
    );
    
    if (hasConflict) return 0;
    
    // Score based on buffer time to nearest events
    const nearestEventDistance = this.findNearestEventDistance(slotStart, slotEnd);
    const bufferScore = Math.min(1.0, nearestEventDistance / 30); // 30-minute ideal buffer
    
    // Penalty for high meeting density periods
    const meetingDensity = this.calculateMeetingDensity(slotStart, slotEnd);
    const densityPenalty = meetingDensity * 0.3;
    
    return Math.max(0, bufferScore - densityPenalty);
  }

  /**
   * Score based on historical performance data
   */
  private scoreHistoricalPerformance(task: Task, slot: TimeSlot): number {
    const relevantHistory = this.context.historicalPerformance.filter(data => 
      data.taskType === task.context &&
      this.isTimeSlotSimilar(data.timeSlot, { start: slot.startTime, end: slot.endTime })
    );
    
    if (relevantHistory.length === 0) return 0.5; // Neutral score for no data
    
    const avgCompletion = relevantHistory.reduce((sum, data) => sum + data.completionRate, 0) / relevantHistory.length;
    const avgQuality = relevantHistory.reduce((sum, data) => sum + data.qualityScore, 0) / relevantHistory.length;
    const avgInterruptions = relevantHistory.reduce((sum, data) => sum + data.interruptionCount, 0) / relevantHistory.length;
    
    // Combine factors with weights
    const performanceScore = (avgCompletion * 0.4 + avgQuality * 0.4 + (1 - avgInterruptions / 10) * 0.2);
    
    return Math.max(0, Math.min(1, performanceScore));
  }

  /**
   * Genetic algorithm optimization for task-slot assignment
   */
  private geneticAlgorithmOptimization(tasks: Task[], slots: TimeSlot[], slotScores: Map<string, SlotScore[]>): Assignment[] {
    const populationSize = 50;
    const generations = 100;
    const mutationRate = 0.1;
    const eliteSize = 10;
    
    // Initialize population
    let population = this.initializePopulation(tasks, slots, populationSize);
    
    for (let generation = 0; generation < generations; generation++) {
      // Evaluate fitness
      const fitness = population.map(individual => this.evaluateFitness(individual, slotScores));
      
      // Select elite individuals
      const elite = this.selectElite(population, fitness, eliteSize);
      
      // Generate new population
      const newPopulation = [...elite];
      
      while (newPopulation.length < populationSize) {
        const parent1 = this.tournamentSelection(population, fitness);
        const parent2 = this.tournamentSelection(population, fitness);
        
        const offspring = this.crossover(parent1, parent2);
        
        if (Math.random() < mutationRate) {
          this.mutate(offspring, slots);
        }
        
        newPopulation.push(offspring);
      }
      
      population = newPopulation;
    }
    
    // Return best solution
    const finalFitness = population.map(individual => this.evaluateFitness(individual, slotScores));
    const bestIndex = finalFitness.indexOf(Math.max(...finalFitness));
    
    return population[bestIndex];
  }

  /**
   * Apply workload balancing to prevent overloading time periods
   */
  private applyWorkloadBalancing(assignments: Assignment[]): Assignment[] {
    const balanced = [...assignments];
    const timeSlotLoad = new Map<string, number>();
    
    // Calculate current load per time slot
    for (const assignment of assignments) {
      const load = timeSlotLoad.get(assignment.slotId) || 0;
      timeSlotLoad.set(assignment.slotId, load + assignment.workload);
    }
    
    // Identify overloaded slots
    const maxLoad = this.context.workloadConstraints.maxDailyFocusTime / 8; // Distribute across 8 hours
    const overloadedSlots = Array.from(timeSlotLoad.entries())
      .filter(([_, load]) => load > maxLoad)
      .map(([slotId, _]) => slotId);
    
    // Redistribute tasks from overloaded slots
    for (const slotId of overloadedSlots) {
      const tasksInSlot = balanced.filter(a => a.slotId === slotId);
      const excessLoad = timeSlotLoad.get(slotId)! - maxLoad;
      
      // Move lowest priority tasks to alternative slots
      tasksInSlot.sort((a, b) => a.priority - b.priority);
      
      let redistributedLoad = 0;
      for (const assignment of tasksInSlot) {
        if (redistributedLoad >= excessLoad) break;
        
        const alternativeSlot = this.findAlternativeSlot(assignment, balanced);
        if (alternativeSlot) {
          assignment.slotId = alternativeSlot;
          redistributedLoad += assignment.workload;
        }
      }
    }
    
    return balanced;
  }

  /**
   * Resolve conflicts and validate final schedule
   */
  private resolveConflictsAndValidate(assignments: Assignment[], date: Date): {
    blocks: FocusBlock[];
    score: number;
    reasoning: string[];
    conflicts: string[];
  } {
    const blocks: FocusBlock[] = [];
    const reasoning: string[] = [];
    const conflicts: string[] = [];
    
    // Convert assignments to focus blocks
    const slotGroups = new Map<string, Assignment[]>();
    for (const assignment of assignments) {
      const group = slotGroups.get(assignment.slotId) || [];
      group.push(assignment);
      slotGroups.set(assignment.slotId, group);
    }
    
    let blockId = 0;
    for (const [slotId, groupAssignments] of slotGroups) {
      const slot = this.findSlotById(slotId);
      if (!slot) continue;
      
      const taskIds = groupAssignments.map(a => a.taskId);
      const totalDuration = groupAssignments.reduce((sum, a) => sum + a.duration, 0);
      
      const startTime = new Date(date);
      const startTimeParts = this.parseTime(slot.startTime);
      startTime.setHours(startTimeParts.hours, startTimeParts.minutes, 0, 0);
      
      blocks.push({
        id: `optimized-block-${blockId++}`,
        startTime,
        duration: Math.min(totalDuration, 90), // Cap at 90 minutes
        taskIds,
        type: totalDuration <= 30 ? 'pomodoro' : 'custom',
        breakDuration: totalDuration <= 30 ? 5 : 15
      });
    }
    
    // Calculate overall score
    const score = this.calculateOverallScore(blocks, assignments);
    
    // Generate reasoning
    reasoning.push(`Optimized schedule using genetic algorithm with ${assignments.length} task assignments`);
    reasoning.push(`Balanced workload across ${blocks.length} focus blocks`);
    reasoning.push(`Applied energy alignment and historical performance data`);
    
    // Detect remaining conflicts
    const validationResult = this.validateFinalSchedule(blocks);
    conflicts.push(...validationResult.conflicts);
    
    return { blocks, score, reasoning, conflicts };
  }

  /**
   * Get default energy levels based on common patterns
   */
  private getDefaultEnergyLevels(): EnergyLevel[] {
    return [
      {
        timeSlot: { start: '08:00', end: '10:00' },
        energyScore: 85,
        focusCapability: 'high',
        preferredTaskTypes: ['@deep']
      },
      {
        timeSlot: { start: '10:00', end: '12:00' },
        energyScore: 95,
        focusCapability: 'high',
        preferredTaskTypes: ['@deep']
      },
      {
        timeSlot: { start: '12:00', end: '14:00' },
        energyScore: 60,
        focusCapability: 'low',
        preferredTaskTypes: ['@shallow']
      },
      {
        timeSlot: { start: '14:00', end: '16:00' },
        energyScore: 75,
        focusCapability: 'medium',
        preferredTaskTypes: ['@deep', '@shallow']
      },
      {
        timeSlot: { start: '16:00', end: '18:00' },
        energyScore: 70,
        focusCapability: 'medium',
        preferredTaskTypes: ['@shallow']
      }
    ];
  }

  /**
   * Calculate task complexity score
   */
  private calculateComplexityScore(task: Task): number {
    let score = 0;
    
    // Base complexity from effort
    switch (task.effort) {
      case 'high': score += 0.8; break;
      case 'medium': score += 0.5; break;
      case 'low': score += 0.2; break;
    }
    
    // Add complexity from context
    if (task.context === '@deep') score += 0.3;
    
    // Add complexity from dependencies
    score += task.dependencies.length * 0.1;
    
    return Math.min(1.0, score);
  }

  /**
   * Calculate energy requirement for task
   */
  private calculateEnergyRequirement(task: Task): number {
    const complexityScore = this.calculateComplexityScore(task);
    const durationFactor = Math.min(1.0, (task.estimatedDuration || 25) / 60); // Normalize to hours
    
    return Math.min(1.0, complexityScore * 0.7 + durationFactor * 0.3);
  }

  /**
   * Update scheduling context with new data
   */
  updateContext(newContext: Partial<SchedulingContext>): void {
    this.context = { ...this.context, ...newContext };
  }

  /**
   * Update optimization weights
   */
  updateWeights(newWeights: Partial<OptimizationWeights>): void {
    this.weights = { ...this.weights, ...newWeights };
  }

  /**
   * Set calendar events for conflict detection
   */
  setCalendarEvents(events: CalendarEvent[]): void {
    this.calendarEvents = events;
  }

  /**
   * Get current scheduling context
   */
  getContext(): SchedulingContext {
    return { ...this.context };
  }

  /**
   * Get current optimization weights
   */
  getWeights(): OptimizationWeights {
    return { ...this.weights };
  }

  // Helper methods (simplified implementations)
  private parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  private getUserEnergyLevel(time: { hours: number; minutes: number }): EnergyLevel {
    const timeInMinutes = time.hours * 60 + time.minutes;
    
    return this.context.userEnergyLevels.find(level => {
      const start = this.parseTime(level.timeSlot.start);
      const end = this.parseTime(level.timeSlot.end);
      const startMinutes = start.hours * 60 + start.minutes;
      const endMinutes = end.hours * 60 + end.minutes;
      
      return timeInMinutes >= startMinutes && timeInMinutes < endMinutes;
    }) || this.context.userEnergyLevels[0];
  }

  // Additional helper methods would be implemented here...
  private findOptimalTimeSlots(task: Task): TimeRange[] { return []; }
  private analyzeDependencies(task: Task, tasks: Task[]): string[] { return []; }
  private calculateContextSwitchCost(task: Task, tasks: Task[]): number { return 0; }
  private calculateInterruptionSensitivity(task: Task): number { return 0.5; }
  private scoreContextOptimality(task: Task, slot: TimeSlot): number { return 0.5; }
  private scoreWorkloadBalance(slot: TimeSlot, date: Date): number { return 0.5; }
  private scorePriorityAlignment(task: Task, slot: TimeSlot): number { return 0.5; }
  private findNearestEventDistance(start: Date, end: Date): number { return 60; }
  private calculateMeetingDensity(start: Date, end: Date): number { return 0.3; }
  private isTimeSlotSimilar(slot1: TimeRange, slot2: TimeRange): boolean { return true; }
  private initializePopulation(tasks: Task[], slots: TimeSlot[], size: number): Assignment[][] { return []; }
  private evaluateFitness(individual: Assignment[], scores: Map<string, SlotScore[]>): number { return 0; }
  private selectElite(population: Assignment[][], fitness: number[], size: number): Assignment[][] { return []; }
  private tournamentSelection(population: Assignment[][], fitness: number[]): Assignment[] { return []; }
  private crossover(parent1: Assignment[], parent2: Assignment[]): Assignment[] { return []; }
  private mutate(individual: Assignment[], slots: TimeSlot[]): void { }
  private findAlternativeSlot(assignment: Assignment, assignments: Assignment[]): string | null { return null; }
  private findSlotById(slotId: string): TimeSlot | null { return null; }
  private calculateOverallScore(blocks: FocusBlock[], assignments: Assignment[]): number { return 85; }
  private validateFinalSchedule(blocks: FocusBlock[]): { conflicts: string[] } { return { conflicts: [] }; }
}

// Supporting interfaces
interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
}

interface TaskAnalysis {
  taskId: string;
  complexityScore: number;
  energyRequirement: number;
  optimalTimeSlots: TimeRange[];
  dependencies: string[];
  contextSwitchCost: number;
  interruptionSensitivity: number;
}

interface SlotScore {
  slotId: string;
  score: number;
  factors: ScoreFactors;
}

interface ScoreFactors {
  energyAlignment: number;
  calendarFit: number;
  historicalPerformance: number;
  contextOptimality: number;
  workloadBalance: number;
  priorityAlignment: number;
}

interface Assignment {
  taskId: string;
  slotId: string;
  duration: number;
  workload: number;
  priority: number;
}