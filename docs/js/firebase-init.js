// js/firebase-init.js

// Firebase v9+ Modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, get, set, push, update, remove, child, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const firebaseConfig = {
  // apiKeyRemoved: "----------------",
  authDomain: "handleliste-3bdaa.firebaseapp.com",
  databaseURL: "https://handleliste-3bdaa-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "handleliste-3bdaa",
  storageBucket: "handleliste-3bdaa.appspot.com",
  messagingSenderId: "193993736216",
  appId: "1:193993736216:web:fake-for-now"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, get, set, push, update, remove, child, onValue };
