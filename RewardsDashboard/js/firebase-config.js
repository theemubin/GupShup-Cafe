// Firebase Configuration and Initialization
// Configuration for "efforts-celebrations" Firebase project

const firebaseConfig = {
    apiKey: "AIzaSyDORRABIK1fPpreVGRNwwQbfTFMYH-cysM",
    authDomain: "efforts-celebrations.firebaseapp.com",
    projectId: "efforts-celebrations",
    storageBucket: "efforts-celebrations.firebasestorage.app",
    messagingSenderId: "14557716507",
    appId: "1:14557716507:web:9e751db40ebb133be358be",
    measurementId: "G-RJCDD0CB6D"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore only (Storage is paid feature)
const db = firebase.firestore();

// Note: Firebase Storage is not used (paid feature)
// Images will be stored as Base64 strings or external URLs

// Configure Firestore settings for offline support (newer syntax)
try {
    db.enablePersistence({
        synchronizeTabs: true
    });
    console.log('✅ Firestore offline persistence enabled');
} catch (err) {
    if (err.code == 'failed-precondition') {
        console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code == 'unimplemented') {
        console.log('The current browser does not support offline persistence');
    } else {
        console.warn('Firestore persistence error:', err);
    }
}

// Global Firebase utilities
window.FirebaseDB = {
    db,
    
    // Collection references
    students: db.collection('students'),
    houses: db.collection('houses'),
    campuses: db.collection('campuses'),
    rewards: db.collection('rewards'),
    competitions: db.collection('competitions'),
    transactions: db.collection('transactions'),
    
    // Batch operations
    batch: () => db.batch(),
    
    // Server timestamp
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    
    // Increment helper
    increment: (value) => firebase.firestore.FieldValue.increment(value),
    
    // Array operations
    arrayUnion: (value) => firebase.firestore.FieldValue.arrayUnion(value),
    arrayRemove: (value) => firebase.firestore.FieldValue.arrayRemove(value),
    
    // Image handling utilities (without Firebase Storage)
    imageUtils: {
        // Convert file to Base64
        fileToBase64: (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        },
        
        // Compress image before storing
        compressImage: (file, maxSize = 100000) => { // 100KB max
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = () => {
                    // Calculate new dimensions
                    let { width, height } = img;
                    const maxDimension = 300; // Max 300px width/height
                    
                    if (width > height) {
                        if (width > maxDimension) {
                            height = (height * maxDimension) / width;
                            width = maxDimension;
                        }
                    } else {
                        if (height > maxDimension) {
                            width = (width * maxDimension) / height;
                            height = maxDimension;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw and compress
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Try different quality levels to get under maxSize
                    let quality = 0.8;
                    let dataUrl = canvas.toDataURL('image/jpeg', quality);
                    
                    while (dataUrl.length > maxSize && quality > 0.1) {
                        quality -= 0.1;
                        dataUrl = canvas.toDataURL('image/jpeg', quality);
                    }
                    
                    resolve(dataUrl);
                };
                
                img.src = URL.createObjectURL(file);
            });
        }
    }
};

console.log('🔥 Firebase initialized successfully');
