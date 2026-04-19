// js/main.js

import { db, ref, update, get, child, onValue, waitForAuth, signOutUser } from "./firebase-init.js";
import {
  getFromStorage,
  applySavedFontSize,
  saveToStorage,
  updateFontSize
} from "./common.js";

// Wait for DOM to be ready before getting elements
let itemList;
let unsubscribeMainListener = null; // Store the listener to clean up later

function getItemList() {
  if (!itemList) {
    itemList = document.getElementById("itemList");
    if (!itemList) {
      console.error("❌ ERROR: Could not find itemList element!");
      return null;
    }
  }
  return itemList;
}

function renderItemList(items) {
  const itemListElement = getItemList();
  if (!itemListElement) {
    console.error("❌ Cannot render items: itemList element not found");
    return;
  }

  itemListElement.innerHTML = "";

  if (items.length === 0) {
    const li = document.createElement("li");
    li.style.padding = "1em";
    li.style.textAlign = "center";
    li.style.color = "#666";
    li.textContent = "📝 No items to buy yet. Click 'Add' to add items.";
    itemListElement.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.classList.add("item-row");

    const nameSpan = document.createElement("span");
    nameSpan.classList.add("item-name");
    nameSpan.textContent = item.Name || "Unnamed item";

    const shopSpan = document.createElement("span");
    shopSpan.classList.add("item-shop");
    shopSpan.textContent = item.Shop || "No shop";

    li.appendChild(nameSpan);
    li.appendChild(shopSpan);

    li.addEventListener("click", () => markItemAsBought(item.id));

    itemListElement.appendChild(li);
  });
}

function markItemAsBought(itemId) {
  waitForAuth()
    .then(() => {
      const itemRef = ref(db, `handleliste/${itemId}`);
      return get(itemRef);
    })
    .then(snapshot => {
      if (snapshot.exists()) {
        const item = snapshot.val();
        const currentDate = new Date().toISOString().split("T")[0];
        const newBoughtDate = [currentDate, ...(item.BoughtDate || [])].slice(0, 10);
        const itemRef = ref(db, `handleliste/${itemId}`);
        return update(itemRef, {
          Buy: false,
          BoughtBy: getFromStorage("person", "Anonymous"),
          BoughtDate: newBoughtDate,
          BuyNumber: (item.BuyNumber || 0) + 1
        });
      }
    })
    .catch(error => {
      console.error("❌ Error marking item as bought:", error);
    });
}

function setupRealtimeListener() {
  waitForAuth()
    .then(() => {
      const itemsRef = ref(db, "handleliste");
      
      unsubscribeMainListener = onValue(itemsRef, (snapshot) => {
        const data = snapshot.val() || {};
        const allItems = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        const buyableItems = allItems.filter(item => item.Buy === true);
        renderItemList(buyableItems);
      }, (error) => {
        console.error("❌ Real-time listener error:", error);
        handleFirebaseError(error);
      });
    })
    .catch(error => {
      console.error("❌ Authentication error:", error);
      handleFirebaseError(error);
    });
}

function handleFirebaseError(error) {
  console.error("❌ Firebase error:", error);
  console.error("📋 Error details:", error.message);
  
  // Show error message to user
  const itemListElement = getItemList();
  if (itemListElement) {
    if (error.message === 'Not authenticated' || error.message === 'Auth timeout') {
      itemListElement.innerHTML = `<li style="color: orange; padding: 1em;">
        🔐 Please sign in to use the shopping list.<br>
        If you were signed out, go to the login page and try again.<br>
        <button onclick="location.reload()">🔄 Retry</button>
      </li>`;
    } else if (error.code === 'permission-denied') {
      itemListElement.innerHTML = `<li style="color: orange; padding: 1em;">
        🔐 Access denied.<br>
        Please sign in again, or check Firebase Database Rules if this continues.<br>
        <button onclick="location.reload()">🔄 Retry</button>
      </li>`;
    } else if (error.code === 'auth/admin-restricted-operation') {
      itemListElement.innerHTML = `<li style="color: orange; padding: 1em;">
        🔐 Sign-in is not available right now.<br>
        Check Firebase Authentication settings in the Firebase Console.<br>
        <button onclick="location.reload()">🔄 Retry</button>
      </li>`;
    } else {
      itemListElement.innerHTML = `<li style="color: red; padding: 1em;">
        ❌ Error loading items: ${error.message}<br>
        Check browser console for details.<br>
        <button onclick="location.reload()">🔄 Retry</button>
      </li>`;
    }
  }
}

// Clean up listener when page unloads
window.addEventListener('beforeunload', () => {
  if (unsubscribeMainListener) {
    unsubscribeMainListener();
  }
});

window.addEventListener("DOMContentLoaded", () => {
  applySavedFontSize();
  const person = getFromStorage("person", "Morten");
  document.getElementById("personSelector").value = person;
  setupRealtimeListener();
});

window.updatePerson = () => {
  const person = document.getElementById("personSelector").value;
  saveToStorage("person", person);
};

window.updateFontSize = updateFontSize;

window.logout = () => {
  if (confirm('Are you sure you want to sign out?')) {
    signOutUser();
  }
};
