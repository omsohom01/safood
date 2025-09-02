# Firebase Setup Guide for Food Rescue App 🔥

This guide will walk you through setting up Firebase for your Food Rescue app step by step.

## 📋 Prerequisites

- Google account
- Food Rescue app project ready
- Node.js installed

## 🚀 Step 1: Create Firebase Project

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com](https://console.firebase.google.com)
   - Sign in with your Google account

2. **Create New Project**
   - Click "Add project" or "Create a project"
   - Enter project name: `food-rescue-app` (or your preferred name)
   - Choose whether to enable Google Analytics (recommended: Yes)
   - Select or create a Google Analytics account
   - Click "Create project"

3. **Wait for Setup**
   - Firebase will set up your project (takes 1-2 minutes)
   - Click "Continue" when ready

## 📱 Step 2: Add Your App to Firebase

### For React Native/Expo App:

1. **Add Web App**
   - In your Firebase project dashboard, click the "Web" icon (`</>`)
   - App nickname: `Food Rescue Mobile`
   - ✅ Check "Also set up Firebase Hosting" (optional but recommended)
   - Click "Register app"

2. **Copy Configuration**
   - Firebase will show your config object
   - **IMPORTANT**: Copy this configuration - you'll need it in Step 5
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef123456789012"
   };
   ```

3. **Continue to Console**
   - Click "Continue to console"

## 🔐 Step 3: Enable Authentication

1. **Go to Authentication**
   - In left sidebar, click "Authentication"
   - Click "Get started" if it's your first time

2. **Set Up Sign-in Method**
   - Click "Sign-in method" tab
   - Click "Email/Password"
   - ✅ Enable "Email/Password"
   - ✅ Enable "Email link (passwordless sign-in)" (optional)
   - Click "Save"

3. **Configure Settings (Optional)**
   - Go to "Settings" tab
   - Set project name: "Food Rescue"
   - Add support email: your-email@example.com

## 🗄️ Step 4: Set Up Firestore Database

1. **Create Firestore Database**
   - In left sidebar, click "Firestore Database"
   - Click "Create database"

2. **Choose Security Rules**
   - Select "Start in test mode" (we'll update rules later)
   - Click "Next"

3. **Select Location**
   - Choose a location close to your users
   - **Recommended**: `us-central1` (Iowa) for global apps
   - Click "Done"

4. **Set Up Security Rules**
   - Once database is created, click "Rules" tab
   - Replace the default rules with:

   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can read/write their own profile
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Donations are readable by all authenticated users
       // Only the donor can create/update their donations
       match /donations/{donationId} {
         allow read: if request.auth != null;
         allow create: if request.auth != null && 
           request.auth.uid == resource.data.donorId;
         allow update, delete: if request.auth != null && 
           request.auth.uid == resource.data.donorId;
       }
       
       // Notifications are readable/writable by the recipient
       match /notifications/{notificationId} {
         allow read, write: if request.auth != null && 
           request.auth.uid == resource.data.userId;
       }
       
       // NGO analytics - readable by the NGO
       match /ngo_analytics/{ngoId} {
         allow read, write: if request.auth != null && 
           request.auth.uid == ngoId;
       }
       
       // Volunteer stats - readable by the volunteer
       match /volunteer_stats/{volunteerId} {
         allow read, write: if request.auth != null && 
           request.auth.uid == volunteerId;
       }
       
       // Allow reading of donation claims for coordination
       match /donation_claims/{claimId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
           (request.auth.uid == resource.data.ngoId || 
            request.auth.uid == resource.data.volunteerId);
       }
     }
   }
   ```

5. **Publish Rules**
   - Click "Publish"

## ⚙️ Step 5: Configure Your App

1. **Update Firebase Config**
   - Open your project in VS Code
   - Navigate to `config/firebase.ts`
   - Replace the placeholder config with your actual Firebase config:

   ```typescript
   // config/firebase.ts
   import { initializeApp } from 'firebase/app';
   import { getAuth } from 'firebase/auth';
   import { getFirestore } from 'firebase/firestore';

   // Replace this with your actual Firebase config
   const firebaseConfig = {
     apiKey: "your-actual-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789012",
     appId: "your-app-id"
   };

   const app = initializeApp(firebaseConfig);
   export const auth = getAuth(app);
   export const db = getFirestore(app);
   ```

