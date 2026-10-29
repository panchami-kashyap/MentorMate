// ========================================
// MENTORMATE - FIREBASE CONFIGURATION
// ========================================

const firebaseConfig = {
    apiKey: "AIzaSyD9kGapeLjD6XE3BTa6LkHbodbkjzhqF_U",
    authDomain: "mentormateapp-18074.firebaseapp.com",
    projectId: "mentormateapp-18074",
    storageBucket: "mentormateapp-18074.firebasestorage.app",
    messagingSenderId: "719012274175",
    appId: "1:719012274175:web:ba4f8374e08cb26e5f91ca"
};

// Initialise Firebase only once
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialise Cloud Firestore
const db = firebase.firestore();
window.db = db;

// Set session persistence for authentication
firebase.auth().setPersistence(
    firebase.auth.Auth.Persistence.SESSION
).then(() => {
    console.log("Firebase session persistence enabled.");
}).catch(error => {
    console.error(
        "Could not set authentication persistence:",
        error
    );
});

console.log("MentorMate Firebase connected successfully!");