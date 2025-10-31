import { z } from 'zod';

// --- User/Vendor Schemas ---

export const registerUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
});

export const registerVendorSchema = registerUserSchema.extend({
  services: z.array(z.string().min(1)).min(1, "At least one service is required"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const updateUserProfileSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  phoneNumber: z.string()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits")
    .nullable()
    .optional(),
  address: z.string()
    .min(1, "Address cannot be empty")
    .nullable()
    .optional(),
})
.strict();

// --- Token Schemas ---

export const createTokenSchema = z.object({
  vendorId: z.string().min(1, "Vendor ID is required"),
  serviceType: z.string().min(1, "Service type is required"),
  subject: z.string().trim().min(1, "Subject is required"),
  description: z.string().trim()
    .min(1, "Description is required")
    .refine(s => s.split(/\s+/).length <= 100, "Description must be 100 words or less"),
  params: z.any().optional(),
});

export const updateTokenStatusSchema = z.object({
  vendorMessage: z.string().trim().min(1, "A message is required for rejection"),
});


// --- NEW VENDOR SCHEMAS ---

// Regex for valid service names (alphanumeric, spaces, hyphens)
const serviceNameRegex = /^[a-zA-Z0-9\s-]+$/;

export const updateVendorProfileSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  phoneNumber: z.string()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits")
    .nullable()
    .optional(),
  address: z.string()
    .min(1, "Address cannot be empty")
    .nullable()
    .optional(),
}).strict();

export const updateVendorServicesSchema = z.object({
  services: z.array(
    z.string().regex(serviceNameRegex, "Invalid service name")
  ).min(1, "At least one service is required"),
});

export const addVendorServiceSchema = z.object({
  service: z.string()
    .trim()
    .toLowerCase()
    .regex(serviceNameRegex, "Invalid service name"),
});

