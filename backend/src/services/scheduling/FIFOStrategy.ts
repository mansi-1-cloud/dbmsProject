import { SchedulingStrategy, QueueToken } from '../../types/index.js';

export class FIFOStrategy implements SchedulingStrategy {
  name = 'FIFO';

  // Service type to estimated duration mapping (in minutes)
  private serviceDurations: Record<string, number> = {
    'printing': 10,
    'binding': 15,
    'lamination': 8,
    'scanning': 5,
    'photocopying': 7,
    'default': 10,
  };

  calculateQueue(tokens: QueueToken[]): QueueToken[] {
    // FIFO: Sort by creation time (oldest first)
    return tokens.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  estimateCompletion(queuePosition: number, tokens: QueueToken[]): Date {
    const sortedQueue = this.calculateQueue(tokens);
    
    // Calculate cumulative time for all tokens before this position
    let cumulativeMinutes = 0;
    for (let i = 0; i < queuePosition && i < sortedQueue.length; i++) {
      const token = sortedQueue[i];
      const duration = this.serviceDurations[token.serviceType] || this.serviceDurations['default'];
      cumulativeMinutes += duration;
    }

    // Add estimated duration for the current token
    if (queuePosition < sortedQueue.length) {
      const currentToken = sortedQueue[queuePosition];
      const duration = this.serviceDurations[currentToken.serviceType] || this.serviceDurations['default'];
      cumulativeMinutes += duration;
    }

    const estimatedCompletion = new Date();
    estimatedCompletion.setMinutes(estimatedCompletion.getMinutes() + cumulativeMinutes);
    
    return estimatedCompletion;
  }

  getEstimatedDuration(serviceType: string): number {
    return this.serviceDurations[serviceType] || this.serviceDurations['default'];
  }
}
