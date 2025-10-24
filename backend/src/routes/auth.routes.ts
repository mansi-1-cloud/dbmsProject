import { Router, Request, Response } from 'express';
import { authService } from '../services/AuthService.js';
import { registerUserSchema, registerVendorSchema, loginSchema } from '../validators/schemas.js';

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

export default router;
