import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { queueManager } from '../services/QueueManager.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

// Get all vendors
router.get('/', async (req, res: Response) => {
  try {
    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        services: true,
      },
    });

    res.json(vendors);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get vendor queue
router.get('/:id/queue', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const vendorId = req.params.id;

    // If vendor, only allow their own queue
    if (req.user!.role === 'VENDOR' && req.user!.id !== vendorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const queue = await queueManager.getVendorQueue(vendorId);
    res.json(queue);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get vendor pending requests
router.get('/:id/pending', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const vendorId = req.params.id;

    if (req.user!.id !== vendorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const pending = await prisma.token.findMany({
      where: {
        vendorId,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(pending);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get vendor profile
router.get('/:id/profile', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const vendorId = req.params.id;

    if (req.user!.id !== vendorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        services: true,
        createdAt: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update vendor profile
router.patch('/:id/profile', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const vendorId = req.params.id;

    if (req.user!.id !== vendorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name, phoneNumber, address } = req.body;

    // Validate phone number: allow null/undefined or exactly 10 digits
    if (phoneNumber !== undefined && phoneNumber !== null) {
      const digits = String(phoneNumber).replace(/\D/g, '');
      if (digits.length !== 10) {
        return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
      }
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        ...(name && { name }),
        ...(phoneNumber !== undefined && { phoneNumber: phoneNumber === null ? null : String(phoneNumber).replace(/\D/g, '') }),
        ...(address !== undefined && { address }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        services: true,
      },
    });

    res.json(updatedVendor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update vendor services
router.patch('/:id/services', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const vendorId = req.params.id;
    const { services } = req.body;

    if (req.user!.id !== vendorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ error: 'Services must be a non-empty array' });
    }

    // Validate service names (alphanumeric and spaces only)
    const invalidServices = services.filter(
      (service) => typeof service !== 'string' || !/^[a-zA-Z0-9\s-]+$/.test(service)
    );

    if (invalidServices.length > 0) {
      return res.status(400).json({ error: 'Invalid service names' });
    }

    // Remove duplicates and trim
    const uniqueServices = [...new Set(services.map((s) => s.trim().toLowerCase()))];

    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: { services: uniqueServices },
      select: {
        id: true,
        name: true,
        email: true,
        services: true,
      },
    });

    res.json(vendor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Add a single service
router.post('/:id/services', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const vendorId = req.params.id;
    const { service } = req.body;

    if (req.user!.id !== vendorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!service || typeof service !== 'string') {
      return res.status(400).json({ error: 'Service name is required' });
    }

    const trimmedService = service.trim().toLowerCase();

    // Validate service name
    if (!/^[a-zA-Z0-9\s-]+$/.test(trimmedService)) {
      return res.status(400).json({ error: 'Invalid service name' });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Check if service already exists
    if (vendor.services.includes(trimmedService)) {
      return res.status(400).json({ error: 'Service already exists' });
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        services: [...vendor.services, trimmedService],
      },
      select: {
        id: true,
        name: true,
        email: true,
        services: true,
      },
    });

    res.json(updatedVendor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Remove a service
router.delete('/:id/services/:serviceName', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const vendorId = req.params.id;
    const serviceName = req.params.serviceName.toLowerCase();

    if (req.user!.id !== vendorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (!vendor.services.includes(serviceName)) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Ensure at least one service remains
    if (vendor.services.length === 1) {
      return res.status(400).json({ error: 'Cannot remove the last service' });
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        services: vendor.services.filter((s) => s !== serviceName),
      },
      select: {
        id: true,
        name: true,
        email: true,
        services: true,
      },
    });

    res.json(updatedVendor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
