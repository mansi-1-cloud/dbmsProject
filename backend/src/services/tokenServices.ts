import prisma from '../lib/prisma.js';
import { queueManager } from './QueueManager.js';
import { emitToUser, emitToVendor } from '../websocket/index.js';
import notificationService from './NotificationService.js';
import { AuthPayload, TokenWithETA } from '../types/index.js';
import { HttpError } from '../lib/errors.js';
import { NotificationType } from '../types/notification.js';
import { z } from 'zod';
import { createTokenSchema, updateTokenStatusSchema } from '../validators/schemas.js';

// Type for the Zod-validated token creation data
type CreateTokenData = z.infer<typeof createTokenSchema>;

class TokenService {

  /**
   * Create a new token
   */
  async createToken(data: CreateTokenData, userId: string) {
    // 1. Verify vendor exists and offers the service
    const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
    if (!vendor) {
      throw new HttpError('Vendor not found', 404);
    }
    if (!vendor.services.includes(data.serviceType)) {
      throw new HttpError('Vendor does not offer this service', 400);
    }

    // 2. Create the token
    const token = await prisma.token.create({
      data: {
        userId,
        vendorId: data.vendorId,
        serviceType: data.serviceType,
        subject: data.subject,
        description: data.description,
        params: data.params,
        status: 'PENDING',
      },
      include: {
        user: { select: { name: true, email: true } },
        vendor: { select: { name: true, email: true } },
      },
    });

    // 3. Notify vendor
    emitToVendor(vendor.id, 'token.created', token);
    return token;
  }

