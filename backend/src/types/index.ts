import { Request } from 'express';

export interface AuthPayload {
  id: string;
  email: string;
  role: 'USER' | 'VENDOR';
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

export interface QueueToken {
  tokenId: string;
  serviceType: string;
  estimatedDuration: number; // in minutes
  createdAt: Date;
}

export interface SchedulingStrategy {
  name: string;
  calculateQueue(tokens: QueueToken[]): QueueToken[];
  estimateCompletion(queuePosition: number, tokens: QueueToken[]): Date;
}
