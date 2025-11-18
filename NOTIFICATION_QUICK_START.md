# Twilio SMS Notification System - Quick Reference

## Files Created/Modified

### New Files
1. `src/services/NotificationService.ts` - Core Twilio service
2. `src/types/notification.ts` - TypeScript interfaces
3. `src/routes/notification.routes.ts` - API endpoints
4. `.env.example` - Environment variables template
5. `NOTIFICATION_SETUP.md` - Full setup guide

### Modified Files
1. `prisma/schema.prisma` - Added Notification model
2. `src/types/index.ts` - Exported notification types
3. `src/services/QueueManager.ts` - Integrated notifications
4. `src/index.ts` - Added notification routes

## Quick Setup (3 Steps)

### 1. Install Package
```bash
cd backend
npm install twilio
```
✅ Already done!

### 2. Set Environment Variables
```bash
# In .env file (create if doesn't exist)
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Run Migration
```bash
npx prisma migrate dev --name add_notification_model
```

## Key Features

✅ **Automatic Notifications** - Sent when tokens move in queue  
✅ **SMS via Twilio** - Industry-standard SMS provider  
✅ **Demo Mode** - Works without Twilio credentials (logs only)  
✅ **Retry Logic** - Automatic failure recovery  
✅ **Database Tracking** - All notifications logged  
✅ **REST API** - Full control via endpoints  
✅ **Phone Formatting** - Supports international numbers  

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/notifications/send` | Send single SMS |
| POST | `/api/notifications/send-bulk` | Send multiple SMS |
| GET | `/api/notifications/history` | Get sent notifications |
| GET | `/api/notifications/failed` | Get failed notifications |
| POST | `/api/notifications/retry/:id` | Retry failed notification |
| GET | `/api/notifications/status` | Check service status |

## When Notifications Are Sent

1. **TOKEN_QUEUED** - When token added to queue
2. **POSITION_UPDATED** - When queue position changes (top 3 only)
3. **TOKEN_IN_PROGRESS** - When token starts processing

## Automatic Notification Messages

```
📱 TOKEN_QUEUED
   "Your token #abc123 is now in queue at position 2."

📱 POSITION_UPDATED
   "Your token #abc123 queue position updated to 1."

📱 TOKEN_IN_PROGRESS
   "Your token #abc123 is now being processed."
```

## Phone Number Support

All formats automatically converted:
- ✅ `1234567890` → `+11234567890`
- ✅ `(123) 456-7890` → `+11234567890`
- ✅ `+1 123 456 7890` → `+11234567890`
- ✅ `+449876543210` (international)

## Testing Without Twilio

The system runs in **demo mode** if credentials not set:

```typescript
// Console output shows what would be sent:
📧 [DEMO MODE] Notification would be sent to +11234567890: "..."
```

Perfect for development!

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Twilio not configured" | Set all 3 env variables |
| "Invalid phone number" | Add country code (+1 for US) |
| SMS not received | Check if number verified (trial account) |
| Failed notifications | Check `/api/notifications/failed` |

## Cost Breakdown

| Region | Cost per SMS |
|--------|-------------|
| US/Canada | $0.0075 |
| Europe | $0.01-0.05 |
| Others | $0.05-0.50 |
| **1000/month estimate** | **~$7.50** |

## Next Steps

1. Get Twilio account at https://twilio.com
2. Copy credentials to `.env` file
3. Run Prisma migration
4. Test with API endpoint or test phone number
5. Deploy and monitor

---

**Status:** ✅ Ready to use  
**Created:** November 17, 2025
