import { Request } from 'express';
export { NotificationType } from './notification.js';
export type { NotificationType as NotificationTypeType, NotificationStatus, SendNotificationParams, NotificationResponse, BulkNotificationParams, NotificationQueuedEvent } from './notification.js'; 

export interface AuthPayload {
  id: string;
  email: string;
  role: Role; 
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
  id: string;
  serviceType: string;
  createdAt: Date;
}


export interface SchedulingStrategy {
  readonly name: string;
  
  calculateQueue(tokens: QueueToken[]): QueueToken[];
  
  estimateCompletion(queuePosition: number, tokens: QueueToken[]): Date;
  
  getEstimatedDuration(serviceType: string): number;
}

export type Role = 'USER' | 'VENDOR' | 'ADMIN';