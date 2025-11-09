# 🧪 Email Test Guide

## Quick Test

Since you already have Gmail credentials set up, here's how to test if email is working:

### Method 1: Test Email Configuration (Quick Check)

1. **Open your browser** and go to:
   ```
   http://localhost:3000/api/send-email
   ```
   (Or your admin panel URL + `/api/send-email`)

2. **You should see:**
   ```json
   {
     "success": true,
     "message": "Email configuration is valid",
     "config": {
       "service": "gmail",
       "user": "your-email@gmail.com"
     }
   }
   ```

3. **If you see an error**, check:
   - `.env.local` file exists
   - `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set correctly
   - Server was restarted after adding environment variables

---

### Method 2: Send Test Email from Admin Panel

1. **Go to Admin Panel** → **Notifications**
2. **Click "Broadcast" tab**
3. **Fill in:**
   - Title: `Test Email`
   - Message: `This is a test email from Go Smart Travel`
4. **Check "Also send email notifications"** ✅
5. **Click "Send to All Users"**
6. **Check console logs** for:
   ```
   ✅ Email sent to X recipients
   📧 Email sent successfully: <message-id>
   ```

---

### Method 3: Send Test Email via Bookings Page

1. **Go to Admin Panel** → **Bookings**
2. **Select a booking**
3. **Click "Send Notification"**
4. **Choose "Email" as notification type**
5. **Fill in title and message**
6. **Click "Send"**
7. **Check recipient's inbox** (and spam folder)

---

## Expected Results

### ✅ Success:
- Console shows: `✅ Email sent to X recipients`
- Console shows: `📧 Email sent successfully: <message-id>`
- Email received in inbox (check spam too)

### ❌ Error: "Authentication failed"
- Check app password is correct
- Verify 2-Step Verification is enabled
- Try generating a new app password

### ❌ Error: "No email addresses found"
- Check if users have emails in Firebase
- Verify `users` collection has `email` field

### ❌ Error: "Connection timeout"
- Check internet connection
- Verify Gmail SMTP is not blocked

---

## Debugging

### Check Environment Variables:

Open terminal in your admin panel directory:
```bash
cd admin-panel/go-smart-travel-admin
```

Check if variables are loaded:
```bash
# Windows PowerShell
$env:GMAIL_USER
$env:GMAIL_APP_PASSWORD
```

### Check Server Logs:

Look for these in your server console:
- `✅ Email sent successfully`
- `❌ Error sending email`
- Authentication errors
- Connection errors

### Check Gmail:

1. Go to Gmail → Sent folder
2. Check if emails were sent
3. Check Gmail activity for security alerts

---

## Common Issues

### Issue 1: "Invalid login"
**Solution:** 
- App password is wrong
- Generate new app password
- Make sure no spaces in password

### Issue 2: "Less secure app access"
**Solution:**
- Use App Password (not regular password)
- Enable 2-Step Verification
- App passwords bypass this restriction

### Issue 3: Emails in spam
**Solution:**
- Normal for new senders
- Ask recipients to mark as "Not Spam"
- Use custom domain for production

---

## Next Steps

Once email is working:

1. ✅ **Test sending** from admin panel
2. ✅ **Check inbox/spam** for received emails
3. ✅ **Monitor server logs** for any errors
4. ✅ **Verify email templates** look good

---

**Ready to test?** Go to `/api/send-email` or send a test notification from the admin panel! 🚀









