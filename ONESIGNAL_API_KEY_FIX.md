# OneSignal API Key Fix

## Issue
The error "Access denied. Please include an 'Authorization: ...' header with a valid API key" indicates that the REST API key is incorrect or not properly formatted.

## Solution

### Step 1: Get Your OneSignal REST API Key

1. Go to https://onesignal.com/
2. Log in to your account
3. Select your app (Go Smart Travel App)
4. Go to **Settings** → **Keys & IDs**
5. Copy the **REST API Key** (should look like: `os_v2_app_...`)

### Step 2: Update the API Key

Update the REST API key in:
- `admin-panel/go-smart-travel-admin/src/utils/oneSignalService.ts`

Line 7 should have:
```typescript
const ONESIGNAL_REST_API_KEY = 'YOUR_FULL_REST_API_KEY_HERE';
```

### Step 3: Verify the Format

The REST API Key should:
- Start with `os_v2_app_` or `os_v1_app_`
- Be very long (100+ characters)
- NOT have any spaces or line breaks

### Step 4: Test

After updating the key, restart the admin panel server and try sending a notification again.

## Common Issues

1. **Wrong Key**: Make sure you're using the REST API Key, not the App ID
2. **Truncated Key**: The key might be cut off - copy the entire key
3. **Extra Characters**: Remove any spaces or newlines from the key
4. **Wrong App**: Make sure you're using the key from the correct OneSignal app

## Verification

To verify your key is correct, you can test it with curl:

```bash
curl --include \
     --request POST \
     --header "Content-Type: application/json" \
     --header "Authorization: Basic YOUR_REST_API_KEY_HERE" \
     --data-binary "{\"app_id\":\"YOUR_APP_ID\",\"included_segments\":[\"All\"],\"contents\":{\"en\":\"Test\"}}" \
     https://onesignal.com/api/v1/notifications
```

If it works, you should get a JSON response with an `id` field. If not, check your API key again.










