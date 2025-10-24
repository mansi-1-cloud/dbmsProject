import prisma from '../lib/prisma.js';
import redis from '../lib/redis.js';
import { FIFOStrategy } from './scheduling/FIFOStrategy.js';
import { SchedulingStrategy, QueueToken } from '../types/index.js';

export class QueueManager {
  private strategy: SchedulingStrategy;

  constructor(strategy?: SchedulingStrategy) {
    this.strategy = strategy || new FIFOStrategy();
  }

  setStrategy(strategy: SchedulingStrategy) {
    this.strategy = strategy;
  }

  getStrategy(): SchedulingStrategy {
    return this.strategy;
  }

  async addToQueue(tokenId: string, vendorId: string): Promise<void> {
    const lockKey = `lock:vendor:${vendorId}`;
    const queueKey = `queue:vendor:${vendorId}`;

    // Acquire lock
    const lock = await redis.set(lockKey, '1', 'EX', 10, 'NX');
    if (!lock) {
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.addToQueue(tokenId, vendorId);
    }

    try {
      // Add to Redis queue
      await redis.zadd(queueKey, Date.now(), tokenId);

      // Update token in database
      await this.updateQueuePositions(vendorId);
    } finally {
      // Release lock
      await redis.del(lockKey);
    }
  }

  async removeFromQueue(tokenId: string, vendorId: string): Promise<void> {
    const queueKey = `queue:vendor:${vendorId}`;
    await redis.zrem(queueKey, tokenId);
    await this.updateQueuePositions(vendorId);
  }

  async updateQueuePositions(vendorId: string): Promise<void> {
    const queueKey = `queue:vendor:${vendorId}`;
    
    // Get all tokens in queue
    const tokenIds = await redis.zrange(queueKey, 0, -1);
    
    if (tokenIds.length === 0) return;

    // Fetch token details
    const tokens = await prisma.token.findMany({
      where: {
        id: { in: tokenIds },
        status: { in: ['QUEUED', 'IN_PROGRESS'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Convert to QueueToken format
    const queueTokens: QueueToken[] = tokens.map(t => ({
      tokenId: t.id,
      serviceType: t.serviceType,
      estimatedDuration: (this.strategy as FIFOStrategy).getEstimatedDuration?.(t.serviceType) || 10,
      createdAt: t.createdAt,
    }));

    // Calculate queue order and ETAs
    const sortedQueue = this.strategy.calculateQueue(queueTokens);

    // Update each token with position and ETA
    for (let i = 0; i < sortedQueue.length; i++) {
      const queueToken = sortedQueue[i];
      const estimatedCompletion = this.strategy.estimateCompletion(i, sortedQueue);

      await prisma.token.update({
        where: { id: queueToken.tokenId },
        data: {
          queuePosition: i + 1,
          estimatedCompletion,
        },
      });
    }
  }

  async getVendorQueue(vendorId: string) {
    const tokens = await prisma.token.findMany({
      where: {
        vendorId,
        status: { in: ['QUEUED', 'IN_PROGRESS'] },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { queuePosition: 'asc' },
    });

    return tokens;
  }

  async moveToInProgress(tokenId: string): Promise<void> {
    await prisma.token.update({
      where: { id: tokenId },
      data: { status: 'IN_PROGRESS' },
    });
  }
}

export const queueManager = new QueueManager();
