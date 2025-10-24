import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { AuthPayload } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

export class AuthService {
  async registerUser(email: string, name: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: 'USER',
    });

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

  async registerVendor(email: string, name: string, password: string, services: string[]) {
    const hashedPassword = await bcrypt.hash(password, 10);

    const vendor = await prisma.vendor.create({
      data: {
        email,
        name,
        password: hashedPassword,
        services,
      },
    });

    const token = this.generateToken({
      id: vendor.id,
      email: vendor.email,
      role: 'VENDOR',
    });

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

  async loginUser(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: 'USER',
    });

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

  async loginVendor(email: string, password: string) {
    const vendor = await prisma.vendor.findUnique({ where: { email } });

    if (!vendor || !(await bcrypt.compare(password, vendor.password))) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken({
      id: vendor.id,
      email: vendor.email,
      role: 'VENDOR',
    });

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

  generateToken(payload: AuthPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  verifyToken(token: string): AuthPayload {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  }
}

export const authService = new AuthService();
