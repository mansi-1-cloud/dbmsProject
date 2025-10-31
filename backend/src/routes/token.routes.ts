import { Router, Response } from 'express';
import { tokenService } from '../services/tokenServices';
import { authenticate, requireRole } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { createTokenSchema, updateTokenStatusSchema } from '../validators/schemas.js';
import { HttpError } from '../lib/errors.js';
import { ZodError } from 'zod';

const router = Router();

// --- Error Handler Helper ---
// This centralizes error handling for all routes
const handleError = (error: any, res: Response) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', issues: error.errors });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error('Unhandled error in token.routes.ts:', error);
  return res.status(500).json({ error: 'Internal server error' });
};

// Create new token (users only)
router.post('/', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    const validData = createTokenSchema.parse(req.body);
    const token = await tokenService.createToken(validData, req.user!.id);
    res.status(201).json(token);
  } catch (error: any) {
    handleError(error, res);
  }
});

// Get token by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const token = await tokenService.getTokenById(req.params.id, req.user!);
    res.json(token);
  } catch (error: any) {
    handleError(error, res);
  }
});

// Get user's tokens
router.get('/user/me', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    const tokens = await tokenService.getUserTokens(req.user!.id);
    res.json(tokens);
  } catch (error: any) {
    handleError(error, res);
  }
});

// Vendor approves token
router.post('/:id/approve', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const updatedToken = await tokenService.approveToken(req.params.id, req.user!.id);
    res.json(updatedToken);
  } catch (error: any) {
    handleError(error, res);
  }
});

// Vendor rejects token
router.post('/:id/reject', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { vendorMessage } = updateTokenStatusSchema.parse(req.body);
    const updatedToken = await tokenService.rejectToken(req.params.id, req.user!.id, vendorMessage);
    res.json(updatedToken);
  } catch (error: any) {
    handleError(error, res);
  }
});

// Vendor completes token
router.post('/:id/complete', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const updatedToken = await tokenService.completeToken(req.params.id, req.user!.id);
    res.json(updatedToken);
  } catch (error: any) {
    handleError(error, res);
  }
});

// User cancels token
router.post('/:id/cancel', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    const updatedToken = await tokenService.cancelToken(req.params.id, req.user!.id);
    res.json(updatedToken);
  } catch (error: any) {
    handleError(error, res);
  }
});

// User deletes completed token
router.delete('/:id', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await tokenService.deleteToken(req.params.id, req.user!.id);
    res.json(result);
  } catch (error: any) {
    handleError(error, res);
  }
});

export default router;
