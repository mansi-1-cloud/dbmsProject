import { SchedulingStrategy } from '../types/index.js';
import { FIFOStrategy } from './scheduling/FIFOStrategy.js';

// Import other strategies here as you create them
// import { LIFOStrategy } from './scheduling/LIFOStrategy.js';

/**
 * Defines the "shape" of a strategy class constructor.
 * (A class that returns a SchedulingStrategy when instantiated).
 */
type StrategyConstructor = new () => SchedulingStrategy;

/**
 * A registry (Map) that maps strategy names (string)
 * to their class constructors.
 *
 * This uses a NAMED EXPORT (export const)
 */
export const strategyRegistry = new Map<string, StrategyConstructor>([
  ['FIFO', FIFOStrategy],
  
  // When you add a LIFO strategy, you'll just add it here:
  // ['LIFO', LIFOStrategy],
]);