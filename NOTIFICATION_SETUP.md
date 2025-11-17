# Notification System Setup Guide

## Overview
This guide explains how to set up and use the Twilio-based SMS notification system for your QueueFlow application.

## What's Included

### 1. **Notification Model** (Prisma)
- Stores all sent/failed notifications in the database
- Tracks message status, phone numbers, and notification types
- Indexed for efficient queries

### 2. **NotificationService** (`src/services/NotificationService.ts`)
- Core service for sending SMS notifications via Twilio
- Demo mode support (logs notifications without sending if Twilio not configured)
- Handles phone number formatting
- Retry mechanism for failed notifications
- Built-in message templates

### 3. **Queue Integration**
- Notifications sent automatically when:
  - Token added to queue
  - Token moves in queue position
  - Token starts processing (IN_PROGRESS)

### 4. **REST API Endpoints** (`/api/notifications`)
- `GET /history` - Notification history for user
- `POST /send` - Send single notification
- `POST /send-bulk` - Send multiple notifications
- `GET /failed` - Get failed notifications
- `POST /retry/:notificationId` - Retry failed notification
- `GET /status` - Service health check

## Setup Steps

### Step 1: Get Twilio Credentials

1. Sign up at [Twilio](https://www.twilio.com)
2. Get your credentials:
   - Account SID
   - Auth Token
   - Phone Number (your Twilio number)

### Step 2: Configure Environment Variables

Edit `.env` file in the backend directory:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 3: Run Prisma Migration

```bash
cd backend
npx prisma migrate dev --name add_notification_model
```

This creates the `notifications` table in your database.

### Step 4: Ensure Phone Numbers Are Stored

Make sure your User and Vendor models have valid phone numbers. The system requires:
- User phone number (optional but needed for notifications)
- Vendor phone number (optional but needed for notifications)

Example phone formats supported:
- `1234567890` (10 digits - US)
- `+11234567890` (with country code)
- `+449876543210` (international)

## Usage

### Automatic Notifications

Notifications are sent automatically for these events:

1. **TOKEN_QUEUED** - When a token is added to queue
2. **POSITION_UPDATED** - When queue position changes
3. **TOKEN_IN_PROGRESS** - When token starts processing

### Manual Notifications

Send notifications via API:

```bash
# Single notification
curl -X POST http://localhost:5000/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d {
    "phoneNumber": "+11234567890",
    "message": "Your service is ready!",
    "type": "TOKEN_COMPLETED"
  }

# Bulk notifications
curl -X POST http://localhost:5000/api/notifications/send-bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d {
    "notifications": [
      {
        "phoneNumber": "+11234567890",
        "message": "Message 1",
        "type": "TOKEN_QUEUED"
      },
      {
        "phoneNumber": "+11234567891",
        "message": "Message 2",
        "type": "TOKEN_IN_PROGRESS"
      }
    ]
  }
```

### Check Service Status

```bash
curl http://localhost:5000/api/notifications/status
```

### Retry Failed Notifications

```bash
curl -X POST http://localhost:5000/api/notifications/retry/NOTIFICATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Demo Mode

If Twilio is not configured, the system runs in **demo mode**:
- ✅ All notifications are logged to console
- ✅ No actual SMS is sent
- ✅ Useful for development and testing
- ✅ Database records still created

Example console output:
```
📧 [DEMO MODE] Notification would be sent to +11234567890: "Your token #abc123 is now in queue at position 1."
```

## Notification Templates

The system includes pre-built templates for:
- `TOKEN_CREATED` - Token creation confirmation
- `TOKEN_APPROVED` - Token approval notification
- `TOKEN_QUEUED` - Added to queue
- `TOKEN_IN_PROGRESS` - Processing started
- `TOKEN_COMPLETED` - Completion notification
- `TOKEN_CANCELLED` - Cancellation notice
- `POSITION_UPDATED` - Queue position change
- `ETA_UPDATE` - Estimated time update
- `VENDOR_MESSAGE` - Custom vendor message

## Testing

### Test with Twilio Sandbox (Free)

1. Set up a Twilio phone number (free trial)
2. Verify your test phone numbers in Twilio console
3. Use those numbers to test

### Test Phone Numbers (Twilio Trial)

During trial, you must verify phone numbers:
1. Go to Twilio Console → Phone Numbers
2. Verify your test phone numbers
3. Only verified numbers can receive SMS

## Troubleshooting

### Issue: "Twilio credentials not fully configured"
**Solution:** Check that all three environment variables are set:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### Issue: "Invalid phone number"
**Solution:** Ensure phone numbers include country code (e.g., +1 for US)

### Issue: "Failed to send SMS"
**Solution:** 
1. Check Twilio account balance
2. Verify recipient phone number is valid
3. Check if phone number is verified (trial accounts)

### Issue: Notifications not sent automatically
**Solution:**
1. Ensure user has phone number in database
2. Check database for notification records
3. Verify Twilio credentials are correct

## Best Practices

1. **Always validate phone numbers** - Use proper formatting
2. **Use rate limiting** - Avoid sending too many messages
3. **Monitor failed notifications** - Check `/api/notifications/failed` regularly
4. **Test with demo mode first** - Before going live
5. **Keep auth tokens secure** - Never commit credentials
6. **Use environment variables** - For all sensitive data

## Cost Estimate

Twilio SMS pricing (varies by region):
- **US/Canada:** ~$0.0075 per SMS
- **International:** Varies, typically $0.01-0.50 per SMS
- **Trial account:** $15 free credit

For 1000 notifications/month to US numbers: ~$7.50/month

## Advanced Configuration

### Custom Message Templates

Edit `NotificationService.buildStatusMessage()` to customize messages:

```typescript
private buildStatusMessage(type: NotificationType, data: any): string {
  // Customize messages here
}
```

### Queue Position Notification Limit

Currently notifies only top 3 positions. To change:

```typescript
if (i + 1 <= 3) {  // Change 3 to your desired limit
  // Send notification
}
```

### Retry Logic

Failed notifications can be retried via API or via scheduled job:

```typescript
const failedNotifications = await notificationService.getFailedNotifications();
for (const notification of failedNotifications) {
  await notificationService.retryFailedNotification(notification.id);
}
```

## Production Checklist

- [ ] Twilio account fully set up with paid credits
- [ ] All environment variables configured
- [ ] Database migration completed
- [ ] Phone numbers validated for all users
- [ ] Test SMS sent successfully
- [ ] Error handling tested
- [ ] Rate limiting configured
- [ ] Notification history backed up
- [ ] Monitoring alerts set up

## Support

For issues with:
- **Twilio API:** See [Twilio Docs](https://www.twilio.com/docs)
- **Our system:** Check logs or raise an issue

---

**Last Updated:** November 17, 2025
