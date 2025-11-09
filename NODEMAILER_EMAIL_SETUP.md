# 📧 Nodemailer Email Setup Guide

## ✅ What's Changed

Your email system has been updated to use **Nodemailer** instead of OneSignal for emails. This means:
- ✅ **Email sending:** Now uses Nodemailer (Gmail SMTP)
- ✅ **Push notifications:** Still uses OneSignal (unchanged)
- ✅ **SMS notifications:** Still uses OneSignal (on hold)

---

## 🔧 Setup Instructions

### Step 1: Enable 2-Factor Authentication on Gmail

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click on **Security** (left sidebar)
3. Under **Signing in to Google**, enable **2-Step Verification**
4. Follow the setup process (you'll need your phone)

### Step 2: Generate App Password

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click on **Security** (left sidebar)
3. Under **Signing in to Google**, click **2-Step Verification**
4. Scroll down and click **App passwords**
5. Select **Mail** as the app
6. Select **Other (Custom name)** as the device
7. Enter name: `Go Smart Travel Admin`
8. Click **Generate**
9. **Copy the 16-character password** (you'll see it like: `abcd efgh ijkl mnop`)

**Important:** 
- The app password is shown only once
- Save it immediately
- You can revoke it anytime from the same page

### Step 3: Create Environment Variables File

Create a `.env.local` file in your admin panel root directory:

**Path:** `admin-panel/go-smart-travel-admin/.env.local`

**Content:**
```env
# Gmail Configuration for Nodemailer
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password

# Example:
# GMAIL_USER=admin@gosmarttravel.com
# GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

**Important:**
- Replace `your-email@gmail.com` with your actual Gmail address
- Replace `your-16-character-app-password` with the app password you generated
- Remove spaces from the app password (if it has spaces, remove them)
- Never commit `.env.local` to Git (it should be in `.gitignore`)

### Step 4: Restart Your Server

After creating `.env.local`:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

---

## 📧 How It Works Now

### Email Sending Flow:

1. **Admin sends notification** from admin panel
2. **System checks** if email is enabled
3. **Fetches user emails** from Firebase `users` collection
4. **Sends email via Nodemailer** using Gmail SMTP
5. **Returns success/error** to admin panel

### Notification Types:

- **Broadcast:** Send to all users (Push + Email + SMS)
- **Segments:** Send to specific user groups (Push + Email + SMS)
- **Promotional:** Send promotional offers (Push + Email + SMS)

### Email Features:

- ✅ Professional HTML email templates
- ✅ Go Smart Travel branding
- ✅ Responsive design (mobile + desktop)
- ✅ Support for images and links
- ✅ Bulk email sending (individual emails per recipient)

---

## 🧪 Testing

### Test Email Configuration

You can test your email setup by:

1. **Go to Admin Panel** → Notifications
2. **Send a test notification** with email enabled
3. **Check the console** for email sending logs
4. **Check recipient's inbox** (and spam folder)

### Expected Console Output:

```
📱 Broadcast notification:
📱 Total users: 10
📱 Emails: 10
✅ Email sent to 10 recipients
📧 Email sent successfully: <message-id>
```

### Common Issues:

#### Issue 1: "Authentication failed"
**Solution:**
- Check if 2-Step Verification is enabled
- Verify the app password is correct
- Make sure there are no spaces in the app password
- Try generating a new app password

#### Issue 2: "No email addresses found"
**Solution:**
- Check if users have email addresses in Firebase
- Verify the `users` collection has `email` field
- Check Firebase console for user data

#### Issue 3: "Connection timeout"
**Solution:**
- Check your internet connection
- Verify Gmail SMTP settings
- Check if Gmail is blocked by firewall

#### Issue 4: Emails going to spam
**Solution:**
- This is normal for new email senders
- Ask recipients to mark as "Not Spam"
- Use a custom domain email (recommended for production)

---

## 🔒 Security Best Practices

1. **Never commit `.env.local` to Git**
   - Check `.gitignore` includes `.env.local`
   - Use environment variables in production

2. **Use App Passwords, not regular passwords**
   - App passwords are more secure
   - Can be revoked individually

3. **Rotate app passwords regularly**
   - Generate new app password every 3-6 months
   - Revoke old app passwords

4. **Monitor email sending**
   - Check Gmail sent folder
   - Monitor for unusual activity

---

## 📊 Gmail Limits

### Free Gmail Account:
- **Daily limit:** 500 emails per day
- **Recipients per email:** 500 (when using BCC)
- **Rate limit:** ~100 emails per minute

### For Production:
If you need to send more emails:
- **Use SendGrid** (free tier: 100 emails/day)
- **Use Mailgun** (free tier: 5,000 emails/month)
- **Use AWS SES** (pay-as-you-go, very cheap)
- **Upgrade to Google Workspace** (higher limits)

---

## 🚀 Production Recommendations

### Option 1: SendGrid (Recommended)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Option 2: Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

### Option 3: AWS SES
```env
SMTP_HOST=email-smtp.region.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-aws-access-key
SMTP_PASS=your-aws-secret-key
```

---

## 📝 Code Changes

### Files Modified:

1. **`src/app/api/notifications/route.ts`**
   - Added Nodemailer import
   - Replaced OneSignal email with Nodemailer
   - Added separate error handling for each channel

2. **`src/utils/emailService.ts`**
   - Already exists (no changes needed)
   - Uses Nodemailer with Gmail service

### Email Service Functions:

- `sendEmailNotification()` - Send to single/multiple recipients
- `sendBulkEmailNotification()` - Send bulk emails (individual per recipient)
- `testEmailConfiguration()` - Test email setup

---

## ✅ Verification Checklist

- [ ] 2-Step Verification enabled on Gmail
- [ ] App password generated
- [ ] `.env.local` file created
- [ ] `GMAIL_USER` set correctly
- [ ] `GMAIL_APP_PASSWORD` set correctly (no spaces)
- [ ] Server restarted
- [ ] Test email sent successfully
- [ ] Email received in inbox (check spam too)

---

## 🆘 Troubleshooting

### Still Not Working?

1. **Check environment variables:**
   ```bash
   # In your terminal, run:
   echo $GMAIL_USER
   echo $GMAIL_APP_PASSWORD
   ```

2. **Check server logs:**
   - Look for email-related errors
   - Check for authentication errors

3. **Test email configuration:**
   - Use the test endpoint (if available)
   - Or send a test notification from admin panel

4. **Verify Gmail settings:**
   - Check if "Less secure app access" is enabled (if using old method)
   - Make sure app password is correct

---

## 📞 Support

If you're still having issues:

1. Check the console logs for detailed error messages
2. Verify all steps above
3. Try generating a new app password
4. Check Gmail account for security alerts

---

## 🎉 Done!

Your email system is now using Nodemailer! 

**Next steps:**
1. Set up Gmail credentials (follow steps above)
2. Test sending an email
3. Monitor for any issues
4. Consider upgrading to a production email service for higher limits

---

**Last Updated:** 2024
**Version:** 1.0









