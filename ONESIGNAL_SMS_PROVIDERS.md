# OneSignal SMS Providers - Complete Guide

## 📱 Supported SMS Providers in OneSignal

OneSignal supports multiple SMS providers. You can choose which one to use based on your needs and budget.

---

## 🔧 Available Providers

### 1. **Twilio** ⭐ (Recommended by OneSignal)
**Status:** Primary/Default provider
**Setup:** Via OneSignal Dashboard

**Pricing:**
- OneSignal-Managed: For 5,000+ SMS/month (paid OneSignal plan)
- Your Own Twilio Account: Pay Twilio directly
- **Cost:** ~$0.0075-0.01 per SMS (Philippines)
- **$15 = ~1,500-2,000 SMS messages**

**Pros:**
- ✅ Most reliable
- ✅ Widely used
- ✅ Good documentation
- ✅ Can use your own Twilio account
- ✅ Integrated with OneSignal

**Cons:**
- ❌ More expensive than some alternatives
- ❌ May have verification issues (Philippines)
- ❌ $20 minimum credit for paid account

**Best for:** Reliability and integration

---

### 2. **Vonage (formerly Nexmo)**
**Status:** Supported
**Setup:** Via OneSignal Dashboard → Settings → SMS → Configure Provider

**Pricing:**
- Your own Vonage account
- **Cost:** $0.0068 per SMS (cheaper!)
- **$15 = ~2,200 SMS messages**

**Pros:**
- ✅ Cheaper than Twilio
- ✅ Good for high volume
- ✅ No monthly fees
- ✅ Works well internationally

**Cons:**
- ❌ Need to set up Vonage account
- ❌ Less known than Twilio

**Best for:** Cost savings, high volume

---

### 3. **Bandwidth**
**Status:** Supported
**Setup:** Via OneSignal Dashboard

**Pricing:**
- Varies by country
- Generally competitive rates
- **Cost:** ~$0.008-0.01 per SMS

**Pros:**
- ✅ Good for US numbers
- ✅ Reliable delivery
- ✅ Competitive pricing

**Cons:**
- ❌ May be more expensive for international
- ❌ Less popular globally

**Best for:** US-focused applications

---

### 4. **Custom Provider**
**Status:** Supported (Advanced)
**Setup:** Custom integration via API

**Pricing:**
- Depends on your provider
- Can use any SMS provider

**Pros:**
- ✅ Full flexibility
- ✅ Can use any provider
- ✅ Custom pricing

**Cons:**
- ❌ More complex setup
- ❌ Need custom integration
- ❌ More maintenance

**Best for:** Custom requirements

---

## 💰 Cost Comparison (For $15 Budget)

| Provider | SMS Count | Per SMS | Setup |
|----------|-----------|---------|-------|
| **Vonage** | ~2,200 | $0.0068 | Your account ⭐ |
| **Twilio** | ~1,500-2,000 | $0.0075-0.01 | Your account |
| **Bandwidth** | ~1,500-1,875 | $0.008-0.01 | Your account |
| **Twilio (OneSignal-Managed)** | Varies | Varies | OneSignal plan |

---

## 🎯 How to Choose Provider in OneSignal

### Option 1: Use Your Own Provider Account (Recommended)

**Best for:** Cost control, flexibility

1. **Sign up with provider** (Twilio, Vonage, etc.)
2. **Get credentials:**
   - Account SID/API Key
   - Auth Token/Secret
   - Phone number (if needed)
3. **Configure in OneSignal:**
   - Go to OneSignal Dashboard
   - Settings → SMS & Voice
   - Select provider
   - Enter credentials
   - Save

**Benefits:**
- ✅ Pay provider directly (cheaper)
- ✅ Full control
- ✅ Can switch providers anytime

---

### Option 2: Use OneSignal-Managed (Twilio)

**Best for:** Simplicity, 5,000+ SMS/month

1. **Requires:** Paid OneSignal plan
2. **Minimum:** 5,000 SMS/month
3. **Setup:** OneSignal handles everything
4. **Billing:** Through OneSignal

**Benefits:**
- ✅ No provider setup needed
- ✅ OneSignal manages everything
- ✅ Integrated billing

**Cons:**
- ❌ Need paid OneSignal plan
- ❌ Higher minimum volume
- ❌ May be more expensive

---

## 📋 Setup Instructions

### Setup Twilio in OneSignal:

