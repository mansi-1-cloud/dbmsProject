import prisma from '../lib/prisma.js';
import { queueManager } from './QueueManager.js';
import { HttpError } from '../lib/errors.js';
import { AuthPayload } from '../types/index.js';
import { z } from 'zod';
import { updateVendorProfileSchema, updateVendorServicesSchema, addVendorServiceSchema } from '../validators/schemas.js';

type UpdateProfileData = z.infer<typeof updateVendorProfileSchema>;
type UpdateServicesData = z.infer<typeof updateVendorServicesSchema>;
type AddServiceData = z.infer<typeof addVendorServiceSchema>;

class VendorService {
  async getAllVendors() {
    return prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        services: true,
      },
    });
  }

  
  async getVendorQueue(vendorId: string, user?: AuthPayload) {
    if (user && user.role === 'VENDOR' && user.id !== vendorId) {
      throw new HttpError('Unauthorized', 403);
    }
    return queueManager.getVendorQueue(vendorId);
  }

  
  async getPendingTokens(vendorId: string, userId: string) {
    await this.findAndAuthorizeVendor(vendorId, userId); 
    return prisma.token.findMany({
      where: {
        vendorId,
        status: 'PENDING',
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

 
  async getVendorStats(vendorId: string, userId: string) {
    await this.findAndAuthorizeVendor(vendorId, userId);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [pendingCount, activeCount, completedToday, completedTotal] = await Promise.all([
      prisma.token.count({
        where: {
          vendorId,
          status: 'PENDING',
        },
      }),
      prisma.token.count({
        where: {
          vendorId,
          status: { in: ['QUEUED', 'IN_PROGRESS'] },
        },
      }),
      prisma.token.count({
        where: {
          vendorId,
          status: 'COMPLETED',
          updatedAt: {
            gte: startOfToday,
          },
        },
      }),
      prisma.token.count({
        where: {
          vendorId,
          status: 'COMPLETED',
        },
      }),
    ]);

    return {
      pendingCount,
      activeCount,
      completedToday,
      completedTotal,
    };
  }

  
  async getVendorProfile(vendorId: string, userId: string) {
    const vendor = await this.findAndAuthorizeVendor(vendorId, userId);
    return {
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      phoneNumber: vendor.phoneNumber,
      address: vendor.address,
      services: vendor.services,
      createdAt: vendor.createdAt,
    };
  }

 
  async updateVendorProfile(vendorId: string, userId: string, data: UpdateProfileData) {
    await this.findAndAuthorizeVendor(vendorId, userId);
    
    return prisma.vendor.update({
      where: { id: vendorId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
        ...(data.address !== undefined && { address: data.address }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        services: true,
      },
    });
  }

  
  async updateVendorServices(vendorId: string, userId: string, data: UpdateServicesData) {
    await this.findAndAuthorizeVendor(vendorId, userId);
    
    const uniqueServices = [...new Set(data.services.map((s) => s.trim().toLowerCase()))];

    return prisma.vendor.update({
      where: { id: vendorId },
      data: { services: uniqueServices },
      select: { id: true, name: true, email: true, services: true },
    });
  }

  
  async addVendorService(vendorId: string, userId: string, data: AddServiceData) {
    const vendor = await this.findAndAuthorizeVendor(vendorId, userId);
    const { service } = data; // Already trimmed/lowercased by Zod

    if (vendor.services.includes(service)) {
      throw new HttpError('Service already exists', 400);
    }

    return prisma.vendor.update({
      where: { id: vendorId },
      data: {
        services: [...vendor.services, service],
      },
      select: { id: true, name: true, email: true, services: true },
    });
  }

 
  async removeVendorService(vendorId: string, userId: string, serviceName: string) {
    const vendor = await this.findAndAuthorizeVendor(vendorId, userId);
    const normalizedServiceName = serviceName.trim().toLowerCase();

    if (!vendor.services.includes(normalizedServiceName)) {
      throw new HttpError('Service not found', 404);
    }
    if (vendor.services.length === 1) {
      throw new HttpError('Cannot remove the last service', 400);
    }

    return prisma.vendor.update({
      where: { id: vendorId },
      data: {
        services: vendor.services.filter((s) => s !== normalizedServiceName),
      },
      select: { id: true, name: true, email: true, services: true },
    });
  }

  
  private async findAndAuthorizeVendor(vendorId: string, userId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new HttpError('Vendor not found', 404);
    }
    if (vendor.id !== userId) {
      throw new HttpError('Unauthorized', 403);
    }
    return vendor;
  }
}

export const vendorService = new VendorService();
