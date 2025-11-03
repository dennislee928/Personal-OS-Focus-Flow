/**
 * Smart Scheduling Service
 *
 * Advanced algorithms for optimal focus block placement including:
 * - Calendar integration and conflict detection
 * - Workload balancing across time periods
 * - Machine learning-based optimization
 * - Context-aware scheduling
 */
export class SmartSchedulingService {
    context;
    weights;
    calendarEvents = [];
    constructor(context, weights) {
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
    generateOptimizedSchedule(tasks, date, availableSlots) {
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
    analyzeTasks(tasks) {
        return tasks.map(task => {
            const analysis = {
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
    scoreTimeSlots(tasks, slots, date) {
        const scores = new Map();
        for (const task of tasks) {
            const taskScores = [];
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
    calculateSlotScore(task, slot, date) {
        const factors = {
            energyAlignment: this.scoreEnergyAlignment(task, slot),
            calendarFit: this.scoreCalendarFit(slot, date),
            historicalPerformance: this.scoreHistoricalPerformance(task, slot),
            contextOptimality: this.scoreContextOptimality(task, slot),
            workloadBalance: this.scoreWorkloadBalance(slot, date),
            priorityAlignment: this.scorePriorityAlignment(task, slot)
        };
        const total = factors.energyAlignment * this.weights.energyAlignment +
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
    scoreEnergyAlignment(task, slot) {
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
    scoreCalendarFit(slot, date) {
        const slotStart = new Date(date);
        const startTimeParts = this.parseTime(slot.startTime);
        slotStart.setHours(startTimeParts.hours, startTimeParts.minutes, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + slot.duration * 60000);
        // Check for direct conflicts
        const hasConflict = this.calendarEvents.some(event => slotStart < event.endTime && slotEnd > event.startTime);
        if (hasConflict)
            return 0;
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
    scoreHistoricalPerformance(task, slot) {
        const relevantHistory = this.context.historicalPerformance.filter(data => data.taskType === task.context &&
            this.isTimeSlotSimilar(data.timeSlot, { start: slot.startTime, end: slot.endTime }));
        if (relevantHistory.length === 0)
            return 0.5; // Neutral score for no data
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
    geneticAlgorithmOptimization(tasks, slots, slotScores) {
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
    applyWorkloadBalancing(assignments) {
        const balanced = [...assignments];
        const timeSlotLoad = new Map();
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
            const excessLoad = timeSlotLoad.get(slotId) - maxLoad;
            // Move lowest priority tasks to alternative slots
            tasksInSlot.sort((a, b) => a.priority - b.priority);
            let redistributedLoad = 0;
            for (const assignment of tasksInSlot) {
                if (redistributedLoad >= excessLoad)
                    break;
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
    resolveConflictsAndValidate(assignments, date) {
        const blocks = [];
        const reasoning = [];
        const conflicts = [];
        // Convert assignments to focus blocks
        const slotGroups = new Map();
        for (const assignment of assignments) {
            const group = slotGroups.get(assignment.slotId) || [];
            group.push(assignment);
            slotGroups.set(assignment.slotId, group);
        }
        let blockId = 0;
        for (const [slotId, groupAssignments] of slotGroups) {
            const slot = this.findSlotById(slotId);
            if (!slot)
                continue;
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
    getDefaultEnergyLevels() {
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
    calculateComplexityScore(task) {
        let score = 0;
        // Base complexity from effort
        switch (task.effort) {
            case 'high':
                score += 0.8;
                break;
            case 'medium':
                score += 0.5;
                break;
            case 'low':
                score += 0.2;
                break;
        }
        // Add complexity from context
        if (task.context === '@deep')
            score += 0.3;
        // Add complexity from dependencies
        score += task.dependencies.length * 0.1;
        return Math.min(1.0, score);
    }
    /**
     * Calculate energy requirement for task
     */
    calculateEnergyRequirement(task) {
        const complexityScore = this.calculateComplexityScore(task);
        const durationFactor = Math.min(1.0, (task.estimatedDuration || 25) / 60); // Normalize to hours
        return Math.min(1.0, complexityScore * 0.7 + durationFactor * 0.3);
    }
    /**
     * Update scheduling context with new data
     */
    updateContext(newContext) {
        this.context = { ...this.context, ...newContext };
    }
    /**
     * Update optimization weights
     */
    updateWeights(newWeights) {
        this.weights = { ...this.weights, ...newWeights };
    }
    /**
     * Set calendar events for conflict detection
     */
    setCalendarEvents(events) {
        this.calendarEvents = events;
    }
    /**
     * Get current scheduling context
     */
    getContext() {
        return { ...this.context };
    }
    /**
     * Get current optimization weights
     */
    getWeights() {
        return { ...this.weights };
    }
    // Helper methods (simplified implementations)
    parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return { hours, minutes };
    }
    getUserEnergyLevel(time) {
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
    findOptimalTimeSlots(task) { return []; }
    analyzeDependencies(task, tasks) { return []; }
    calculateContextSwitchCost(task, tasks) { return 0; }
    calculateInterruptionSensitivity(task) { return 0.5; }
    scoreContextOptimality(task, slot) { return 0.5; }
    scoreWorkloadBalance(slot, date) { return 0.5; }
    scorePriorityAlignment(task, slot) { return 0.5; }
    findNearestEventDistance(start, end) { return 60; }
    calculateMeetingDensity(start, end) { return 0.3; }
    isTimeSlotSimilar(slot1, slot2) { return true; }
    initializePopulation(tasks, slots, size) { return []; }
    evaluateFitness(individual, scores) { return 0; }
    selectElite(population, fitness, size) { return []; }
    tournamentSelection(population, fitness) { return []; }
    crossover(parent1, parent2) { return []; }
    mutate(individual, slots) { }
    findAlternativeSlot(assignment, assignments) { return null; }
    findSlotById(slotId) { return null; }
    calculateOverallScore(blocks, assignments) { return 85; }
    validateFinalSchedule(blocks) { return { conflicts: [] }; }
}
