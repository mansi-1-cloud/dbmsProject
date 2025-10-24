import { z } from 'zod';

export const registerUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(6).max(100),
});

export const registerVendorSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(6).max(100),
  services: z.array(z.string()).min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const createTokenSchema = z.object({
  vendorId: z.string(),
  serviceType: z.string().min(1),
  params: z.record(z.any()).optional(),
});

export const updateTokenStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED']).optional(),
  vendorMessage: z.string().optional(),
});
