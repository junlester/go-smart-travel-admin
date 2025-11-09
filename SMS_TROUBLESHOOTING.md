# SMS Troubleshooting Guide

## Problem: SMS Not Arriving on Phone

### Step 1: Check Phone Number Format

SMS notifications require phone numbers in **E.164 format**:
- ✅ Correct: `+639123456789` (Philippines)
- ✅ Correct: `+1234567890` (USA)
- ❌ Wrong: `09123456789` (missing country code)
- ❌ Wrong: `639123456789` (missing + sign)
- ❌ Wrong: `0912-345-6789` (has dashes)

### Step 2: Verify Phone Number in Firebase

1. Open Firebase Console
2. Go to Firestore Database
3. Check `users` collection
4. Find your user document
5. Check `phoneNumber` field - should be in E.164 format

### Step 3: Check Phone Number Sync to OneSignal

Phone numbers need to be synced to OneSignal when:
- User signs up
- User updates their profile

To manually sync:
1. User must update their profile in the app
2. Or use the OneSignal dashboard to add phone numbers

### Step 4: Verify Twilio Configuration in OneSignal

1. Go to OneSignal Dashboard
2. Navigate to **Settings** → **SMS & Voice** → **Configure Twilio**
3. Make sure Twilio is connected and verified
4. Check if you have Twilio credits/balance

### Step 5: Check OneSignal Dashboard

1. Go to OneSignal Dashboard
2. Navigate to **Audience** → **All Users**
3. Find your user
4. Check if phone number is listed
5. Verify phone number format is correct

### Step 6: Test SMS Sending

1. Go to OneSignal Dashboard
2. Navigate to **Messages** → **New Push**
3. Select **SMS** tab
4. Enter phone number manually (E.164 format)
5. Send test message
6. Check if it arrives

### Step 7: Check Server Logs

When sending notification, check:
- ✅ Phone numbers retrieved from Firebase
- ✅ Phone numbers in valid E.164 format
- ✅ SMS notification sent successfully
- ✅ Notification ID returned
- ✅ Recipients count > 0

### Common Issues

#### Issue 1: Phone Number Not in Firebase
**Solution:** User needs to sign up with phone number or update profile

#### Issue 2: Phone Number Not in E.164 Format
**Solution:** Update phone number format in Firebase to E.164

#### Issue 3: Phone Number Not Synced to OneSignal
**Solution:** 
- User updates profile (triggers sync)
- Or manually add to OneSignal dashboard

#### Issue 4: Twilio Not Configured
**Solution:** Configure Twilio in OneSignal dashboard

#### Issue 5: No Twilio Credits
**Solution:** Add credits to Twilio account

#### Issue 6: Phone Number Not Verified in Twilio
**Solution:** Verify phone number in Twilio (for trial accounts)

### Testing Steps

1. **Check Firebase:**
   ```javascript
   // Check if phone number exists
   db.collection('users').doc('YOUR_USER_ID').get()
   // Should show: phoneNumber: "+639123456789"
   ```

2. **Check OneSignal Dashboard:**
   - Go to Audience → All Users
   - Find your user
   - Check phone number field

3. **Test SMS from Admin Panel:**
   - Send notification with SMS enabled
   - Check server logs for phone numbers
   - Check OneSignal dashboard for notification status

4. **Test SMS from OneSignal Dashboard:**
   - Create new SMS message
   - Enter phone number manually
   - Send test message

### Debug Checklist

- [ ] Phone number in Firebase (E.164 format)
- [ ] Phone number synced to OneSignal
- [ ] Twilio configured in OneSignal
- [ ] Twilio has credits/balance
- [ ] Phone number verified (if trial account)
- [ ] SMS notification sent successfully
- [ ] Notification ID returned
- [ ] Recipients count > 0

### Next Steps

If SMS still not working:
1. Check Twilio logs in Twilio dashboard
2. Check OneSignal notification delivery logs
3. Verify phone number format is correct
4. Test with a different phone number
5. Check if phone number is blocked or invalid










