import { clearOfflineList } from './offline-list.js';
// js/firebase-init.js

import { APP_VERSION } from "./version.js";
export { APP_VERSION };

// Firebase v9+ Modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, get, set, push, update, remove, child, onValue, goOffline, goOnline } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Firebase web configuration. Active API key restrictions have not been verified.
const firebaseConfig = {
  apiKey: "AIzaSyBOtxlG3Wvf2ZUF_KbZ7wlCiDHqJ5RMrvY",
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
const authorizedUids = new Set([
  "ZDq6ZGvDVDafX8BVlWGRhBoSn9X2",
  "fmVOzYiAtsOUNnUE33VZbwHR0SG3"
]);

function isAuthorizedUser(user) {
  return Boolean(user && authorizedUids.has(user.uid));
}

// Persist authentication across sessions when browser storage is available.
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

let resolveAuthState;

async function waitForAuth() {
  if (!authStateLoaded) {
    // Share only the pending attempt. A timeout must not poison later retries.
    if (!authPromise) {
      authPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Auth timeout')), 5000);
        resolveAuthState = () => { clearTimeout(timeoutId); resolve(); };
      }).finally(() => {
        authPromise = null;
        resolveAuthState = null;
      });
    }
    await authPromise;
  }

  // Always recheck the latest state, including after a previous successful wait.
  if (isAuthenticated) return;
  clearOfflineList();
  setTimeout(() => {
    if (authStateLoaded && !isAuthenticated && navigator.onLine !== false &&
        !window.location.pathname.includes('login.html')) {
      window.location.href = 'login.html';
    }
  }, 500);
  throw new Error('Not authenticated');
}

// Function to sign in with email and password
async function signInUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!isAuthorizedUser(userCredential.user)) {
      await signOut(auth);
      const error = new Error("This account is not authorized for Handleliste.");
      error.code = "auth/unauthorized-user";
      throw error;
    }
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
    clearOfflineList();
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
  if (isAuthorizedUser(user)) {
    console.log("👤 User authenticated:", user.email);
    isAuthenticated = true;
  } else {
    if (user) signOut(auth).catch(console.error);
    console.log("👤 User not authenticated");
    isAuthenticated = false;
    clearOfflineList();
  }
  // This observer stays active even when a wait times out.
  resolveAuthState?.();
});

export { db, ref, get, set, push, update, remove, child, onValue, goOffline, goOnline, auth, waitForAuth, signInUser, signOutUser, isAuthorizedUser };
