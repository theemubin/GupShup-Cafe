# Firebase Setup Guide

## 🔥 Firebase Configuration Setup

To enable the Firebase backend for your Campus Rewards Dashboard, follow these steps:

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `campus-rewards-dashboard`
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Firestore Database

1. In the Firebase console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location closest to your users
5. Click "Done"

### 3. Enable Firebase Storage

1. Go to "Storage" in the Firebase console
2. Click "Get started"
3. Keep the default security rules for now
4. Choose the same location as your Firestore
5. Click "Done"

### 4. Get Your Firebase Configuration

1. Go to "Project settings" (gear icon)
2. Scroll down to "Your apps"
3. Click "Web app" icon (`</>`)
4. Register your app with name "Campus Rewards Dashboard"
5. Copy the configuration object

### 5. Update Firebase Configuration

Replace the configuration in `js/firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### 6. Set Up Firestore Collections

The dashboard will automatically create these collections:

- **students**: Student profiles and points
- **houses**: House information and rankings
- **campuses**: Campus data and leaderboards
- **rewards**: Available rewards and claims
- **competitions**: House competitions and events
- **transactions**: Point transaction history
- **claims**: Reward claim records

### 7. Security Rules (Production)

For production, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to all users
    match /{document=**} {
      allow read: if true;
    }
    
    // Allow write access only to authenticated users
    match /students/{studentId} {
      allow write: if request.auth != null;
    }
    
    match /transactions/{transactionId} {
      allow write: if request.auth != null;
    }
    
    // Admin-only collections
    match /rewards/{rewardId} {
      allow write: if request.auth != null && 
        request.auth.token.admin == true;
    }
  }
}
```

### 8. Storage Security Rules

Update Firebase Storage rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /students/{studentId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /rewards/{rewardId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 📊 CSV Templates

The system supports these CSV formats:

### Students CSV Template:
```csv
studentId,name,campus,house,email,phone,academicPoints,lifeSkillsPoints,attendanceBonus,placementBonus,dropoutPenalty
S001,John Doe,pune,bageshree,john@example.com,9876543210,890,340,15,0,0
S002,Jane Smith,dharamshala,bhairav,jane@example.com,9876543211,750,420,0,15,-15
```

### Houses CSV Template:
```csv
houseId,name,campus,totalPoints,color,description
H001,Bageshree House,pune,1250,#e74c3c,The red house
H002,Bhairav House,dharamshala,1180,#3498db,The blue house
```

### Rewards CSV Template:
```csv
title,description,level,campus,status,likes,claimed
Coffee Voucher,Free coffee from campus café,1,pune,available,24,12
Meal Plan Credit,$25 credit for campus dining,2,dharamshala,available,67,30
```

## 🚀 Features Enabled

With Firebase integration, you get:

- ✅ **Real-time leaderboards** - Updates automatically
- ✅ **Bulk CSV uploads** - Import hundreds of students at once  
- ✅ **Image uploads** - Student profiles and reward images
- ✅ **Point transaction history** - Track all point changes
- ✅ **House competition management** - Add points for competitions
- ✅ **Advanced analytics** - Dashboard insights and trends
- ✅ **Offline support** - Works without internet connection
- ✅ **Automatic backups** - Data stored securely in the cloud

## 🔧 Testing the Integration

1. Open the dashboard at `http://localhost:8000`
2. Check browser console for "🔥 Firebase initialized successfully"
3. Go to Admin Panel → Bulk Operations
4. Try uploading a CSV file using the provided templates
5. Verify data appears in Firebase Console

## 📱 Mobile Support

The dashboard is fully responsive and works on:
- 📱 Mobile phones
- 📱 Tablets  
- 💻 Desktop computers
- 🖥️ Large displays

## 🆘 Troubleshooting

**Firebase not connecting?**
- Check your API key in `firebase-config.js`
- Verify project ID matches your Firebase project
- Ensure Firestore is enabled in Firebase Console

**CSV upload failing?**
- Check CSV format matches templates exactly
- Verify required fields are present
- Look for error messages in upload results

**Images not uploading?**
- Check Firebase Storage is enabled
- Verify file size is under 5MB
- Ensure file format is supported (jpg, png, gif)

## 🎯 Next Steps

1. Configure Firebase with your actual project details
2. Test CSV upload with sample data
3. Customize point categories for your campus needs
4. Set up admin user authentication
5. Deploy to production hosting (Firebase Hosting recommended)

Happy campus point management! 🏆
