import { Router, Response } from 'express';
import { tokenService } from '../services/tokenServices.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { createTokenSchema, updateTokenStatusSchema } from '../validators/schemas.js';
import { HttpError } from '../lib/errors.js';
import { ZodError } from 'zod';

const router = Router();
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

router.post('/', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    const validData = createTokenSchema.parse(req.body);
    const token = await tokenService.createToken(validData, req.user!.id);
    res.status(201).json(token);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const token = await tokenService.getTokenById(req.params.id, req.user!);
    res.json(token);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/user/me', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    const tokens = await tokenService.getUserTokens(req.user!.id);
    res.json(tokens);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/user/:userId/pending', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.id !== req.params.userId) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own data' });
    }
    const tokens = await tokenService.getUserPendingTokens(req.params.userId);
    res.json(tokens);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/user/:userId/history', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.id !== req.params.userId) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own data' });
    }
    const tokens = await tokenService.getUserHistoryTokens(req.params.userId);
    res.json(tokens);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/user/:userId/stats', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.id !== req.params.userId) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own data' });
    }
    const stats = await tokenService.getUserStats(req.params.userId);
    res.json(stats);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/:id/approve', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const updatedToken = await tokenService.approveToken(req.params.id, req.user!.id);
    res.json(updatedToken);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/:id/reject', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { vendorMessage } = updateTokenStatusSchema.parse(req.body);
    const updatedToken = await tokenService.rejectToken(req.params.id, req.user!.id, vendorMessage);
    res.json(updatedToken);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/:id/complete', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const updatedToken = await tokenService.completeToken(req.params.id, req.user!.id);
    res.json(updatedToken);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/:id/cancel', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    const updatedToken = await tokenService.cancelToken(req.params.id, req.user!.id);
    res.json(updatedToken);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.delete('/:id', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await tokenService.deleteToken(req.params.id, req.user!.id);
    res.json(result);
  } catch (error: any) {
    handleError(error, res);
  }
});

export default router;
