// Multi-Database Firebase Configuration
// Supporting multiple Firebase projects/databases with Authentication

// Primary Database Configuration (Current - efforts-celebrations)
const primaryFirebaseConfig = {
    apiKey: "AIzaSyDORRABIK1fPpreVGRNwwQbfTFMYH-cysM",
    authDomain: "efforts-celebrations.firebaseapp.com",
    projectId: "efforts-celebrations",
    storageBucket: "efforts-celebrations.firebasestorage.app",
    messagingSenderId: "14557716507",
    appId: "1:14557716507:web:9e751db40ebb133be358be",
    measurementId: "G-RJCDD0CB6D"
};

// Secondary Database Configuration (English Vault Project)

// Initialize Primary Firebase App (Default)
const primaryApp = firebase.initializeApp(primaryFirebaseConfig);
const primaryDb = firebase.firestore(primaryApp);
const primaryAuth = firebase.auth(primaryApp);

// Initialize Secondary Firebase App (Named)

// Configure offline persistence for both databases
try {
    primaryDb.enablePersistence({ synchronizeTabs: true });
    console.log('✅ Primary database offline persistence enabled');
} catch (err) {
    console.log('⚠️ Primary database persistence failed:', err.code);
}


// Export database instances with authentication
window.FirebaseConnections = {
    primary: {
        app: primaryApp,
        db: primaryDb,
        auth: primaryAuth,
        config: primaryFirebaseConfig
    },
};

console.log('🔥 Multi-Firebase configuration loaded');
console.log('Primary DB:', primaryFirebaseConfig.projectId);
