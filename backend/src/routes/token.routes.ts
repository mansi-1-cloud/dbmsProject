import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { queueManager } from '../services/QueueManager.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { createTokenSchema, updateTokenStatusSchema } from '../validators/schemas.js';
import { emitToUser, emitToVendor } from '../websocket/index.js';

const router = Router();

// Create new token (users only)
router.post('/', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    const { vendorId, serviceType, params } = createTokenSchema.parse(req.body);
    
    // Verify vendor exists and offers the service
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    if (!vendor.services.includes(serviceType)) {
      return res.status(400).json({ error: 'Vendor does not offer this service' });
    }

    const token = await prisma.token.create({
      data: {
        userId: req.user!.id,
        vendorId,
        serviceType,
        params,
        status: 'PENDING',
      },
      include: {
        user: { select: { name: true, email: true } },
        vendor: { select: { name: true, email: true } },
      },
    });

    // Notify vendor via WebSocket
    emitToVendor(vendorId, 'token.created', token);

    res.status(201).json(token);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Token creation failed' });
  }
});

// Get token by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const token = await prisma.token.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, email: true } },
        vendor: { select: { name: true, email: true, services: true } },
      },
    });

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    // Check authorization
    if (req.user!.role === 'USER' && token.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user!.role === 'VENDOR' && token.vendorId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(token);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's tokens
router.get('/user/me', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    const tokens = await prisma.token.findMany({
      where: { userId: req.user!.id },
      include: {
        vendor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(tokens);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Vendor approves token
router.post('/:id/approve', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const token = await prisma.token.findUnique({ where: { id: req.params.id } });

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    if (token.vendorId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (token.status !== 'PENDING') {
      return res.status(400).json({ error: 'Token is not pending' });
    }

    const updatedToken = await prisma.token.update({
      where: { id: req.params.id },
      data: { status: 'QUEUED' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    // Add to queue
    await queueManager.addToQueue(token.id, token.vendorId);

    // Notify user
    emitToUser(token.userId, 'token.updated', updatedToken);
    
    // Update vendor's queue
    const queue = await queueManager.getVendorQueue(token.vendorId);
    emitToVendor(token.vendorId, 'queue.update', queue);

    res.json(updatedToken);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Vendor rejects token
router.post('/:id/reject', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { vendorMessage } = updateTokenStatusSchema.parse(req.body);
    const token = await prisma.token.findUnique({ where: { id: req.params.id } });

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    if (token.vendorId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (token.status !== 'PENDING') {
      return res.status(400).json({ error: 'Token is not pending' });
    }

    const updatedToken = await prisma.token.update({
      where: { id: req.params.id },
      data: { 
        status: 'REJECTED',
        vendorMessage,
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    // Notify user
    emitToUser(token.userId, 'token.updated', updatedToken);

    res.json(updatedToken);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Vendor completes token
router.post('/:id/complete', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const token = await prisma.token.findUnique({ where: { id: req.params.id } });

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    if (token.vendorId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!['QUEUED', 'IN_PROGRESS'].includes(token.status)) {
      return res.status(400).json({ error: 'Token is not in progress' });
    }

    const updatedToken = await prisma.token.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    // Remove from queue
    await queueManager.removeFromQueue(token.id, token.vendorId);

    // Notify user
    emitToUser(token.userId, 'token.updated', updatedToken);
    
    // Update vendor's queue
    const queue = await queueManager.getVendorQueue(token.vendorId);
    emitToVendor(token.vendorId, 'queue.update', queue);

    res.json(updatedToken);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
