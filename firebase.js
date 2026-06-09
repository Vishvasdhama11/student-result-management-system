/* ========================================
   FINACER - Firebase Configuration
   Initialize Firebase with your credentials
   ======================================== */

// Import Firebase modules (loaded from CDN in HTML)
// These globals are available: firebase, db, auth

// ⚠️ IMPORTANT: Replace with your Firebase credentials
// Get these from: Firebase Console > Project Settings > Web App Config
const firebaseConfig = {
  apiKey: "AIzaSyBJiZp-TmeeFrHQ7BvD3YMKZ6-_YQtKioE",
  authDomain: "finacer-36ba9.firebaseapp.com",
  projectId: "finacer-36ba9",
  storageBucket: "finacer-36ba9.firebasestorage.app",
  messagingSenderId: "673262734760",
  appId: "1:673262734760:web:c1092a52c93543633f619d",
  measurementId: "G-9ZZNHPPVJZ"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Warn if config is not replaced
const missingConfig = firebaseConfig.apiKey.includes('YOUR_API_KEY') ||
    firebaseConfig.authDomain.includes('your-project') ||
    firebaseConfig.projectId.includes('your-project-id');

if (missingConfig) {
    console.error('Firebase config is not set. Replace placeholder values in assets/js/firebase.js with your Firebase project config.');
    window.firebaseConfigValid = false;
    window.addEventListener('DOMContentLoaded', () => {
        const warning = document.createElement('div');
        warning.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:14px 16px;background:#b91c1c;color:#fff;font-size:0.95rem;z-index:9999;text-align:center;';
        warning.innerHTML = '<strong>Firebase configuration is missing.</strong> Update <code>assets/js/firebase.js</code> with your project values and reload the page.';
        document.body.prepend(warning);
    });
} else {
    window.firebaseConfigValid = true;
}

// Get references to Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Set Firestore settings
db.settings({
    timestampsInSnapshots: true
});

console.log('Firebase services initialized: Auth and Firestore');
