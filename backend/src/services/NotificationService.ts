import twilio from 'twilio';
import prisma from '../lib/prisma.js';
import {
  NotificationType,
  NotificationStatus,
  SendNotificationParams,
  NotificationResponse,
  BulkNotificationParams,
} from '../types/notification.js';

class TwilioNotificationService {
  private client: ReturnType<typeof twilio>;
  private twilioPhoneNumber: string;
  private isConfigured: boolean = false;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID || '',
      process.env.TWILIO_AUTH_TOKEN || ''
    );
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
    
    // Validate configuration on initialization
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn('⚠️  Twilio credentials not fully configured. Notifications will be logged but not sent.');
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
      console.log('✅ Twilio notification service initialized');
      console.log(`📱 Twilio Phone: ${this.twilioPhoneNumber}`);
      console.log(`🔑 Account SID: ${process.env.TWILIO_ACCOUNT_SID?.substring(0, 5)}...`);
    }
  }

  /**
   * Send a single notification via SMS
   */
  async sendNotification(params: SendNotificationParams): Promise<NotificationResponse> {
    try {
      // Format phone number (ensure +1 prefix for US numbers if needed)
      const formattedPhone = this.formatPhoneNumber(params.phoneNumber);

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          phoneNumber: formattedPhone,
          message: params.message,
          type: params.type,
          userId: params.userId,
          vendorId: params.vendorId,
          tokenId: params.tokenId,
          status: NotificationStatus.PENDING,
        },
      });

      // Send SMS if Twilio is configured
      if (this.isConfigured) {
        try {
          const message = await this.client.messages.create({
            body: params.message,
            from: this.twilioPhoneNumber,
            to: formattedPhone,
          });

          // Update notification with Twilio message ID and status
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: NotificationStatus.SENT,
              sentAt: new Date(),
            },
          });

          console.log(`✅ SMS sent to ${formattedPhone} (MessageSID: ${message.sid})`);

          return {
            id: notification.id,
            status: NotificationStatus.SENT,
            messageId: message.sid,
          };
        } catch (twilioError) {
          const errorMessage = twilioError instanceof Error ? twilioError.message : 'Unknown Twilio error';
          
          // Update notification with failure status
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: NotificationStatus.FAILED,
              failedReason: errorMessage,
            },
          });

          console.error(`❌ Failed to send SMS to ${formattedPhone}:`, errorMessage);

          return {
            id: notification.id,
            status: NotificationStatus.FAILED,
            error: errorMessage,
          };
        }
      } else {
        // Demo mode: log notification instead of sending
        console.log(
          `📧 [DEMO MODE] Notification would be sent to ${formattedPhone}: "${params.message}"`
        );

        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
          },
        });

        return {
          id: notification.id,
          status: NotificationStatus.SENT,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in sendNotification:', errorMessage);
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(params: BulkNotificationParams): Promise<NotificationResponse[]> {
    const results: NotificationResponse[] = [];

    for (const notification of params.notifications) {
      try {
        const result = await this.sendNotification(notification);
        results.push(result);
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error sending bulk notification:', error);
        results.push({
          id: '',
          status: NotificationStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Format phone number to international format
   * Default country code can be set via environment variable (default: +91 for India)
   */
  private formatPhoneNumber(phone: string): string {
    if (!phone) {
      throw new Error('Phone number is empty');
    }

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length < 10) {
      throw new Error(`Phone number too short: ${cleaned} (need at least 10 digits)`);
    }

    // Get default country code from environment or use +91 (India)
    const defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || '91';

    // If 10 digits (local number), add default country code
    if (cleaned.length === 10) {
      const formatted = `+${defaultCountryCode}${cleaned}`;
      console.log(`📱 Phone formatted: ${phone} → ${formatted}`);
      return formatted;
    }

    // If 12 digits and starts with 91 (India with country code), add +
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      const formatted = `+${cleaned}`;
      console.log(`📱 Phone formatted: ${phone} → ${formatted}`);
      return formatted;
    }

    // If 11 digits and starts with 1 (US), add +
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const formatted = `+${cleaned}`;
      console.log(`📱 Phone formatted: ${phone} → ${formatted}`);
      return formatted;
    }

    // If already has country code (11+ digits), add + if missing
    if (cleaned.length > 10) {
      const formatted = phone.startsWith('+') ? phone : `+${cleaned}`;
      console.log(`📱 Phone formatted: ${phone} → ${formatted}`);
      return formatted;
    }

    // Return as-is if it already has proper format
    const result = phone.startsWith('+') ? phone : `+${cleaned}`;
    console.log(`📱 Phone formatted: ${phone} → ${result}`);
    return result;
  }

  /**
   * Build notification message based on token status with personalization
   */
  async buildStatusMessage(type: string, data: any): Promise<string> {
    try {
      // Fetch user and vendor names if we have IDs
      const userName = data.userName || 'User';
      const vendorName = data.vendorName || 'vendor';
      const serviceType = data.serviceType || 'request';
      
      // Format estimated time nicely
      const formatTime = (date: any) => {
        if (!date) return '';
        const estimatedDate = new Date(date);
        const now = new Date();
        const diffMs = estimatedDate.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMs / 3600000);
        
        if (diffMins < 60) return `${diffMins} minutes`;
        if (diffHours < 24) return `${diffHours} hours`;
        return estimatedDate.toLocaleDateString();
      };

      const messages: Record<string, string> = {
        'TOKEN_CREATED': `Hi ${userName}, your ${serviceType} request at ${vendorName} has been received! We'll notify you soon.`,
        
        'TOKEN_APPROVED': `Your request for ${serviceType} has been accepted by ${vendorName}. Position in queue is #${data.position}. Estimated wait time is ${formatTime(data.estimatedCompletion) || 'calculating...'}.`,
        
        'TOKEN_REJECTED': `Hi ${userName}, your ${serviceType} request at ${vendorName} could not be processed. Reason: ${data.reason || 'Vendor unable to assist'}. Please contact support.`,
        
        'TOKEN_QUEUED': `Hi ${userName}, your ${serviceType} request at ${vendorName} is in queue! Position: #${data.position}. ${data.position === 1 ? "You're next!" : `Estimated wait: ${formatTime(data.estimatedCompletion)}`}`,
        
        'TOKEN_IN_PROGRESS': `Great! ${userName}, your ${serviceType} request at ${vendorName} has started. The vendor is working on it now.`,
        
        'TOKEN_COMPLETED': `Your request for ${serviceType} from ${vendorName} has been finished. Please collect it at the counter.`,
        
        'TOKEN_CANCELLED': `Hi ${userName}, your ${serviceType} request at ${vendorName} has been cancelled. If you have questions, please contact support.`,
        
        'POSITION_UPDATED': `Update for ${userName}: Your position for ${serviceType} at ${vendorName} is now #${data.position}. ${data.position === 1 ? "You're next! Get ready!" : `Estimated wait: ${formatTime(data.estimatedCompletion)}`}`,
        
        'ETA_UPDATE': `${userName}, your estimated completion time for ${serviceType} at ${vendorName} is: ${formatTime(data.estimatedCompletion) || 'Checking...'} Stay tuned!`,
        
        'VENDOR_MESSAGE': `Message from ${vendorName} about your ${serviceType} request: ${data.vendorMessage}`,
      };

      return messages[type] || `Update on your ${serviceType} request at ${vendorName}`;
    } catch (error) {
      console.error('Error building status message:', error);
      // Fallback to simple message
      return `Update on your request #${data.tokenId}`;
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(userId: string, limit: number = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get failed notifications for retry
   */
  async getFailedNotifications() {
    return prisma.notification.findMany({
      where: { status: NotificationStatus.FAILED },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Retry failed notification
   */
  async retryFailedNotification(notificationId: string): Promise<NotificationResponse> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.sendNotification({
      phoneNumber: notification.phoneNumber,
      message: notification.message,
      type: notification.type as NotificationType,
      userId: notification.userId || undefined,
      vendorId: notification.vendorId || undefined,
      tokenId: notification.tokenId || undefined,
    });
  }

  /**
   * Check if Twilio is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      twilioPhoneNumber: this.twilioPhoneNumber,
      accountSid: process.env.TWILIO_ACCOUNT_SID ? '***' : 'NOT SET',
    };
  }
}

export default new TwilioNotificationService();