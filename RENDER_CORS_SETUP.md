# Render CORS Configuration Guide

## Issue
The frontend at `https://gup-shup-cafe.vercel.app` is being blocked by CORS policy because the backend doesn't have the correct allowed origins configured.

## Solution
You need to add an environment variable to your Render backend service:

### Steps:

1. **Go to Render Dashboard**
   - Open https://dashboard.render.com
   - Log in to your account

2. **Find Your Backend Service**
   - Look for the service named `gupshup-cafe` (your backend)
   - Click on it to open the service details

3. **Add Environment Variable**
   - Click on "Environment" in the left sidebar
   - Click "Add Environment Variable"
   - Set:
     - **Key**: `ALLOWED_ORIGINS`
     - **Value**: `https://gup-shup-cafe.vercel.app`

4. **Deploy the Changes**
   - Click "Save Changes"
   - Render will automatically redeploy your backend service
   - Wait for the deployment to complete (usually 2-3 minutes)

### Alternative Method (if you have multiple origins):
If you need to allow multiple origins, separate them with commas:
```
ALLOWED_ORIGINS=https://gup-shup-cafe.vercel.app,http://localhost:5173
```

## Verification
After the backend redeploys:
1. Wait 2-3 minutes for Vercel frontend to finish redeploying with correct URLs
2. Go to https://gup-shup-cafe.vercel.app
3. Open browser developer tools (F12)
4. Try to join a room - you should no longer see CORS errors
5. The Socket.io connection should work properly

## Expected Result
- No more CORS errors in browser console
- Real-time features will work (room joining, voice controls, etc.)
- Platform will be fully functional for public use