1. **Create Twilio Account:**
   - Go to https://www.twilio.com/
   - Sign up (free trial: $15.50 credit)
   - Get Account SID and Auth Token

2. **Configure in OneSignal:**
   - OneSignal Dashboard → Settings → SMS & Voice
   - Click "Configure Provider"
   - Select "Twilio"
   - Enter:
     - Account SID
     - Auth Token
   - Save

3. **Verify Phone Number:**
   - In Twilio: Phone Numbers → Verified Caller IDs
   - Add your phone number
   - Verify (SMS or phone call)

4. **Test:**
   - Send test SMS from OneSignal
   - Check if it arrives

---

### Setup Vonage in OneSignal:

1. **Create Vonage Account:**
   - Go to https://www.vonage.com/
   - Sign up
   - Get API Key and Secret

2. **Configure in OneSignal:**
   - OneSignal Dashboard → Settings → SMS & Voice
   - Click "Configure Provider"
   - Select "Vonage" (if available)
   - Enter:
     - API Key
     - API Secret
   - Save

3. **Test:**
   - Send test SMS
   - Check delivery

---

## 🎯 Recommendation for Your Budget ($15)

### Best Option: **Vonage via OneSignal**

**Why:**
- ✅ Cheapest: $0.0068 per SMS
- ✅ $15 = 2,200 SMS (most value)
- ✅ Works with OneSignal
- ✅ No monthly fees
- ✅ Good for Philippines

**Steps:**
1. Sign up for Vonage account
2. Get API Key and Secret
3. Configure in OneSignal Dashboard
4. Add $15 credit to Vonage
5. Start sending SMS

---

### Alternative: **Twilio via OneSignal**

**Why:**
- ✅ Most reliable
- ✅ Well-documented
- ✅ Good integration
- ✅ $15 = 1,500-2,000 SMS

**Steps:**
1. Sign up for Twilio account
2. Get Account SID and Auth Token
3. Configure in OneSignal Dashboard
4. Add $20 minimum credit to Twilio
5. Verify phone numbers
6. Start sending SMS

---

## ⚠️ Important Notes

### For Philippines:
- **Twilio:** May have verification issues (trial accounts)
- **Vonage:** Usually works better for Philippines
- **Recommendation:** Use Vonage for Philippines

### For All Providers:
- Phone numbers must be in E.164 format: `+639123456789`
- Need to verify phone numbers (for trial accounts)
- Pay-as-you-go pricing (no monthly fees)

### OneSignal Requirements:
- Phone numbers must be in OneSignal user database
- Users must have phone numbers in their profiles
- Phone numbers synced automatically (if configured)

---

## 🔄 Switching Providers

You can switch providers anytime in OneSignal:

1. Go to OneSignal Dashboard
2. Settings → SMS & Voice
3. Change provider
4. Enter new credentials
5. Save

**Note:** Existing notifications will use new provider immediately.

---

## 📊 Summary

| Feature | Twilio | Vonage | Bandwidth |
|---------|--------|--------|-----------|
| **Cost/SMS** | $0.0075-0.01 | $0.0068 | $0.008-0.01 |
| **$15 = SMS** | 1,500-2,000 | 2,200 | 1,500-1,875 |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Philippines** | ⚠️ Issues | ✅ Good | ⚠️ Unknown |
| **Setup** | Easy | Easy | Easy |

---

## 🎯 Final Recommendation

**For $15 budget and Philippines:**
- **Use Vonage via OneSignal** ⭐
- Cheapest option
- Works well for Philippines
- Easy setup in OneSignal
- Most SMS for your money

**OR**

**Use Twilio via OneSignal** if:
- You want most reliable
- Don't mind $20 minimum
- Want best documentation

---

## Next Steps

1. **Choose provider:** Vonage (recommended) or Twilio
2. **Sign up:** Create account with provider
3. **Get credentials:** API Key/Secret or Account SID/Token
4. **Configure in OneSignal:** Settings → SMS & Voice
5. **Add credits:** $15-20 to provider account
6. **Test:** Send test SMS from OneSignal
7. **Done:** SMS notifications will work!

---

## Questions?

- **Which provider is cheapest?** → Vonage ($0.0068/SMS)
- **Which is most reliable?** → Twilio
- **Which works best for Philippines?** → Vonage
- **Can I use multiple providers?** → No, one at a time
- **Can I switch later?** → Yes, anytime in OneSignal settings










