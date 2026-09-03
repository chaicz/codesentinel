# Firebase Setup Guide

## Step-by-Step Instructions to Enable Google Login

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `sentinel-ide` (or your preferred name)
4. Disable Google Analytics (optional) → Click **"Create project"**
5. Wait for project to be created → Click **"Continue"**

### 2. Enable Authentication

1. In the left sidebar, click **"Authentication"**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Click on **"Google"**
5. Toggle to **"Enable"**
6. Select a **Project support email**
7. Click **"Save"**

### 3. Get Firebase Config (Web App)

1. Click the **gear icon** ⚙️ next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **web icon** `</>` (Add app)
5. Check **"Also set up Firebase Hosting"** (optional)
6. Click **"Register app"**
7. Copy the `firebaseConfig` object - you'll need these values:
   ```javascript
   apiKey: "AIza..."
   authDomain: "your-project.firebaseapp.com"
   projectId: "your-project-id"
   storageBucket: "your-project.appspot.com"
   messagingSenderId: "123456789"
   appId: "1:123456789:web:abc123"
   ```

### 4. Add Config to Your Project

**Option A: Using .env file (Recommended)**

Create a `.env` file in your project root:
```bash
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Option B: Direct in firebase.ts**

Edit `src/services/firebase.ts`:
```typescript
export const firebaseConfig: FirebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 5. Update index-standalone.html

Edit the `firebaseConfig` object at the top of the `<script>` section in `index-standalone.html`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 6. Authorize Domains (Important!)

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your domain if deploying (e.g., `localhost` for development)
3. For local development, `localhost` is already authorized

### 7. Test Firebase

1. Start your app: `npm run dev`
2. Open browser to `http://localhost:5173`
3. Click **"Sign in"**
4. You should see **"Continue with Google"** button
5. Click it and complete Google sign-in
6. If successful, you'll be logged in!

## Troubleshooting

### "Popup closed by user" error
- Make sure popups are not blocked in your browser

### "Firebase not configured" error
- Verify your config values are correct
- Make sure you replaced placeholder values

### "Sign-in method not enabled" error
- Go to Firebase Console → Authentication → Sign-in method
- Make sure Google is enabled

### CORS errors
- For local development, this shouldn't be an issue
- For production, add your domain to Firebase authorized domains

## Quick Checklist

- [ ] Created Firebase project
- [ ] Enabled Google sign-in in Authentication
- [ ] Added web app in Project settings
- [ ] Copied Firebase config
- [ ] Updated firebase.ts or .env with config
- [ ] Updated index-standalone.html config
- [ ] Tested login flow

## Security Notes

1. **Never commit Firebase config to public repos** - Use environment variables
2. Add `.env` to your `.gitignore` file
3. The config above is safe for client-side use (not a security risk)
4. Firebase rules protect your data, not the config

## Next Steps

After Firebase is working, you can:
1. Deploy to Firebase Hosting: `firebase init && firebase deploy`
2. Enable Firestore for cloud storage (optional)
3. Add more authentication providers (GitHub, Apple, etc.)
