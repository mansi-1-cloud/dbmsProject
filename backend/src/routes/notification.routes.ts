import express, { Router } from 'express';
import { z } from 'zod';
import notificationService from '../services/NotificationService.js';
import { authenticate } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router: Router = express.Router();

// Validation schemas
const SendNotificationSchema = z.object({
  phoneNumber: z.string().min(10, 'Invalid phone number'),
  message: z.string().min(1, 'Message is required'),
  type: z.string(),
});

const BulkNotificationSchema = z.object({
  notifications: z.array(SendNotificationSchema),
});

/**
 * Get notification history for the authenticated user
 * GET /api/notifications/history
 */
router.get('/history', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt((req.query.limit as string) || '50', 10);
    const notifications = await notificationService.getNotificationHistory(userId, limit);

    return res.json({
      success: true,
      data: notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    return res.status(500).json({ error: 'Failed to fetch notification history' });
  }
});

/**
 * Send a single notification (admin/dev use)
 * POST /api/notifications/send
 */
router.post('/send', authenticate, async (req: AuthRequest, res) => {
  try {
    // Validate request body
    const validation = SendNotificationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }

    const result = await notificationService.sendNotification({
      phoneNumber: validation.data.phoneNumber,
      message: validation.data.message,
      type: validation.data.type as any,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * Send bulk notifications (admin use)
 * POST /api/notifications/send-bulk
 */
router.post('/send-bulk', authenticate, async (req: AuthRequest, res) => {
  try {
    // Validate request body
    const validation = BulkNotificationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }

    const results = await notificationService.sendBulkNotifications({
      notifications: validation.data.notifications,
    });

    const successful = results.filter(r => r.status === 'SENT').length;
    const failed = results.filter(r => r.status === 'FAILED').length;

    return res.json({
      success: true,
      data: results,
      summary: {
        total: results.length,
        successful,
        failed,
      },
    });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    return res.status(500).json({ error: 'Failed to send bulk notifications' });
  }
});

/**
 * Get failed notifications (admin use)
 * GET /api/notifications/failed
 */
router.get('/failed', authenticate, async (req: AuthRequest, res) => {
  try {
    const failedNotifications = await notificationService.getFailedNotifications();

    return res.json({
      success: true,
      data: failedNotifications,
      count: failedNotifications.length,
    });
  } catch (error) {
    console.error('Error fetching failed notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch failed notifications' });
  }
});

/**
 * Retry a failed notification
 * POST /api/notifications/retry/:notificationId
 */
router.post('/retry/:notificationId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { notificationId } = req.params;

    const result = await notificationService.retryFailedNotification(notificationId);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error retrying notification:', error);
    return res.status(500).json({ error: 'Failed to retry notification' });
  }
});

/**
 * Get service status
 * GET /api/notifications/status
 */
router.get('/status', async (req, res) => {
  try {
    const status = notificationService.getStatus();
    return res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error getting notification service status:', error);
    return res.status(500).json({ error: 'Failed to get service status' });
  }
});

export default router;
