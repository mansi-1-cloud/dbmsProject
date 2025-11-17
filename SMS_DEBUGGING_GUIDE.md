# 🔧 SMS Not Being Sent - Debugging Guide

## Why SMS Might Not Be Sending

### ✅ Your Setup Checklist

**Backend Configuration:**
- [x] Twilio credentials configured in `.env`
  - ✓ TWILIO_ACCOUNT_SID set
  - ✓ TWILIO_AUTH_TOKEN set
  - ✓ TWILIO_PHONE_NUMBER set (+12404384738)
- [x] Notification model added to database
- [x] Phone numbers collected during signup
- [x] Logging added for debugging

---

## 🔍 Common Issues & Solutions

### Issue 1: User Phone Number Not Stored
**Problem:** User didn't provide phone number during signup
**Solution:**
1. Check user record in database: `SELECT * FROM users WHERE email='user@example.com';`
2. If phoneNumber is NULL, have user update profile with phone number
3. Phone must be at least 10 digits

### Issue 2: Phone Number Format Invalid
**Problem:** Phone number stored but not in correct format
**Examples of VALID formats:**
```
5551234567          → Becomes +15551234567
+1 (555) 123-4567   → Becomes +15551234567
+449876543210       → Stays +449876543210
(555) 123-4567      → Becomes +15551234567
```

**How to Fix:**
1. Phone numbers are auto-formatted by NotificationService
2. Check console logs for formatting messages:
   ```
   📱 Phone formatted: 555-123-4567 → +15551234567
   ```

### Issue 3: Twilio Credentials Wrong/Invalid
**Problem:** Credentials not accepted by Twilio API
**Check:**
1. Verify Account SID format: `ACxxxxxxxxxxxxxxxxxxxxxxxx`
2. Verify Auth Token is correct and not expired
3. Verify Phone Number format: `+1234567890`
4. Check .env file for typos

**How to Verify:**
1. Log into Twilio Console
2. Copy exact values from Account Info
3. Paste into `.env` file
4. Restart backend server

### Issue 4: Twilio Trial Account - Phone Not Verified
**Problem:** Recipient phone number not verified (trial accounts only)
**Solution:**
1. Go to Twilio Console → Phone Numbers → Verified Caller IDs
2. Add and verify the recipient phone number
3. Only verified numbers can receive SMS in trial accounts

### Issue 5: Token Not Moving to Queue
**Problem:** Notification code never runs because token doesn't enter queue
**Check:**
1. Create token with valid vendor
2. Check token status: `SELECT * FROM tokens WHERE id='token_id';`
3. Status should be QUEUED not PENDING
4. Only QUEUED tokens trigger notifications

---

## 🧪 How to Debug

### Step 1: Check Backend Logs
Watch console when creating a token:
```
📱 Sending notification for token abc123 to +15551234567
📱 Phone formatted: 5551234567 → +15551234567
✅ SMS sent to +15551234567 (MessageSID: SM123456...)
✅ Notification sent successfully for token abc123
```

### Step 2: Verify Phone in Database
```sql
-- Check user has phone number
SELECT email, name, phoneNumber FROM users LIMIT 5;

-- Check token exists with user
SELECT id, userId, status, estimatedCompletion FROM tokens LIMIT 5;

-- Check notification record created
SELECT phoneNumber, message, status FROM notifications LIMIT 5;
```

### Step 3: Check Twilio Account
1. Login to Twilio Console
2. Go to Message Logs
3. Look for your test messages
4. Check status: SENT, FAILED, QUEUED, etc.
5. If FAILED, click for error details

### Step 4: Manual API Test
```bash
# Send test notification manually
curl -X POST http://localhost:4000/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "phoneNumber": "+15551234567",
    "message": "Test SMS from QueueFlow",
    "type": "TOKEN_QUEUED"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "id": "notification_123",
    "status": "SENT",
    "messageId": "SMxxxxxxxxxxxxx"
  }
}
```

---

## 📱 SMS Flow

