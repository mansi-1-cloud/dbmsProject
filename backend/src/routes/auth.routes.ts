import { Router, Request, Response } from 'express';
import { authService } from '../services/AuthService.js';
import { 
  registerUserSchema, 
  registerVendorSchema, 
  loginSchema,
  updateUserProfileSchema // <-- Import the new schema
} from '../validators/schemas.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

const router = Router();

router.post('/register/user', async (req: Request, res: Response) => {
  try {
    const validData = registerUserSchema.parse(req.body);
    const result = await authService.registerUser(validData);
    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", issues: error.errors });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('User registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/register/vendor', async (req: Request, res: Response) => {
  try {
    const validData = registerVendorSchema.parse(req.body);
    const result = await authService.registerVendor(validData);
    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", issues: error.errors });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Vendor registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login/user', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.loginUser(email, password);
    res.json(result);
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", issues: error.errors });
    }
    // For login, any other failure (wrong pass, user not found)
    // should be a 401. This is good security.
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

router.post('/login/vendor', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.loginVendor(email, password);
    res.json(result);
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", issues: error.errors });
    }
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// Get user profile
router.get('/user/profile', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    // Logic is now in the service
    const user = await authService.getUserProfile(req.user!.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.patch('/user/profile', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    // 1. Validate body using the new Zod schema
    const validatedData = updateUserProfileSchema.parse(req.body);

    // 2. Pass validated data to the service
    const updatedUser = await authService.updateUserProfile(req.user!.id, validatedData);
    res.json(updatedUser);

  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", issues: error.errors });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      // Prisma error for "Record to update not found"
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('User profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;