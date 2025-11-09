# Chatbot API Setup Guide

This guide will help you set up the AI-powered chatbot for the Go-Smart-Travel app using Gemini AI.

## Overview

The chatbot uses Google's Gemini AI to provide intelligent, context-aware responses to user queries about travel planning, destinations, and app features.

## Architecture

```
Mobile App (React Native)
    ↓
Chatbot.jsx (calls API)
    ↓
Admin Panel API (/api/chatbot)
    ↓
Gemini AI (Google Generative AI)
    ↓
Response sent back to app
```

## Step 1: Install Dependencies

1. Navigate to the admin panel directory:
```bash
cd admin-panel/go-smart-travel-admin
```

2. Install the Google Generative AI package:
```bash
npm install @google/generative-ai
```

## Step 2: Configure Gemini API Key

1. Get your Gemini API key from: https://makersuite.google.com/app/apikey
2. Create or update `.env.local` file in `admin-panel/go-smart-travel-admin/`:

```env
# Google Gemini AI Configuration (for chatbot)
GEMINI_API_KEY=your_gemini_api_key_here
```

3. Alternatively, the API key is already configured in `src/constants/APIKeys.ts` with a default value.

## Step 3: Configure Mobile App API URL

1. Open `Go-Smart-Travel-App/app/constants/chatbotConfig.js`
2. Update the `CHATBOT_API_URL` based on your setup:

### For Local Development:
```javascript
export const CHATBOT_API_URL = __DEV__ 
  ? 'http://localhost:3000/api/chatbot'
  : 'https://your-admin-panel-domain.com/api/chatbot';
```

### For Production:
```javascript
export const CHATBOT_API_URL = 'https://your-admin-panel-domain.com/api/chatbot';
```

### For Testing with Real Device/Emulator:
- If testing on a real device, use your computer's local IP address:
  - Windows: `ipconfig` (look for IPv4 Address)
  - Mac/Linux: `ifconfig` (look for inet)
  - Example: `http://192.168.1.100:3000/api/chatbot`

## Step 4: Start Admin Panel

1. Start the admin panel server:
```bash
cd admin-panel/go-smart-travel-admin
npm run dev
```

2. Verify the API is running:
   - Open: `http://localhost:3000/api/chatbot` (GET request)
   - Should see: `{"status":"ok","service":"Go Smart Travel Chatbot API",...}`

## Step 5: Test the Chatbot

1. Start your mobile app
2. Navigate to the Chatbot tab
3. Send a test message: "Hello, can you help me plan a trip to Boracay?"
4. You should receive an AI-generated response

## API Endpoint

### POST /api/chatbot

**Request Body:**
```json
{
  "message": "Hello, can you help me plan a trip?",
  "conversationHistory": [
    {
      "text": "Hello",
      "sender": "user"
    },
    {
      "text": "Hello! How can I help you?",
      "sender": "ai"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Hello! I'd be happy to help you plan your trip...",
  "timestamp": "2024-11-09T15:00:00.000Z"
}
```

## Features

### 1. Context-Aware Responses
- Maintains conversation history (last 10 messages)
- Understands context from previous messages
- Provides relevant, personalized responses

### 2. Travel-Focused AI
- Specialized in Philippine travel
- Knows about destinations, activities, and app features
- Provides practical travel advice

### 3. Error Handling
- Graceful fallback if API fails
- Timeout handling (30 seconds)
- Network error detection
- User-friendly error messages

### 4. Message Persistence
- Messages saved to AsyncStorage
- Conversation history persists across app sessions
- User-specific conversations (logged-in users)

## System Prompt

The chatbot is configured with a comprehensive system prompt that:
- Defines its role as a travel assistant
- Provides guidelines for responses
- Includes app context and features
- Maintains a friendly, helpful tone

## Customization

### Update System Prompt

Edit `admin-panel/go-smart-travel-admin/src/app/api/chatbot/route.ts`:

