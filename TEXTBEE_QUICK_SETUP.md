# TextBee.dev Quick Setup Guide

## Step 1: Create .env.local File

1. Navigate to `admin-panel/go-smart-travel-admin/` directory
2. Create a new file named `.env.local`
3. Add the following content:

```env
# TextBee.dev SMS Gateway Configuration
TEXTBEE_API_KEY=f0925a1a-f615-41ac-972d-767b86deaa06
TEXTBEE_DEVICE_ID=6910d862529b72ab6deef473
TEXTBEE_API_URL=https://api.textbee.dev/api/v1
```

## Step 2: Get Your Device ID

**You need to register an Android device first to get the Device ID:**

1. **Install TextBee App on Android Device:**
   - Download from: https://dl.textbee.dev
   - Install on your Android phone
   - Grant all necessary permissions (SMS, Phone, etc.)

2. **Register Device in TextBee Dashboard:**
   - Go to https://textbee.dev/dashboard
   - Log in to your account
   - Click "Register Device" or "Add Device"
   - Open TextBee app on your Android device
   - Scan the QR code from the dashboard, OR
   - Manually enter the connection details

3. **Get Device ID:**
   - After device is registered, go to your TextBee dashboard
   - You should see your device listed
   - Copy the Device ID (it will look like: `device_xxxxx` or similar)

4. **Update .env.local:**
   - Replace `your_device_id_here` with your actual Device ID

## Step 3: Restart Admin Panel

After updating `.env.local`, restart your Next.js development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Step 4: Test SMS Sending

1. Start your admin panel: `npm run dev`
2. Navigate to the **Notifications** page
3. Try sending a test notification with SMS enabled
4. Check your Android device to ensure the SMS is sent
5. Verify the recipient receives the SMS

## Current Configuration

✅ **API Key**: `f0925a1a-f615-41ac-972d-767b86deaa06` (configured)
✅ **Device ID**: `6910d862529b72ab6deef473` (configured)
✅ **API URL**: `https://api.textbee.dev/api/v1` (default)

## Troubleshooting

### Device ID Not Found
- Make sure you've registered your Android device in the TextBee dashboard
- Check that the device is connected and online
- Verify the Device ID is copied correctly (no extra spaces)

### SMS Not Sending
- Check that your Android device is connected to the internet
- Verify the TextBee app is running on your device
- Check that your device has an active SIM card
- Verify phone numbers are in E.164 format (`+639123456789`)

### API Key Invalid
- Verify the API key is correct: `f0925a1a-f615-41ac-972d-767b86deaa06`
- Check that there are no extra spaces or characters
- Make sure the `.env.local` file is in the correct location

## Next Steps

1. ✅ API Key configured
2. ⏳ Register Android device and get Device ID
3. ⏳ Update `.env.local` with Device ID
4. ⏳ Test SMS sending

## Security Note

⚠️ **Never commit `.env.local` to Git!** 
- The `.env.local` file is already in `.gitignore`
- Keep your API keys secure
- Don't share your API keys publicly

---

**Last Updated**: 2024-11-09

