// js/firebase-init.js

// Firebase v9+ Modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, get, set, push, update, remove, child, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Firebase configuration - API key is restricted by domain and referrer in Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBOtxlG3Wvf2ZUF_KbZ7wlCiDHqJ5RMrvY", // Domain-restricted key
  authDomain: "handleliste-3bdaa.firebaseapp.com",
  databaseURL: "https://handleliste-3bdaa-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "handleliste-3bdaa",
  storageBucket: "handleliste-3bdaa.appspot.com",
  messagingSenderId: "193993736216",
  appId: "1:193993736216:web:ac36bb1f7010918c5f836d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Set authentication persistence to LOCAL (stays logged in forever until manual logout)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("🔒 Authentication persistence set to LOCAL (persistent across sessions)");
  })
  .catch((error) => {
    console.warn("⚠️ Could not set auth persistence:", error);
  });

// Authentication state management
let isAuthenticated = false;
let authPromise = null;
let authStateLoaded = false;

function waitForAuth() {
  if (authPromise) return authPromise;
  
  authPromise = new Promise((resolve, reject) => {
    // If we already know the auth state and user is authenticated
    if (authStateLoaded && isAuthenticated) {
      resolve();
      return;
    }
    
    // If we already know the auth state and user is NOT authenticated
    if (authStateLoaded && !isAuthenticated) {
      console.log("❌ Not authenticated, redirecting to login...");
      // Add delay to prevent infinite loops
      setTimeout(() => {
        if (!window.location.pathname.includes('login.html')) {
          window.location.href = 'login.html';
        }
      }, 500);
      reject(new Error('Not authenticated'));
      return;
    }
    
    console.log("🔐 Waiting for authentication state to load...");
    
    // Wait up to 5 seconds for auth state to be determined
    let timeoutId;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      authStateLoaded = true;
      unsubscribe(); // Stop listening once we get the first result
      clearTimeout(timeoutId);
      
      if (user) {
        console.log("✅ User authenticated:", user.email);
        isAuthenticated = true;
        resolve();
      } else {
        console.log("❌ No authenticated user, redirecting to login...");
        isAuthenticated = false;
        // Add delay to prevent infinite loops
        setTimeout(() => {
          if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
          }
        }, 500);
        reject(new Error('Not authenticated'));
      }
    });
    
    // Timeout after 5 seconds if no auth state is received
    timeoutId = setTimeout(() => {
      unsubscribe();
      console.log("⏰ Auth state timeout, redirecting to login...");
      if (!window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
      }
      reject(new Error('Auth timeout'));
    }, 5000);
  });
  
  return authPromise;
}

// Function to sign in with email and password
async function signInUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ User signed in:", userCredential.user.email);
    isAuthenticated = true;
    return userCredential.user;
  } catch (error) {
    console.error("❌ Sign in failed:", error.code, error.message);
    throw error;
  }
}

// Function to sign out
async function signOutUser() {
  try {
    await signOut(auth);
    isAuthenticated = false;
    console.log("✅ User signed out");
    window.location.href = 'login.html';
  } catch (error) {
    console.error("❌ Sign out failed:", error);
  }
}

// Listen for auth state changes (for UI updates)
onAuthStateChanged(auth, (user) => {
  authStateLoaded = true;
  if (user) {
    console.log("👤 User authenticated:", user.email);
    isAuthenticated = true;
  } else {
    console.log("👤 User not authenticated");
    isAuthenticated = false;
  }
});

export { db, ref, get, set, push, update, remove, child, onValue, auth, waitForAuth, signInUser, signOutUser };