  /**
   * Get a single token, checking authorization
   */
  async getTokenById(tokenId: string, user: AuthPayload) {
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
      include: {
        user: { select: { name: true, email: true } },
        vendor: { select: { name: true, email: true, services: true } },
      },
    });

    if (!token) {
      throw new HttpError('Token not found', 404);
    }

    // Check authorization
    if (user.role === 'USER' && token.userId !== user.id) {
      throw new HttpError('Unauthorized', 403);
    }
    if (user.role === 'VENDOR' && token.vendorId !== user.id) {
      throw new HttpError('Unauthorized', 403);
    }

    return token;
  }

  /**
   * Get all tokens for the currently logged-in user
   */
  async getUserTokens(userId: string) {
    return prisma.token.findMany({
      where: { userId: userId },
      include: {
        vendor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user's pending tokens (PENDING, QUEUED, IN_PROGRESS)
   */
  async getUserPendingTokens(userId: string) {
    return prisma.token.findMany({
      where: { 
        userId: userId,
        status: { in: ['PENDING', 'QUEUED', 'IN_PROGRESS'] }
      },
      include: {
        vendor: { 
          select: { 
            name: true, 
            email: true, 
            phoneNumber: true, 
            address: true 
          } 
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user's history tokens (COMPLETED, REJECTED, CANCELLED)
   */
  async getUserHistoryTokens(userId: string) {
    return prisma.token.findMany({
      where: { 
        userId: userId,
        status: { in: ['COMPLETED', 'REJECTED', 'CANCELLED'] }
      },
      include: {
        vendor: { 
          select: { 
            name: true, 
            email: true, 
            phoneNumber: true, 
            address: true 
          } 
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get user's stats
   */
  async getUserStats(userId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [pendingCount, completedToday, completedTotal] = await Promise.all([
      prisma.token.count({
        where: {
          userId: userId,
          status: { in: ['PENDING', 'QUEUED', 'IN_PROGRESS'] }
        }
      }),
      prisma.token.count({
        where: {
          userId: userId,
          status: 'COMPLETED',
          updatedAt: { gte: startOfDay }
        }
      }),
      prisma.token.count({
        where: {
          userId: userId,
          status: 'COMPLETED'
        }
      })
    ]);

    return {
      pendingCount,
      completedToday,
      completedTotal
    };
  }

  /**
   * Approve a token (Vendor)
   */
  async approveToken(tokenId: string, vendorId: string) {
    const token = await this.findAndAuthorizeToken(tokenId, vendorId);

    if (token.status !== 'PENDING') {
      throw new HttpError('Token is not pending', 400);
    }

    // 1. Update status to QUEUED first
    await prisma.token.update({
      where: { id: tokenId },
      data: { status: 'QUEUED' },
    });

    // 2. Add to queue (calculates position/ETA)
    await queueManager.addToQueue(token.id, token.vendorId);

    // 3. Fetch updated token
    const updatedToken = await this.getFullToken(tokenId);
    
    // 4. Notify user and update vendor's queue
    emitToUser(token.userId, 'token.updated', updatedToken);
    await this.emitQueueUpdate(token.vendorId);

    return updatedToken;
  }

  /**
   * Reject a token (Vendor)
   */
  async rejectToken(tokenId: string, vendorId: string, vendorMessage: string) {
    const token = await this.findAndAuthorizeToken(tokenId, vendorId);

    if (token.status !== 'PENDING') {
      throw new HttpError('Token is not pending', 400);
    }

    const updatedToken = await prisma.token.update({
      where: { id: tokenId },
      data: { 
        status: 'REJECTED',
        vendorMessage,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    emitToUser(token.userId, 'token.updated', updatedToken);
    return updatedToken;
  }

  async cancelTokenByVendor(tokenId: string, vendorId: string, reason: string) {
    const token = await this.findAndAuthorizeToken(tokenId, vendorId);

    if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(token.status)) {
      throw new HttpError('Cannot cancel this token', 400);
    }

    const updatedToken = await prisma.token.update({
      where: { id: tokenId },
      data: { 
        status: 'CANCELLED',
        cancellationReason: reason,
      },
      include: { vendor: { select: { name: true, email: true } } },
    });

    // Remove from queue if it was active
    if (['QUEUED', 'IN_PROGRESS'].includes(token.status)) {
      await queueManager.removeFromQueue(token.id, token.vendorId);
      await this.emitQueueUpdate(token.vendorId);
    }

    emitToUser(token.userId, 'token.cancelled', updatedToken);
    return updatedToken;
  }


  /**
   * Complete a token (Vendor)
   */
  async completeToken(tokenId: string, vendorId: string) {
    const token = await this.findAndAuthorizeToken(tokenId, vendorId);

    if (!['QUEUED', 'IN_PROGRESS'].includes(token.status)) {
      throw new HttpError('Token is not in progress', 400);
    }

    const updatedToken = await prisma.token.update({
      where: { id: tokenId },
      data: { status: 'COMPLETED' },
      include: { 
        user: { select: { name: true, email: true, phoneNumber: true } },
        vendor: { select: { name: true } }
      },
    });

    await queueManager.removeFromQueue(token.id, token.vendorId);

    // Emit WebSocket event to user
    emitToUser(token.userId, 'token:completed', {
      tokenId: token.id,
      serviceType: token.serviceType,
      message: `Your ${token.serviceType} request is complete! You can now collect your work from the vendor.`,
    });

    // Send SMS notification to user
    if (updatedToken.user?.phoneNumber) {
      console.log(`📱 Sending COMPLETED notification for token ${token.id} to ${updatedToken.user.phoneNumber}`);
      try {
        const message = await notificationService.buildStatusMessage(NotificationType.TOKEN_COMPLETED, {
          tokenId: token.id,
          serviceType: token.serviceType,
          userName: updatedToken.user.name,
          vendorName: updatedToken.vendor?.name,
        });
        
        await notificationService.sendNotification({
          phoneNumber: updatedToken.user.phoneNumber,
          message: message,
          type: NotificationType.TOKEN_COMPLETED,
          userId: token.userId,
          vendorId: token.vendorId,
          tokenId: token.id,
        }).catch(err => console.error('Failed to send completion notification:', err));
      } catch (err) {
        console.error(`❌ Error sending completion notification for token ${token.id}:`, err);
      }
    }

    emitToUser(token.userId, 'token.updated', updatedToken);
    await this.emitQueueUpdate(token.vendorId);

    return updatedToken;
  }

  /**
   * Cancel a token (User)
   */
  async cancelToken(tokenId: string, userId: string) {
    const token = await this.findAndAuthorizeToken(tokenId, userId, 'USER');

    if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(token.status)) {
      throw new HttpError('Cannot cancel this token', 400);
    }

    const updatedToken = await prisma.token.update({
      where: { id: tokenId },
      data: { status: 'CANCELLED' },
      include: { vendor: { select: { name: true, email: true } } },
    });

    // Remove from queue if it was active
    if (['QUEUED', 'IN_PROGRESS'].includes(token.status)) {
      await queueManager.removeFromQueue(token.id, token.vendorId);
      await this.emitQueueUpdate(token.vendorId);
    }

    emitToVendor(token.vendorId, 'token.cancelled', updatedToken);
    return updatedToken;
  }

  /**
   * Delete a token (User)
   */
  async deleteToken(tokenId: string, userId: string) {
    const token = await this.findAndAuthorizeToken(tokenId, userId, 'USER');

    if (token.status !== 'COMPLETED') {
      throw new HttpError('Can only delete completed tokens', 400);
    }

    await prisma.token.delete({ where: { id: tokenId } });
    return { message: 'Token deleted successfully' };
  }

  // --- Private Helper Methods ---

  /**
   * Fetches and authorizes a token for a user or vendor.
   * Throws HttpError if not found or not authorized.
   */
  private async findAndAuthorizeToken(tokenId: string, userId: string, role: 'USER' | 'VENDOR' = 'VENDOR') {
    const token = await prisma.token.findUnique({ where: { id: tokenId } });

    if (!token) {
      throw new HttpError('Token not found', 404);
    }

    if (role === 'VENDOR' && token.vendorId !== userId) {
      throw new HttpError('Unauthorized', 403);
    }
    if (role === 'USER' && token.userId !== userId) {
      throw new HttpError('Unauthorized', 403);
    }

    return token;
  }

  /**
   * Gets the full token details (with user/vendor)
   */
  private async getFullToken(tokenId: string) {
    return prisma.token.findUnique({
      where: { id: tokenId },
      include: {
        user: { select: { name: true, email: true } },
        vendor: { select: { name: true, email: true } },
      },
    });
  }

  /**
   * Emits a queue update event to a vendor
   */
  private async emitQueueUpdate(vendorId: string) {
    const queue = await queueManager.getVendorQueue(vendorId);
    emitToVendor(vendorId, 'queue.update', queue);
  }
}

export const tokenService = new TokenService();