```typescript
const SYSTEM_PROMPT = `Your custom system prompt here...`;
```

### Adjust Conversation History

Default: Last 10 messages
- Edit the `slice(-10)` in the API route to change the number

### Change Response Style

Modify the system prompt to change:
- Response length
- Tone (formal, casual, friendly)
- Level of detail
- Use of emojis

## Troubleshooting

### API Not Responding

1. **Check Admin Panel is Running:**
   ```bash
   # Should see: "Ready on http://localhost:3000"
   npm run dev
   ```

2. **Check API Endpoint:**
   - Visit: `http://localhost:3000/api/chatbot`
   - Should see status response

3. **Check Gemini API Key:**
   - Verify in `.env.local` or `APIKeys.ts`
   - Test the key at: https://makersuite.google.com/app/apikey

### Network Errors

1. **Local Development:**
   - Use `localhost:3000` for iOS Simulator
   - Use your computer's IP for Android Emulator/Real Device
   - Check firewall settings

2. **CORS Issues:**
   - Next.js API routes handle CORS automatically
   - No additional configuration needed

### Gemini API Errors

1. **API Key Invalid:**
   - Regenerate API key from Google
   - Update `.env.local` file
   - Restart admin panel

2. **Rate Limits:**
   - Free tier: 60 requests/minute, 1,500 requests/day
   - Monitor usage in Google Cloud Console
   - Consider upgrading if needed

### Timeout Errors

1. **Increase Timeout:**
   - Edit `chatbotConfig.js`: `CHATBOT_API_TIMEOUT = 60000` (60 seconds)

2. **Check Network:**
   - Ensure stable internet connection
   - Check if Gemini API is accessible

## Production Deployment

### 1. Deploy Admin Panel

Deploy your admin panel to a hosting service (Vercel, Netlify, etc.)

### 2. Update API URL

Update `chatbotConfig.js` in the mobile app:
```javascript
export const CHATBOT_API_URL = 'https://your-admin-panel-domain.com/api/chatbot';
```

### 3. Environment Variables

Set `GEMINI_API_KEY` in your hosting platform's environment variables.

### 4. Test Production API

1. Test the API endpoint: `https://your-admin-panel-domain.com/api/chatbot`
2. Verify it returns status: `{"status":"ok",...}`
3. Test from mobile app

## Security Considerations

1. **API Key Security:**
   - Never commit `.env.local` to Git
   - Use environment variables in production
   - Rotate API keys regularly

2. **Rate Limiting:**
   - Consider implementing rate limiting per user
   - Monitor API usage
   - Set up alerts for unusual activity

3. **Input Validation:**
   - API validates message format
   - Filters out empty messages
   - Limits conversation history

## Monitoring

### Check Logs

1. **Admin Panel Logs:**
   ```bash
   # Look for:
   🤖 [Chatbot] Processing message: "..."
   ✅ [Chatbot] Response generated: "..."
   ❌ [Chatbot] API Error: "..."
   ```

2. **Mobile App Logs:**
   - Check React Native debugger
   - Look for API call logs
   - Monitor error messages

### Monitor Usage

1. **Google Cloud Console:**
   - Check Gemini API usage
   - Monitor rate limits
   - View API quotas

2. **Admin Panel:**
   - Add logging for API calls
   - Track response times
   - Monitor error rates

## Next Steps

1. ✅ Install `@google/generative-ai` package
2. ✅ Configure Gemini API key
3. ✅ Update chatbot API URL in mobile app
4. ✅ Start admin panel
5. ✅ Test chatbot functionality
6. ⏳ Deploy to production
7. ⏳ Monitor usage and performance

## Support

- **Gemini AI Documentation:** https://ai.google.dev/docs
- **Google Generative AI:** https://makersuite.google.com
- **Next.js API Routes:** https://nextjs.org/docs/api-routes/introduction

---

**Last Updated**: 2024-11-09
**Version**: 1.0.0

