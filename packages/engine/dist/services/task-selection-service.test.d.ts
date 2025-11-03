/**
 * Task Selection Service Tests
 * Tests for task prioritization algorithms and selection logic
 */
import { Task } from '../types/ritual.js';
/**
 * Create mock tasks for testing
 */
declare function createMockTasks(): Task[];
/**
 * Test priority scoring calculation
 */
declare function testPriorityScoring(): boolean;
/**
 * Test context balance calculation
 */
declare function testContextBalance(): boolean;
/**
 * Test dependency detection
 */
declare function testDependencyDetection(): boolean;
/**
 * Test workload estimation
 */
declare function testWorkloadEstimation(): boolean;
/**
 * Test task suggestions
 */
declare function testTaskSuggestions(): boolean;
/**
 * Test optimal task ordering
 */
declare function testOptimalOrdering(): boolean;
/**
 * Run all task selection service tests
 */
declare function runTaskSelectionTests(): void;
export { runTaskSelectionTests, testPriorityScoring, testContextBalance, testDependencyDetection, testWorkloadEstimation, testTaskSuggestions, testOptimalOrdering, createMockTasks };
