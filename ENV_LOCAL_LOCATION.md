# Where to Create .env.local File

## 📁 Location

Create the `.env.local` file in this directory:

```
admin-panel/go-smart-travel-admin/.env.local
```

## 📝 Full Path

**Windows:**
```
C:\Go-Smart-Travel-App\admin-panel\go-smart-travel-admin\.env.local
```

**Mac/Linux:**
```
/Go-Smart-Travel-App/admin-panel/go-smart-travel-admin/.env.local
```

## 🚀 Quick Steps

### Step 1: Navigate to Admin Panel Directory
```bash
cd admin-panel/go-smart-travel-admin
```

### Step 2: Create .env.local File
Create a new file named `.env.local` (with the dot at the beginning)

### Step 3: Copy Content from Template
Copy the content from `env.local.template` and paste it into `.env.local`

### Step 4: Update with Your Values
Update the API keys and credentials:

```env
# TextBee.dev SMS Gateway Configuration
TEXTBEE_API_KEY=f0925a1a-f615-41ac-972d-767b86deaa06
TEXTBEE_DEVICE_ID=6910d862529b72ab6deef473
TEXTBEE_API_URL=https://api.textbee.dev/api/v1

# Google Gemini AI Configuration (for chatbot)
GEMINI_API_KEY=AIzaSyARYoyynt2iuRZ-GHG7QDEY_z4TTclW_9k

# Gmail Configuration (for email notifications)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password

# OneSignal Configuration (for push notifications)
ONESIGNAL_REST_API_KEY=your_onesignal_rest_api_key
```

## 📂 File Structure

```
admin-panel/
└── go-smart-travel-admin/
    ├── .env.local          ← CREATE THIS FILE HERE
    ├── env.local.template  ← Template file (already exists)
    ├── package.json
    ├── src/
    │   ├── app/
    │   │   └── api/
    │   │       └── chatbot/
    │   │           └── route.ts
    │   └── constants/
    │       └── APIKeys.ts
    └── ...
```

## ✅ Verification

After creating the file, verify it's in the correct location:

1. **Check file exists:**
   ```bash
   cd admin-panel/go-smart-travel-admin
   ls -la .env.local  # Mac/Linux
   dir .env.local     # Windows
   ```

2. **Check file content:**
   - Open `.env.local`
   - Verify API keys are set correctly
   - Make sure there are no extra spaces

## 🔒 Security Note

⚠️ **Never commit `.env.local` to Git!**
- The file is already in `.gitignore`
- Keep your API keys secure
- Don't share the file publicly

## 🚀 After Creating .env.local

1. **Restart admin panel:**
   ```bash
   # Stop current server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

2. **Verify environment variables are loaded:**
   - Check server logs for any errors
   - Test the API endpoint: `http://localhost:3000/api/chatbot`

## 📝 Quick Copy-Paste Template

Create `.env.local` in `admin-panel/go-smart-travel-admin/` and paste this:

```env
# TextBee.dev SMS Gateway Configuration
TEXTBEE_API_KEY=f0925a1a-f615-41ac-972d-767b86deaa06
TEXTBEE_DEVICE_ID=6910d862529b72ab6deef473
TEXTBEE_API_URL=https://api.textbee.dev/api/v1

# Google Gemini AI Configuration (for chatbot)
GEMINI_API_KEY=AIzaSyARYoyynt2iuRZ-GHG7QDEY_z4TTclW_9k

# Gmail Configuration (for email notifications)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password

# OneSignal Configuration (for push notifications)
ONESIGNAL_REST_API_KEY=your_onesignal_rest_api_key
```

---

**Location:** `admin-panel/go-smart-travel-admin/.env.local`


