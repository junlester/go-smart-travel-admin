# SMS Notification Fix Guide

## Problem
Getting "Access denied" error when sending SMS notifications. This means the OneSignal REST API Key is invalid or incorrect.

## Solution

### Step 1: Verify Your OneSignal REST API Key

1. Go to https://onesignal.com/
2. Log in to your account
3. Select your app: **Go Smart Travel App**
4. Navigate to **Settings** → **Keys & IDs**
5. Copy the **REST API Key** (it should start with `os_v2_app_` or `os_v1_app_`)

### Step 2: Update the API Key in Code

Open this file:
```
admin-panel/go-smart-travel-admin/src/utils/oneSignalService.ts
```

Find line 9 and update the REST API Key:
```typescript
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || 'YOUR_FULL_REST_API_KEY_HERE';
```

**Important:**
- Copy the ENTIRE key (it's very long, 100+ characters)
- Make sure there are NO spaces or line breaks
- The key should start with `os_v2_app_` or `os_v1_app_`

### Step 3: Use Environment Variable (Recommended)

Create a `.env.local` file in the admin panel directory:
```
ONESIGNAL_REST_API_KEY=your_full_rest_api_key_here
```

Then update line 9 in `oneSignalService.ts`:
```typescript
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || 'fallback_key_here';
```

### Step 4: Restart the Server

After updating the key, restart your Next.js development server:
```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

### Step 5: Test Again

Try sending a notification from the admin panel. The error should be gone if the API key is correct.

## Common Issues

### Issue 1: Key is Truncated
**Problem:** The key might be cut off when copying
**Solution:** Make sure you copy the entire key, it should be very long

### Issue 2: Wrong Key Type
**Problem:** Using App ID instead of REST API Key
**Solution:** Make sure you're using the REST API Key, not the App ID

### Issue 3: Key from Wrong App
**Problem:** Using a key from a different OneSignal app
**Solution:** Make sure you're using the key from the correct app (Go Smart Travel App)

### Issue 4: Key Has Spaces
**Problem:** Extra spaces or line breaks in the key
**Solution:** Remove all spaces and ensure the key is on one line

## Verification

After updating, check the browser console or server logs. You should see:
- ✅ `📱 SMS notification sent:` with a notification ID
- ❌ No more "Access denied" errors

## Still Not Working?

If you're still getting errors:

1. **Double-check the key** in OneSignal dashboard
2. **Regenerate the key** in OneSignal if needed (Settings → Keys & IDs → Regenerate)
3. **Check the App ID** matches your OneSignal app
4. **Verify Twilio is configured** in OneSignal for SMS (Settings → SMS & Voice → Configure Twilio)

## Need Help?

If the issue persists:
1. Check the server logs for detailed error messages
2. Verify your OneSignal account is active
3. Ensure SMS is enabled in your OneSignal app settings
4. Check if Twilio is properly connected in OneSignal










