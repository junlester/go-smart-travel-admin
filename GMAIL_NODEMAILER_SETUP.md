# Gmail + Nodemailer Setup Guide

This guide will help you set up Gmail with Nodemailer for sending email notifications from the admin panel.

## Prerequisites

1. A Gmail account
2. Access to Gmail settings
3. Admin panel environment variables

## Step 1: Enable 2-Factor Authentication

1. Go to your [Google Account settings](https://myaccount.google.com/)
2. Navigate to **Security**
3. Enable **2-Step Verification** if not already enabled

## Step 2: Generate App Password

1. In Google Account settings, go to **Security**
2. Under "2-Step Verification", click **App passwords**
3. Select **Mail** as the app
4. Select **Other (custom name)** as the device
5. Enter "Go Smart Travel Admin" as the name
6. Click **Generate**
7. **Copy the 16-character password** (you'll need this for the environment variables)

## Step 3: Configure Environment Variables

Create a `.env.local` file in your admin panel root directory:

```env
# Gmail Configuration (Simplified)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

**Important Notes:**
- Use your actual Gmail address for `GMAIL_USER`
- Use the 16-character app password (not your regular Gmail password) for `GMAIL_APP_PASSWORD`
- Never commit the `.env.local` file to version control
- This simplified approach uses Nodemailer's built-in Gmail service

## Step 4: Test Email Configuration

You can test your email configuration by visiting:
```
GET /api/send-email
```

This will verify your SMTP settings without sending an actual email.

## Step 5: Send Test Email

1. Go to the Bookings page in your admin panel
2. Click "View" on any booking
3. Click "Send Notification"
4. Select "Email" as notification type
5. Fill in title and message
6. Click "Send Email"

## Troubleshooting

### Common Issues:

1. **"535-5.7.8 Username and Password not accepted" error:**
   - **Most Common Cause**: Using regular Gmail password instead of app password
   - **Solution**: Generate a new app password following Step 2 above
   - **Check**: Make sure 2-factor authentication is enabled
   - **Verify**: App password is exactly 16 characters (no spaces)

2. **"Invalid login" error:**
   - Make sure you're using the app password, not your regular Gmail password
   - Verify 2-factor authentication is enabled
   - Check that your Gmail address is correct in SMTP_USER

3. **"Less secure app access" error:**
   - This shouldn't happen with app passwords, but if it does, make sure you're using the correct app password
   - Make sure you're not using "Less secure app access" - use app passwords instead

4. **"Connection timeout" error:**
   - Check your internet connection
   - Verify SMTP settings are correct
   - Try using port 465 with secure: true

5. **"Authentication failed" error:**
   - Double-check the app password
   - Make sure 2-factor authentication is enabled
   - Try generating a new app password
   - Verify your Gmail address is correct

### **Quick Fix for 535 Error:**

If you're getting the 535 error, follow these steps:

1. **Go to Google Account Settings**: https://myaccount.google.com/
2. **Security** → **2-Step Verification** (make sure it's ON)
3. **App passwords** → **Mail** → **Other (custom name)**
4. **Enter name**: "Go Smart Travel Admin"
5. **Copy the 16-character password** (it looks like: `abcd efgh ijkl mnop`)
6. **Update your .env.local**:
   ```env
   GMAIL_USER=your-actual-gmail@gmail.com
   GMAIL_APP_PASSWORD=abcdefghijklmnop
   ```
7. **Restart your development server**

### **Alternative Configuration (if needed):**

The simplified Gmail service should work for most cases. If you need more control, you can use the SMTP configuration:

```env
# Alternative SMTP Configuration (if Gmail service doesn't work)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Note:** The simplified `service: 'gmail'` approach is recommended as it handles all the SMTP settings automatically.

### Email Limits:

- Gmail has daily sending limits (500 emails per day for free accounts)
- For production use, consider using a service like SendGrid or AWS SES

## Security Best Practices

1. **Never commit credentials to version control**
2. **Use app passwords instead of regular passwords**
3. **Rotate app passwords regularly**
4. **Monitor email sending activity**
5. **Use environment variables for all sensitive data**

## Production Considerations

For production environments, consider:

1. **Email Service Providers:**
   - SendGrid
   - AWS SES
   - Mailgun
   - Postmark

2. **Rate Limiting:**
   - Implement rate limiting for email sending
   - Queue emails for bulk sending

3. **Monitoring:**
   - Set up email delivery monitoring
   - Track bounce rates and delivery failures

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Check the server logs for detailed error information
3. Verify your environment variables are set correctly
4. Test the email configuration endpoint

## Example Usage

The email system is now integrated into the booking notification system. When an admin sends a notification:

1. **Push Notification:** Creates a notification in Firestore
2. **Email Notification:** Creates a notification in Firestore AND sends an email via Gmail

The email will include:
- Professional HTML template
- Booking information
- Custom message from admin
- Go Smart Travel branding