2. **Create Environment File (Recommended)**
   - Create `.env` file in your project root:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
   EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

   - Update `config/firebase.ts` to use environment variables:
   ```typescript
   const firebaseConfig = {
     apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
     authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
     projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
     storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
     appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
   };
   ```

## 🔔 Step 6: Set Up Push Notifications (Optional)

1. **Enable Cloud Messaging**
   - In Firebase Console, go to "Cloud Messaging"
   - Click "Get started"

2. **Generate Server Key**
   - Go to Project Settings (gear icon)
   - Click "Cloud Messaging" tab
   - Copy the "Server key" for later use

## 🧪 Step 7: Test Your Setup

1. **Start Your App**
   ```bash
   cd your-food-rescue-app
   npx expo start
   ```

2. **Test Authentication**
   - Open your app
   - Try signing up with a test email
   - Check Firebase Console > Authentication > Users to see if user was created

3. **Test Database**
   - Try creating a food donation in your app
   - Check Firebase Console > Firestore Database to see if data was saved

## 📊 Step 8: Set Up Initial Data Collections

Firebase will create collections automatically when you first write to them, but you can create them manually for better organization:

1. **In Firestore Console**
   - Click "Start collection"
   - Create these collections:
     - `users` (for user profiles)
     - `donations` (for food donations)
     - `notifications` (for push notifications)
     - `ngo_analytics` (for NGO statistics)
     - `volunteer_stats` (for volunteer performance)

## 🔒 Security Best Practices

### 1. **Secure Your API Keys**
- Never commit Firebase config to public repositories
- Use environment variables for sensitive data
- Add `.env` to your `.gitignore` file

### 2. **Update Security Rules**
- Start with restrictive rules
- Test thoroughly before deploying
- Regularly review and update rules

### 3. **Monitor Usage**
- Set up billing alerts
- Monitor authentication attempts
- Review database usage regularly

## 🚨 Troubleshooting Common Issues

### Issue 1: "Firebase App not initialized"
**Solution**: Make sure you're importing Firebase config before using any Firebase services.

### Issue 2: "Permission denied" errors
**Solution**: Check your Firestore security rules and ensure they match your app's authentication flow.

### Issue 3: Authentication not working
**Solution**: 
- Verify your Firebase config is correct
- Check that Email/Password is enabled in Authentication settings
- Ensure you're using the correct project

### Issue 4: "Quota exceeded" errors
**Solution**: 
- Check your Firebase usage in the console
- Optimize your queries to reduce reads/writes
- Consider upgrading your Firebase plan

## 📞 Getting Help

### Firebase Documentation
- [Firebase Auth Guide](https://firebase.google.com/docs/auth)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [React Native Firebase](https://rnfirebase.io/)

### Support Resources
- [Firebase Support](https://firebase.google.com/support)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase)
- [Firebase Community Slack](https://firebase.community/)

## ✅ Final Checklist

Before launching your app, make sure:

- [ ] Firebase project is created and configured
- [ ] Authentication is enabled with Email/Password
- [ ] Firestore database is created with proper security rules
- [ ] Your app's Firebase config is updated
- [ ] Environment variables are set up (if using)
- [ ] Test user registration and data creation work
- [ ] Security rules are properly configured
- [ ] Billing alerts are set up (if using paid plan)

---

🎉 **Congratulations!** Your Firebase backend is now ready for your Food Rescue app!

## 🔄 Next Steps After Setup

1. **Test the app thoroughly** with different user roles
2. **Add sample data** to test all features
3. **Set up monitoring** and analytics
4. **Deploy to app stores** when ready

Your Food Rescue app is now powered by Firebase and ready to help reduce food waste! 🌍🍽️
