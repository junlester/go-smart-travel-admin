# TextBee.dev SMS Integration Setup Guide

This guide will help you set up TextBee.dev SMS notifications for the Go-Smart-Travel Admin Panel.

## What is TextBee.dev?

TextBee.dev is an open-source SMS gateway that allows you to use your Android phone as an SMS gateway for sending and receiving messages via API or web dashboard. This is a cost-effective solution for sending SMS notifications to your app users.

## ⚠️ IMPORTANT: Android Device Required

**TextBee.dev REQUIRES an Android device** to function. It converts your Android phone into an SMS gateway, so you MUST have:
- An Android device with an active SIM card
- The TextBee app installed on that device
- The device registered in your TextBee account

**If you don't want to use an Android device**, consider these alternatives:
- **Twilio** (cloud-based, no device needed) - See `SMS_PROVIDERS_OPTIONS.md`
- **Semaphore** (Philippines-based, no device needed) - See `SMS_PROVIDERS_OPTIONS.md`

## Prerequisites

1. **An Android device with an active SIM card** ⚠️ REQUIRED
2. A TextBee.dev account (sign up at https://textbee.dev) ✅ You already have this!
3. Admin Panel access to configure API keys

## Step 1: Install TextBee App on Android Device

1. Download the TextBee app from the official website: https://textbee.dev/quickstart
2. Install the app on your Android device
3. Grant all necessary permissions (SMS, Phone, etc.)

## Step 2: Register Your Android Device (REQUIRED)

**Since you already have a TextBee account, you just need to register your Android device:**

1. Go to https://textbee.dev/dashboard
2. Log in to your existing account ✅
3. Download and install the TextBee app on your Android device:
   - Download from: https://dl.textbee.dev
   - Install the app on your Android phone
   - Grant all necessary permissions (SMS, Phone, etc.)
4. Register your Android device:
   - In the TextBee dashboard, click "Register Device" or "Add Device"
   - Open the TextBee app on your Android device
   - Scan the QR code from the dashboard, OR
   - Manually enter the API key and device ID from the dashboard
5. Wait for the device to connect (you should see it in your dashboard)

## Step 3: Get API Credentials

1. Log in to your TextBee dashboard
2. Navigate to **API Settings** or **Settings → API**
3. Copy your **API Key**
4. Copy your **Device ID** (found after registering your device)

## Step 4: Configure Admin Panel

### Option A: Environment Variables (Recommended)

1. Create or update `.env.local` file in the `admin-panel/go-smart-travel-admin/` directory:

```env
TEXTBEE_API_KEY=your_api_key_here
TEXTBEE_DEVICE_ID=your_device_id_here
TEXTBEE_API_URL=https://api.textbee.dev/api/v1
```

2. Restart your Next.js development server:

```bash
npm run dev
```

### Option B: Direct Configuration (Not Recommended for Production)

1. Open `admin-panel/go-smart-travel-admin/src/constants/APIKeys.ts`
2. Replace the placeholder values:

```typescript
export const TEXTBEE_API_KEY = 'your_api_key_here';
export const TEXTBEE_DEVICE_ID = 'your_device_id_here';
export const TEXTBEE_API_URL = 'https://api.textbee.dev/api/v1';
```

## Step 5: Test SMS Sending

1. Start your admin panel: `npm run dev`
2. Navigate to the **Notifications** page in the admin panel
3. Try sending a test notification with SMS enabled
4. Check your Android device to ensure the SMS is sent
5. Verify the recipient receives the SMS

## Phone Number Format

**Important:** Phone numbers must be in E.164 format:
- Format: `+[country code][number]`
- Example: `+639123456789` (Philippines)
- Example: `+1234567890` (USA)

The admin panel automatically validates phone numbers before sending SMS.

## Features

### 1. Broadcast SMS to All Users
- Send SMS to all users in your database
- Automatically filters out admin users
- Validates phone numbers before sending

### 2. Segment-based SMS
- Send SMS to specific user segments
- Filter by user preferences or tags

### 3. Template SMS Notifications
- **Trip Reminders**: Automatic SMS reminders for upcoming trips
- **Weather Alerts**: SMS alerts for weather conditions
- **Promotional SMS**: SMS for promotions and special offers
- **Booking Confirmations**: SMS confirmations for bookings

### 4. Multi-channel Notifications
- Send SMS along with Push notifications and Email
- All channels work independently
- Detailed success/failure reporting for each channel

## API Endpoints

The TextBee integration uses the following API endpoint:

```
POST https://api.textbee.dev/api/v1/gateway/devices/{DEVICE_ID}/send-sms
```

**Headers:**
```
Content-Type: application/json
x-api-key: YOUR_API_KEY
```

**Request Body:**
```json
{
  "recipients": ["+639123456789"],
  "message": "Your SMS message here"
}
```

## Error Handling

The integration includes comprehensive error handling:

1. **Invalid Phone Numbers**: Automatically filtered out with error messages
2. **API Errors**: Detailed error logging and user-friendly error messages
3. **Network Errors**: Retry logic and error reporting
4. **Authentication Errors**: Clear messages for missing or invalid API keys

## Troubleshooting

### SMS Not Sending

1. **Check API Credentials**
   - Verify `TEXTBEE_API_KEY` and `TEXTBEE_DEVICE_ID` are correct
   - Ensure they are set in environment variables or `APIKeys.ts`

2. **Check Device Connection**
   - Ensure your Android device is connected to the internet
   - Verify the TextBee app is running on your device
   - Check if the device is registered in the TextBee dashboard

3. **Check Phone Number Format**
   - Ensure phone numbers are in E.164 format (`+[country code][number]`)
   - Verify phone numbers exist in Firebase user documents

4. **Check Logs**
   - Check the browser console for error messages
   - Check the server logs for detailed error information
   - Check the TextBee dashboard for delivery status

### API Key Not Working

1. **Regenerate API Key**
   - Go to TextBee dashboard → API Settings
   - Generate a new API key
   - Update the admin panel configuration

2. **Check Device Registration**
   - Ensure your device is properly registered
   - Verify the Device ID matches your registered device

### SMS Delivery Issues

1. **Check Device SIM Card**
   - Ensure your Android device has an active SIM card
   - Verify you have sufficient SMS credits/balance
   - Check if your carrier supports SMS sending

2. **Check Recipient Phone Numbers**
   - Verify the recipient phone numbers are valid
   - Ensure they are in the correct format (E.164)
   - Check if the recipients are blocking SMS from your number

## Cost Considerations

- TextBee.dev itself is free (open-source)
- You only pay for SMS through your mobile carrier
- Costs depend on your mobile plan and carrier rates
- Consider using this for low-volume SMS (hundreds per month)
- For high-volume SMS (thousands+), consider commercial SMS gateways

## Security Best Practices

1. **Never commit API keys to Git**
   - Use environment variables for API keys
   - Add `.env.local` to `.gitignore`

2. **Rotate API Keys Regularly**
   - Generate new API keys periodically
   - Update the admin panel configuration

3. **Limit API Access**
   - Use API keys only for SMS sending
   - Don't share API keys with unauthorized users

4. **Monitor Usage**
   - Regularly check the TextBee dashboard for usage
   - Monitor for unusual activity or errors

## Support

- **TextBee Documentation**: https://textbee.dev/docs
- **TextBee GitHub**: https://github.com/vernu/textbee
- **TextBee Dashboard**: https://textbee.dev/dashboard

## Next Steps

1. Set up TextBee.dev account and register your device
2. Configure API keys in the admin panel
3. Test SMS sending with a small group of users
4. Monitor delivery rates and adjust as needed
5. Scale up SMS notifications as needed

## Notes

- SMS sending is asynchronous - messages are queued and sent in the background
- The admin panel shows success/failure counts for each SMS batch
- Individual SMS results are logged for debugging
- Failed SMS are retried automatically (if supported by TextBee API)

---

**Last Updated**: 2024-11-09
**Integration Version**: 1.0.0

