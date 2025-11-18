import { randomBytes } from 'crypto';
import prisma from '../lib/prisma.js';
import redis from '../lib/redis.js';
import notificationService from './NotificationService.js';
import { FIFOStrategy } from './scheduling/FIFOStrategy.js';
import { SchedulingStrategy, QueueToken } from '../types/index.js';
import { NotificationType } from '../types/notification.js';
import { emitToUser, emitToVendor } from '../websocket/index.js';

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

      // Send notification to user
      const token = await prisma.token.findUnique({
        where: { id: tokenId },
        include: { user: true, vendor: true },
      });

      if (token?.user?.phoneNumber) {
        const queuePosition = (await redis.zrank(queueKey, tokenId)) || 0;
        const estimatedCompletion = token.estimatedCompletion || new Date();
        
        console.log(`📱 Sending notification for token ${token.id} to ${token.user.phoneNumber}`);
        
        try {
          const message = await notificationService.buildStatusMessage(NotificationType.TOKEN_QUEUED, {
            tokenId: token.id,
            position: queuePosition + 1,
            serviceType: token.serviceType,
            userName: token.user.name,
            vendorName: token.vendor?.name,
            estimatedCompletion: estimatedCompletion,
          });
          
          await notificationService.sendNotification({
            phoneNumber: token.user.phoneNumber,
            message: message,
            type: NotificationType.TOKEN_QUEUED,
            userId: token.userId,
            vendorId: token.vendorId,
            tokenId: token.id,
          });
          console.log(`✅ Notification sent successfully for token ${token.id}`);
          
          // Emit WebSocket event to user
          emitToUser(token.userId, 'token:queued', {
            tokenId: token.id,
            queuePosition: queuePosition + 1,
            serviceType: token.serviceType,
            estimatedCompletion: estimatedCompletion,
          });
          
          // Emit WebSocket event to vendor
          emitToVendor(token.vendorId, 'queue:new-token', {
            tokenId: token.id,
            userId: token.userId,
            serviceType: token.serviceType,
            position: queuePosition + 1,
          });
        } catch (notificationError) {
          console.error(`❌ Failed to send notification for token ${token.id}:`, notificationError);
        }
      } else {
        console.warn(`⚠️ No phone number found for user ${token?.userId} on token ${token?.id}`);
      }
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
      include: { user: true, vendor: true },
    });

    const queueTokens: QueueToken[] = tokens.map(t => ({
      id: t.id,
      serviceType: t.serviceType,
      createdAt: t.createdAt,
    }));

    const sortedQueue = this.strategy.calculateQueue(queueTokens);

    const updatePromises = sortedQueue.map(async (queueToken, i) => {
      const estimatedCompletion = this.strategy.estimateCompletion(i, sortedQueue);
      const token = tokens.find(t => t.id === queueToken.id);

      // Update token position
      await prisma.token.update({
        where: { id: queueToken.id },
        data: {
          queuePosition: i + 1,
          estimatedCompletion,
        },
      });

      // Emit WebSocket event to user with position update
      if (token?.user) {
        emitToUser(token.userId, 'queue:position-updated', {
          tokenId: queueToken.id,
          newPosition: i + 1,
          estimatedCompletion: estimatedCompletion,
          serviceType: token.serviceType,
        });
      }

      // Send position update notification if position changed and user has phone number
      if (token?.user?.phoneNumber && i + 1 <= 3) {
        // Only notify top 3 positions
        console.log(`📱 Sending position update for token ${token.id} (position ${i + 1}) to ${token.user.phoneNumber}`);
        try {
          const message = await notificationService.buildStatusMessage(NotificationType.POSITION_UPDATED, {
            tokenId: token.id,
            position: i + 1,
            serviceType: token.serviceType,
            userName: token.user.name,
            vendorName: token.vendor?.name,
            estimatedCompletion: estimatedCompletion,
          });
          
          await notificationService.sendNotification({
            phoneNumber: token.user.phoneNumber,
            message: message,
            type: NotificationType.POSITION_UPDATED,
            userId: token.userId,
            vendorId: token.vendorId,
            tokenId: token.id,
          }).catch(err => console.error('Failed to send position update:', err));
        } catch (err) {
          console.error(`❌ Error sending position update for token ${token.id}:`, err);
        }
      }
    });

    try {
      await Promise.all(updatePromises);
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
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
      include: { user: true, vendor: true },
    });

    if (!token) throw new Error('Token not found');

    await prisma.token.update({
      where: { id: tokenId },
      data: { status: 'IN_PROGRESS' },
    });

    // Emit WebSocket event to user
    emitToUser(token.userId, 'token:status-changed', {
      tokenId: token.id,
      status: 'IN_PROGRESS',
      serviceType: token.serviceType,
    });

    // Emit WebSocket event to vendor
    emitToVendor(token.vendorId, 'token:moved-to-progress', {
      tokenId: token.id,
      userId: token.userId,
      serviceType: token.serviceType,
    });

    // Send notification to user
    if (token.user?.phoneNumber) {
      console.log(`📱 Sending IN_PROGRESS notification for token ${token.id} to ${token.user.phoneNumber}`);
      try {
        const message = await notificationService.buildStatusMessage(NotificationType.TOKEN_IN_PROGRESS, {
          tokenId: token.id,
          serviceType: token.serviceType,
          userName: token.user.name,
          vendorName: token.vendor?.name,
        });
        
        await notificationService.sendNotification({
          phoneNumber: token.user.phoneNumber,
          message: message,
          type: NotificationType.TOKEN_IN_PROGRESS,
          userId: token.userId,
          vendorId: token.vendorId,
          tokenId: token.id,
        }).catch(err => console.error('Failed to send in-progress notification:', err));
      } catch (err) {
        console.error(`❌ Error sending in-progress notification for token ${token.id}:`, err);
      }
    } else {
      console.warn(`⚠️ No phone number found for user ${token.userId} on token ${token.id}`);
    }
  }
}

export const queueManager = new QueueManager();