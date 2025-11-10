import { Router, Response } from 'express';
import { vendorService } from '../services/VendorService.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { 
  updateVendorProfileSchema,
  updateVendorServicesSchema,
  addVendorServiceSchema
} from '../validators/schemas.js';
import { HttpError } from '../lib/errors.js';
import { ZodError } from 'zod';

const router = Router();

// Error handler helper
const handleError = (error: any, res: Response) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', issues: error.errors });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error('Unhandled error in vendor.routes.ts:', error);
  return res.status(500).json({ error: 'Internal server error' });
};

// Get all vendors (Public)
router.get('/', async (req, res: Response) => {
  try {
    const vendors = await vendorService.getAllVendors();
    res.json(vendors);
  } catch (error: any) {
    handleError(error, res);
  }
});

// Get vendor queue (Authenticated, any role can view)
router.get('/:id/queue', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const queue = await vendorService.getVendorQueue(req.params.id, req.user);
    res.json(queue);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/:id/pending', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const pending = await vendorService.getPendingTokens(req.params.id, req.user!.id);
    res.json(pending);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/:id/stats', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const stats = await vendorService.getVendorStats(req.params.id, req.user!.id);
    res.json(stats);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/:id/profile', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const profile = await vendorService.getVendorProfile(req.params.id, req.user!.id);
    res.json(profile);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.patch('/:id/profile', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const validData = updateVendorProfileSchema.parse(req.body);
    const updatedVendor = await vendorService.updateVendorProfile(req.params.id, req.user!.id, validData);
    res.json(updatedVendor);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.patch('/:id/services', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const validData = updateVendorServicesSchema.parse(req.body);
    const updatedVendor = await vendorService.updateVendorServices(req.params.id, req.user!.id, validData);
    res.json(updatedVendor);
  } catch (error: any)
 {
    handleError(error, res);
  }
});

router.post('/:id/services', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const validData = addVendorServiceSchema.parse(req.body);
    const updatedVendor = await vendorService.addVendorService(req.params.id, req.user!.id, validData);
    res.json(updatedVendor);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.delete('/:id/services/:serviceName', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { id, serviceName } = req.params;
    const updatedVendor = await vendorService.removeVendorService(id, req.user!.id, serviceName);
    res.json(updatedVendor);
  } catch (error: any) {
    handleError(error, res);
  }
});

export default router;