```
1. User Signup
   ├─ User enters phone number
   └─ Phone stored in database

2. Token Created
   └─ Status: PENDING

3. Token Added to Queue
   ├─ Status: QUEUED
   ├─ QueueManager.addToQueue() called
   ├─ Phone number retrieved from database
   ├─ NotificationService.sendNotification() called
   ├─ 📱 Phone formatted (if needed)
   ├─ SMS sent to Twilio API
   └─ Response stored in notifications table

4. Twilio Sends SMS
   ├─ SMS queued in Twilio
   ├─ Routed to carrier
   ├─ Delivered to phone
   └─ Status updated to SENT/FAILED

5. Notification Status
   └─ Check in notifications table: SELECT * FROM notifications;
```

---

## 🐛 Enable Full Debug Logging

Add this to `NotificationService` to see exact API calls:

```typescript
// In NotificationService constructor
if (this.isConfigured) {
  console.log('🔐 Twilio Config:');
  console.log('  Account SID:', process.env.TWILIO_ACCOUNT_SID?.substring(0, 10) + '...');
  console.log('  Phone Number:', process.env.TWILIO_PHONE_NUMBER);
}
```

Console output will show:
```
✅ Twilio notification service initialized
📱 Twilio Phone: +12404384738
🔑 Account SID: AC1ed31d0c...
📱 Phone formatted: 5551234567 → +15551234567
✅ SMS sent to +15551234567 (MessageSID: SMxxxxx)
```

---

## ✅ Verification Checklist

Before troubleshooting, verify:

- [ ] User has valid phone number (10+ digits)
- [ ] Phone number stored in database (`SELECT phoneNumber FROM users WHERE email='...'`)
- [ ] Token status is QUEUED (not PENDING)
- [ ] Twilio credentials in `.env` are correct
- [ ] TWILIO_PHONE_NUMBER is verified in Twilio Console
- [ ] Recipient phone number is verified (trial accounts)
- [ ] Backend is running and logs show notifications
- [ ] No errors in console logs
- [ ] Check `notifications` table for SMS records

---

## 🆘 If Still Not Working

1. **Check Console Logs:**
   - Look for "⚠️ Twilio credentials not fully configured"
   - Look for "❌ Failed to send SMS"
   - Look for phone formatting errors

2. **Test Twilio Directly:**
   ```bash
   curl -X POST https://api.twilio.com/2010-04-01/Accounts/YOUR_SID/Messages.json \
     -u YOUR_SID:YOUR_TOKEN \
     -d "From=+12404384738" \
     -d "To=+15551234567" \
     -d "Body=Test message"
   ```

3. **Check Database:**
   ```sql
   SELECT * FROM notifications ORDER BY createdAt DESC LIMIT 1;
   SELECT * FROM users WHERE email='your_email';
   ```

4. **Restart Backend:**
   - Kill backend process
   - Start fresh: `npm run dev`
   - Watch logs during token creation

5. **Enable Debug Mode:**
   - Edit NotificationService
   - Add console.log() statements
   - Restart backend
   - Create test token

---

## 📊 Quick Test Scenario

1. **Signup as User**
   - Email: `test@example.com`
   - Name: `Test User`
   - Password: `Test123!`
   - Phone: `5551234567` (your actual phone)

2. **Create Token**
   - Select any vendor
   - Enter service type
   - Watch console for SMS logs

3. **Check Results**
   - Phone should receive SMS in ~10 seconds
   - Console should show ✅ logs
   - Check `notifications` table

---

## 🔗 Useful Links

- Twilio Console: https://console.twilio.com
- Message Logs: https://console.twilio.com/logs/sms/messages
- Verified Numbers: https://console.twilio.com/phone-numbers/verified
- Billing: https://console.twilio.com/account/billing

---

## 💡 Pro Tips

1. **Use Twilio Test Credentials First:**
   - Sign up for free trial
   - Get $15 free credit
   - Test before going live

2. **Monitor Notification Table:**
   - All SMS attempts logged
   - Check status field for failures
   - See exact error messages

3. **Log All Events:**
   - Console logs show real-time events
   - Helpful for debugging
   - Can be disabled in production

4. **Verify Phone Formats:**
   - Always use +country format
   - For US: +1 + 10 digits
   - For others: +country + number

---

**Status:** ✅ SMS System Ready
**Last Updated:** November 17, 2025

For support, check console logs first - they'll show exactly what's happening!
