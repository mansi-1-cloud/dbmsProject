export const NotificationType = {
  TOKEN_CREATED: 'TOKEN_CREATED',
  TOKEN_APPROVED: 'TOKEN_APPROVED',
  TOKEN_REJECTED: 'TOKEN_REJECTED',
  TOKEN_QUEUED: 'TOKEN_QUEUED',
  TOKEN_IN_PROGRESS: 'TOKEN_IN_PROGRESS',
  TOKEN_COMPLETED: 'TOKEN_COMPLETED',
  TOKEN_CANCELLED: 'TOKEN_CANCELLED',
  POSITION_UPDATED: 'POSITION_UPDATED',
  ETA_UPDATE: 'ETA_UPDATE',
  VENDOR_MESSAGE: 'VENDOR_MESSAGE',
} as const;

export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DELIVERED = 'DELIVERED',
}

export interface SendNotificationParams {
  phoneNumber: string;
  message: string;
  type: string; // Allow any string for flexibility
  userId?: string;
  vendorId?: string;
  tokenId?: string;
}

export interface NotificationResponse {
  id: string;
  status: NotificationStatus;
  messageId?: string;
  error?: string;
}

export interface BulkNotificationParams {
  notifications: SendNotificationParams[];
}

export interface NotificationQueuedEvent {
  tokenId: string;
  userId: string;
  vendorId: string;
  queuePosition: number;
  estimatedCompletion: Date;
  phoneNumber: string;
  serviceType: string;
}
