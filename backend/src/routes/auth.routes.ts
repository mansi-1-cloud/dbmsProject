import { Router, Request, Response } from 'express';
import { authService } from '../services/AuthService.js';
import { registerUserSchema, registerVendorSchema, loginSchema } from '../validators/schemas.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';

const router = Router();

router.post('/register/user', async (req: Request, res: Response) => {
  try {
    const { email, name, password } = registerUserSchema.parse(req.body);
    const result = await authService.registerUser(email, name, password);
    res.status(201).json(result);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

router.post('/register/vendor', async (req: Request, res: Response) => {
  try {
    const { email, name, password, services } = registerVendorSchema.parse(req.body);
    const result = await authService.registerVendor(email, name, password, services);
    res.status(201).json(result);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

router.post('/login/user', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.loginUser(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

router.post('/login/vendor', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.loginVendor(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Get user profile
router.get('/user/profile', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update user profile
router.patch('/user/profile', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, phoneNumber, address } = req.body;

    // Validate phone number: allow null/undefined or exactly 10 digits
    if (phoneNumber !== undefined && phoneNumber !== null) {
      const digits = String(phoneNumber).replace(/\D/g, '');
      if (digits.length !== 10) {
        return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
      }
    }

    const updateData: any = {};
    
    if (name !== undefined && name !== null) {
      updateData.name = name;
    }
    
    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber === null ? null : String(phoneNumber).replace(/\D/g, '');
    }
    
    if (address !== undefined) {
      updateData.address = address;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
      },
    });

    res.json(updatedUser);
  } catch (error: any) {
    console.error('User profile update error:', error);
    res.status(400).json({ error: error.message || 'Update failed' });
  }
});

export default router;
