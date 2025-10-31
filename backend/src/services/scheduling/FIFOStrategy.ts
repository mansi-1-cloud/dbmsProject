import { SchedulingStrategy, QueueToken } from '../../types/index.js';

export class FIFOStrategy implements SchedulingStrategy {
  readonly name = 'FIFO';

  // --- Change 1: Made this 'static' and 'readonly' ---
  // Service durations are configuration, not instance state.
  // 'static' means it's shared by all instances of the class.
  // 'readonly' prevents it from being modified after initialization.
  // We also use UPPER_SNAKE_CASE for constants.
  private static readonly SERVICE_DURATIONS: Record<string, number> = {
    'printing': 10,
    'binding': 15,
    'lamination': 8,
    'scanning': 5,
    'photocopying': 7,
    'default': 10,
  };

  /**
   * Calculates the queue order.
   * NOTE: Returns a new, sorted array and does NOT mutate the original.
   */
  calculateQueue(tokens: QueueToken[]): QueueToken[] {
    // --- Change 2: Use spread '[...tokens]' to create a copy ---
    // This prevents mutating the original 'tokens' array, which can
    // cause hard-to-find bugs in other parts of your application.
    return [...tokens].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Estimates the completion time for a token at a given position.
   */
  estimateCompletion(queuePosition: number, tokens: QueueToken[]): Date {
    const sortedQueue = this.calculateQueue(tokens);

    // --- Change 3: Use .slice() and .reduce() for cleaner logic ---
    // This is more declarative and less error-prone than a manual for-loop.
    // 1. Get all tokens from the start up to (and including) the current position.
    // 2. Sum their estimated durations.
    const cumulativeMinutes = sortedQueue
      .slice(0, queuePosition + 1)
      .reduce((totalMinutes, token) => {
        // --- Change 4: Reuse the getEstimatedDuration method ---
        return totalMinutes + this.getEstimatedDuration(token.serviceType);
      }, 0);

    const estimatedCompletion = new Date();
    estimatedCompletion.setMinutes(estimatedCompletion.getMinutes() + cumulativeMinutes);
    
    return estimatedCompletion;
  }

  /**
   * Gets the estimated duration for a single service type.
   */
  getEstimatedDuration(serviceType: string): number {
    // --- Change 5: Refer to the static constant ---
    return FIFOStrategy.SERVICE_DURATIONS[serviceType] 
        || FIFOStrategy.SERVICE_DURATIONS['default'];
  }
}