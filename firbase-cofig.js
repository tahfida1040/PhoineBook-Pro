// Firebase Configuration File
// Replace these values with your actual Firebase project credentials

const firebaseConfig = {
    apiKey: "AIzaSyExample-your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com", 
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789012345"
};

// How to get your Firebase configuration:
/*
1. Go to the Firebase Console (https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Click on "Project Settings" (gear icon)
4. Scroll down to "Your apps" section
5. Click "Add app" and select "Web" (</>)
6. Register your app with a nickname
7. Copy the firebaseConfig object values and replace the ones above

Required Services to Enable:
1. Firestore Database:
   - Go to Firestore Database
   - Click "Create database"
   - Choose "Start in test mode" (for development)
   - Select a location

2. Storage:
   - Go to Storage
   - Click "Get started"
   - Choose "Start in test mode" (for development)

3. Set up Firestore Security Rules (for production):
   - Replace the default rules with secure rules
   - Example rules for this app:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write their own contacts
    match /contacts/{contactId} {
      allow read, write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
    }
  }
}

4. Set up Storage Security Rules:
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /contact-images/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}

Note: The current implementation uses simple password authentication.
For production, consider implementing Firebase Authentication for better security.
*/

export default firebaseConfig;