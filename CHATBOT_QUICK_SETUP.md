# Chatbot API - Quick Setup Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Install Dependencies

```bash
cd admin-panel/go-smart-travel-admin
npm install @google/generative-ai
```

### Step 2: Configure API Key

1. **Update `.env.local` file:**
   ```env
   GEMINI_API_KEY=AIzaSyARYoyynt2iuRZ-GHG7QDEY_z4TTclW_9k
   ```

2. **Or update `src/constants/APIKeys.ts`:**
   - The API key is already configured with a default value
   - You can override it with environment variable

### Step 3: Configure Mobile App API URL

1. **Open `Go-Smart-Travel-App/app/constants/chatbotConfig.js`**
2. **For Local Development (iOS Simulator):**
   ```javascript
   export const CHATBOT_API_URL = 'http://localhost:3000/api/chatbot';
   ```

3. **For Android Emulator or Real Device:**
   - Find your computer's IP address:
     - Windows: `ipconfig` → IPv4 Address
     - Mac/Linux: `ifconfig` → inet
   - Update the URL:
     ```javascript
     export const CHATBOT_API_URL = 'http://192.168.1.100:3000/api/chatbot';
     ```
   - Replace `192.168.1.100` with your actual IP address

### Step 4: Start Admin Panel

```bash
cd admin-panel/go-smart-travel-admin
npm run dev
```

### Step 5: Test the API

1. **Open browser:** `http://localhost:3000/api/chatbot`
2. **Should see:** `{"status":"ok","service":"Go Smart Travel Chatbot API",...}`

### Step 6: Test in Mobile App

1. Start your mobile app
2. Go to Chatbot tab
3. Send a message: "Hello, can you help me plan a trip?"
4. You should receive an AI response!

## ✅ What's Done

- ✅ API endpoint created: `/api/chatbot`
- ✅ Gemini AI integration
- ✅ Conversation history support
- ✅ Error handling and fallbacks
- ✅ Mobile app updated to use API
- ✅ Loading states and timeouts

## 🔧 Configuration

### API URL Configuration

The mobile app uses `chatbotConfig.js` to configure the API URL:
- Development: `http://localhost:3000/api/chatbot`
- Production: Update with your admin panel domain

### Gemini API Key

- Default: Already configured in `APIKeys.ts`
- Override: Set `GEMINI_API_KEY` in `.env.local`

## 🐛 Troubleshooting

### API Not Working

1. **Check admin panel is running:**
   ```bash
   npm run dev
   # Should see: "Ready on http://localhost:3000"
   ```

2. **Test API endpoint:**
   - Visit: `http://localhost:3000/api/chatbot`
   - Should see status response

3. **Check Gemini API key:**
   - Verify in `.env.local` or `APIKeys.ts`
   - Test at: https://makersuite.google.com/app/apikey

### Network Errors

1. **For Android/Real Device:**
   - Use your computer's IP address instead of `localhost`
   - Example: `http://192.168.1.100:3000/api/chatbot`

2. **Check firewall:**
   - Allow port 3000 in firewall settings
   - Ensure admin panel is accessible

### Timeout Errors

- Increase timeout in `chatbotConfig.js`:
  ```javascript
  export const CHATBOT_API_TIMEOUT = 60000; // 60 seconds
  ```

## 📱 Features

- ✅ AI-powered responses using Gemini
- ✅ Conversation history (last 10 messages)
- ✅ Context-aware responses
- ✅ Error handling and fallbacks
- ✅ Loading indicators
- ✅ Message persistence (AsyncStorage)

## 🚀 Production Deployment

1. **Deploy admin panel** to hosting (Vercel, Netlify, etc.)
2. **Update API URL** in `chatbotConfig.js`:
   ```javascript
   export const CHATBOT_API_URL = 'https://your-admin-panel-domain.com/api/chatbot';
   ```
3. **Set environment variable** `GEMINI_API_KEY` in hosting platform
4. **Test production API** from mobile app

---

**Ready to use!** After completing these steps, your chatbot will be powered by Gemini AI.

