# Email Notification Setup Guide

This guide will help you set up email notifications alongside FCM push notifications.

## Prerequisites

1. Email service provider (Gmail, SendGrid, etc.)
2. SMTP credentials
3. Node.js environment

## Setup Steps

### 1. Install Dependencies

```bash
npm install nodemailer
npm install @types/nodemailer --save-dev
```

### 2. Configure Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Gmail Setup (Recommended)

If using Gmail:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in `SMTP_PASS`

### 4. Alternative Email Providers

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### Custom SMTP
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
```

## Features

### 1. Dual Notifications
- **FCM Push Notifications** - Instant mobile app notifications
- **Email Notifications** - Detailed email with HTML formatting

### 2. Email Templates
- **Professional HTML design** with Go Smart Travel branding
- **Responsive layout** for mobile and desktop
- **Call-to-action buttons** for engagement
- **Image support** for rich content

### 3. Notification Types
- **Broadcast** - Send to all users
- **Segments** - Target specific user groups
- **Specific Users** - Send to individual users
- **Templates** - Trip reminders, weather alerts, promotions

## Email Template Features

### Design Elements
- 🚀 Go Smart Travel branding
- Green gradient header
- Professional typography
- Mobile-responsive design
- Call-to-action buttons

### Content Support
- Rich HTML formatting
- Image embedding
- Action URLs
- Custom data fields

## Database Requirements

Your `users` collection should include email addresses:

```json
{
  "uid": "user123",
  "email": "user@example.com",
  "fcmToken": "fcm-token-here",
  "segments": ["premium", "traveler"],
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## Testing

### 1. Test Email Configuration
The system includes a test function to verify SMTP settings.

### 2. Send Test Notifications
1. Go to Admin Panel → Notifications
2. Check "📧 Also send email notifications"
3. Send a test notification
4. Check both mobile app and email

## Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Check SMTP credentials
   - Verify app password for Gmail
   - Ensure 2FA is enabled

2. **"Connection timeout"**
   - Check SMTP host and port
   - Verify firewall settings
   - Try different port (465 for SSL)

3. **"Emails not sending"**
   - Check environment variables
   - Verify email addresses in database
   - Check spam folder

### Debug Mode

Enable detailed logging by checking the browser console and server logs.

## Security Notes

- Never commit `.env.local` to version control
- Use app passwords instead of account passwords
- Rotate credentials regularly
- Monitor email sending limits

## Email Limits

### Gmail
- 500 emails per day (free)
- 2000 emails per day (paid)

### SendGrid
- 100 emails per day (free)
- Higher limits (paid plans)

### Best Practices
- Batch emails when possible
- Use segments to target relevant users
- Monitor bounce rates
- Implement unsubscribe functionality

## Advanced Features

### 1. Email Analytics
Track open rates, click rates, and engagement.

### 2. A/B Testing
Test different email templates and content.

### 3. Personalization
Use user data to personalize email content.

### 4. Automation
Set up automated email sequences for different user actions.
