import bcrypt from 'bcryptjs';
import jwt, { Secret } from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { z } from 'zod';
import { 
  registerUserSchema, 
  registerVendorSchema, 
  updateUserProfileSchema
} from '../validators/schemas.js';
import { AuthPayload } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not set in .env file.");
  process.exit(1);
}

const AppJwtSecret: Secret = JWT_SECRET;

type RegisterUserData = z.infer<typeof registerUserSchema>;
type RegisterVendorData = z.infer<typeof registerVendorSchema>;
type UpdateUserProfileData = z.infer<typeof updateUserProfileSchema>;

export class AuthService {

  // ... (registerUser, registerVendor, loginUser, loginVendor methods are all fine) ...
  // No changes needed for these methods.

  /**
   * Registers a new User
   */
  async registerUser(data: RegisterUserData) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        phoneNumber: data.phoneNumber, // Store phone number
      },
    });

    const payload: AuthPayload = {
      id: user.id,
      email: user.email,
      role: 'USER',
    };
    const token = this.generateToken(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Registers a new Vendor
   */
  async registerVendor(data: RegisterVendorData) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const vendor = await prisma.vendor.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        phoneNumber: data.phoneNumber, // Store phone number
        services: data.services,
      },
    });

    const payload: AuthPayload = {
      id: vendor.id,
      email: vendor.email,
      role: 'VENDOR',
    };
    const token = this.generateToken(payload);

    return {
      vendor: {
        id: vendor.id,
        email: vendor.email,
        name: vendor.name,
        phoneNumber: vendor.phoneNumber,
        role: vendor.role,
        services: vendor.services,
      },
      token,
    };
  }

  /**
   * Logs in a User
   */
  async loginUser(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      // This custom error will be caught by the router and turned into a 401
      throw new Error('Invalid email or password');
    }

    const payload: AuthPayload = {
      id: user.id,
      email: user.email,
      role: 'USER',
    };
    const token = this.generateToken(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Logs in a Vendor
   */
  async loginVendor(email: string, password: string) {
    const vendor = await prisma.vendor.findUnique({ where: { email } });

    if (!vendor || !(await bcrypt.compare(password, vendor.password))) {
      throw new Error('Invalid email or password');
    }

    const payload: AuthPayload = {
      id: vendor.id,
      email: vendor.email,
      role: 'VENDOR',
    };
    const token = this.generateToken(payload);

    return {
      vendor: {
        id: vendor.id,
        email: vendor.email,
        name: vendor.name,
        role: vendor.role,
        services: vendor.services,
      },
      token,
    };
  }

  /**
   * --- NEW METHOD ---
   * Gets a user's profile by their ID.
   */
  async getUserProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
      },
    });
  }

  /**
   * --- NEW METHOD ---
   * Updates a user's profile.
   */
  async updateUserProfile(userId: string, data: UpdateUserProfileData) {
    return prisma.user.update({
      where: { id: userId },
      data: data,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
      },
    });
  }

  /**
   * Generates a new JWT
   */
  generateToken(payload: AuthPayload): string {
    // --- FIX #2 ---
    // Use the guaranteed-to-be-string 'AppJwtSecret'
    return jwt.sign(payload, AppJwtSecret, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Verifies a JWT (used by auth middleware)
   */
  verifyToken(token: string): AuthPayload {
    // --- FIX #3 ---
    // Use 'AppJwtSecret' here as well
    return jwt.verify(token, AppJwtSecret) as AuthPayload;
  }
}

export const authService = new AuthService();