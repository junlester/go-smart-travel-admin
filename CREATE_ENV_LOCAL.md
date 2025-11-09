# Create .env.local File - Quick Guide

## Step 1: Create .env.local File

1. Navigate to `admin-panel/go-smart-travel-admin/` directory
2. Create a new file named `.env.local` (with the dot at the beginning)
3. Copy and paste the following content:

```env
# TextBee.dev SMS Gateway Configuration
TEXTBEE_API_KEY=f0925a1a-f615-41ac-972d-767b86deaa06
TEXTBEE_DEVICE_ID=6910d862529b72ab6deef473
TEXTBEE_API_URL=https://api.textbee.dev/api/v1
```

## Step 2: Verify File Location

Make sure the `.env.local` file is in the correct location:
```
admin-panel/go-smart-travel-admin/.env.local
```

## Step 3: Restart Admin Panel

After creating the `.env.local` file, restart your Next.js development server:

```bash
# Stop the current server (Ctrl+C or Cmd+C)
# Then restart:
npm run dev
```

## Step 4: Test SMS Sending

1. Start your admin panel: `npm run dev`
2. Navigate to the **Notifications** page in the admin panel
3. Try sending a test notification with SMS enabled
4. Check your Android device to ensure the SMS is sent
5. Verify the recipient receives the SMS

## Configuration Summary

✅ **API Key**: `f0925a1a-f615-41ac-972d-767b86deaa06`
✅ **Device ID**: `6910d862529b72ab6deef473`
✅ **API URL**: `https://api.textbee.dev/api/v1`

## Important Notes

1. **File Name**: Must be exactly `.env.local` (with the dot at the beginning)
2. **Location**: Must be in `admin-panel/go-smart-travel-admin/` directory
3. **Security**: Never commit this file to Git (it's already in `.gitignore`)
4. **Restart Required**: You must restart the server after creating/updating `.env.local`

## Troubleshooting

### File Not Found Error
- Make sure the file is named exactly `.env.local` (not `env.local` or `.env.local.txt`)
- Verify the file is in the correct directory: `admin-panel/go-smart-travel-admin/`

### Environment Variables Not Loading
- Restart your Next.js development server after creating the file
- Make sure there are no extra spaces or characters in the file
- Verify the file format is correct (no BOM, UTF-8 encoding)

### SMS Not Sending
- Check that your Android device is connected to the internet
- Verify the TextBee app is running on your device
- Check that your device has an active SIM card
- Verify phone numbers are in E.164 format (`+639123456789`)

---

**Ready to test!** After creating the `.env.local` file and restarting the server, you can start sending SMS notifications.

