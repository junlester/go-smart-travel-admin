# Firebase Cloud Messaging (FCM) Setup Guide

This guide will help you set up Firebase Cloud Messaging for push notifications in your admin panel.

## Prerequisites

1. Firebase project with FCM enabled
2. Service account key for Firebase Admin SDK
3. FCM tokens from your mobile app users

## Setup Steps

### 1. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `go-smart-travel-app`
3. Go to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Download the JSON file
6. Rename it to `service-account.json`
7. Place it in the root of your admin panel project

### 2. Install Required Dependencies

```bash
npm install firebase-admin
```

### 3. Update Your Mobile App

Make sure your mobile app is configured to:
- Request FCM tokens
- Store FCM tokens in Firebase Firestore under the `users` collection
- Use the field name `fcmToken` (not `pushToken`)

### 4. FCM Token Format

FCM tokens look like this:
```
dGVzdF90b2tlbl8xMjM0NTY3ODkwYWJjZGVmZ2hpams=
```

They are different from Expo push tokens which look like:
```
ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
```

### 5. Database Structure

Your `users` collection should have documents with this structure:
```json
{
  "uid": "user123",
  "email": "user@example.com",
  "fcmToken": "dGVzdF90b2tlbl8xMjM0NTY3ODkwYWJjZGVmZ2hpams=",
  "segments": ["premium", "traveler"],
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## Features

### 1. Broadcast to All Users
- Sends notifications to all users with FCM tokens
- Automatically fetches tokens from Firestore

### 2. Target Segments
- Send to users based on segments (premium, traveler, etc.)
- Users must have `segments` array in their document

### 3. Specific Users
- Send to specific FCM tokens
- Enter comma-separated FCM tokens

### 4. Templates
- Trip Reminder notifications
- Weather Alert notifications
- Promotional notifications

## Testing

1. Make sure you have valid FCM tokens in your database
2. Use the admin panel to send test notifications
3. Check the console for success/failure counts

## Troubleshooting

### Common Issues

1. **"No FCM tokens found"**
   - Check if users have `fcmToken` field in their documents
   - Verify FCM tokens are valid and not expired

2. **"Service account key not found"**
   - Make sure `service-account.json` is in the project root
   - Check file permissions

3. **"Failed to send notifications"**
   - Verify Firebase project ID is correct
   - Check if FCM is enabled in Firebase Console
   - Ensure service account has proper permissions

### Debug Mode

Enable debug logging by checking the browser console for detailed error messages.

## Migration from Expo/OneSignal

If you're migrating from Expo or OneSignal:

1. Update your mobile app to use FCM instead of Expo/OneSignal
2. Change the token field name from `pushToken` to `fcmToken`
3. Update your database to store FCM tokens
4. Test with a small group of users first

## Security Notes

- Never commit `service-account.json` to version control
- Add it to `.gitignore`
- Use environment variables in production
- Rotate service account keys regularly
