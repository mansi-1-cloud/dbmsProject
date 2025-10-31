import { Request } from 'express';


// --- NEW/UPDATED ---
// Define the roles as a specific union type.
// This ensures we can't make a typo (e.g., requireRole('USR'))
export type Role = 'USER' | 'VENDOR' | 'ADMIN'; // Add any other roles you have

export interface AuthPayload {
  id: string;
  email: string;
  role: Role; // Use the specific 'Role' type here
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface TokenWithETA {
  id: string;
  userId: string;
  vendorId: string;
  serviceType: string;
  params?: any;
  status: string;
  estimatedCompletion: Date | null;
  vendorMessage: string | null;
  queuePosition: number | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    name: string;
    email: string;
  };
}

/**
 * --- UPDATED ---
 * Represents the raw data needed for scheduling.
 * 'estimatedDuration' was removed as it's calculated by the strategy.
 * 'tokenId' was changed to 'id' for consistency with Prisma.
 */
export interface QueueToken {
  id: string;
  serviceType: string;
  createdAt: Date;
}

/**
 * --- UPDATED ---
 * The "contract" for all scheduling strategies.
 * 'getEstimatedDuration' is now required, fixing the error.
 */
export interface SchedulingStrategy {
  readonly name: string;
  
  calculateQueue(tokens: QueueToken[]): QueueToken[];
  
  estimateCompletion(queuePosition: number, tokens: QueueToken[]): Date;
  
  getEstimatedDuration(serviceType: string): number;
}