import { randomBytes } from 'crypto';
import prisma from '../lib/prisma.js';
import redis from '../lib/redis.js';
import { FIFOStrategy } from './scheduling/FIFOStrategy.js';
import { SchedulingStrategy, QueueToken } from '../types/index.js'; // Imports the new types

const LOCK_TTL = 10; 
const LOCK_RETRIES = 5;
const LOCK_RETRY_DELAY = 150; 

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

  private async _acquireLock(vendorId: string): Promise<string | null> {
    const lockKey = `lock:queue:${vendorId}`;
    const lockValue = randomBytes(16).toString('hex');
    
    let retries = LOCK_RETRIES;
    while (retries > 0) {
      const lock = await redis.set(lockKey, lockValue, 'EX', LOCK_TTL, 'NX');
      if (lock) {
        return lockValue;
      }
      await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_DELAY + Math.random() * 50));
      retries--;
    }
    
    console.error(`Failed to acquire lock for queue: ${vendorId}`);
    return null;
  }

  private async _releaseLock(vendorId: string, lockValue: string): Promise<void> {
    const lockKey = `lock:queue:${vendorId}`;
    
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    try {
      // Use the older redis.eval syntax
      await redis.eval(script, 1, lockKey, lockValue);
    } catch (error) {
      console.error(`Failed to release lock for ${vendorId}:`, error);
    }
  }

  async addToQueue(tokenId: string, vendorId: string): Promise<void> {
    const queueKey = `queue:vendor:${vendorId}`;
    
    const lockValue = await this._acquireLock(vendorId);
    if (!lockValue) {
      throw new Error(`Queue is busy. Failed to add token for vendor ${vendorId}`);
    }

    try {
      await redis.zadd(queueKey, Date.now(), tokenId);
      await this.updateQueuePositions(vendorId);
    } catch (error) {
      console.error(`Error adding to queue for ${vendorId}:`, error);
      throw error;
    } finally {
      await this._releaseLock(vendorId, lockValue);
    }
  }

  async removeFromQueue(tokenId: string, vendorId: string): Promise<void> {
    const queueKey = `queue:vendor:${vendorId}`;

    const lockValue = await this._acquireLock(vendorId);
    if (!lockValue) {
      throw new Error(`Queue is busy. Failed to remove token for vendor ${vendorId}`);
    }

    try {
      await redis.zrem(queueKey, tokenId);
      await this.updateQueuePositions(vendorId);
    } catch (error) {
      console.error(`Error removing from queue for ${vendorId}:`, error);
      throw error;
    } finally {
      await this._releaseLock(vendorId, lockValue);
    }
  }

  async updateQueuePositions(vendorId: string): Promise<void> {
    const queueKey = `queue:vendor:${vendorId}`;
    
    const tokenIds = await redis.zrange(queueKey, 0, -1);
    
    if (tokenIds.length === 0) return;

    const tokens = await prisma.token.findMany({
      where: {
        id: { in: tokenIds },
        status: { in: ['QUEUED', 'IN_PROGRESS'] },
      },
    });

    // --- THIS IS THE FIX ---
    // We now map to the new, simpler QueueToken interface.
    // No 'estimatedDuration' calculation is needed here.
    const queueTokens: QueueToken[] = tokens.map(t => ({
      id: t.id,
      serviceType: t.serviceType,
      createdAt: t.createdAt,
    }));

    // The strategy methods will use their *own* getEstimatedDuration
    const sortedQueue = this.strategy.calculateQueue(queueTokens);

    const updatePromises = sortedQueue.map((queueToken, i) => {
      const estimatedCompletion = this.strategy.estimateCompletion(i, sortedQueue);

      // --- THIS IS THE FIX ---
      // We use 'queueToken.id' which matches our new type
      return prisma.token.update({
        where: { id: queueToken.id },
        data: {
          queuePosition: i + 1,
          estimatedCompletion,
        },
      });
    });

    try {
      await prisma.$transaction(updatePromises);
    } catch (error) {
      console.error(`Transaction failed for updateQueuePositions ${vendorId}:`, error);
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