// js/main.js

import { db, ref, update, get, child, waitForAuth, signOutUser } from "./firebase-init.js";
import {
  getFromStorage,
  applySavedFontSize,
  saveToStorage,
  updateFontSize
} from "./common.js";

// Wait for DOM to be ready before getting elements
let itemList;

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
  console.log("🎨 Rendering items:", items);
  console.log("📊 Number of items to render:", items.length);
  
  const itemListElement = getItemList();
  if (!itemListElement) {
    console.error("❌ Cannot render items: itemList element not found");
    console.error("❌ DOM ready state:", document.readyState);
    console.error("❌ Available elements with id:", 
      Array.from(document.querySelectorAll('[id]')).map(el => el.id));
    return;
  }
  
  console.log("✅ Found itemList element:", itemListElement);
  console.log("📍 Element parent:", itemListElement.parentElement);
  
  itemListElement.innerHTML = "";
  console.log("🧹 Cleared existing content");
  
  if (items.length === 0) {
    const li = document.createElement("li");
    li.style.padding = "1em";
    li.style.textAlign = "center";
    li.style.color = "#666";
    li.textContent = "📝 No items to buy yet. Click 'Add' to add items.";
    itemListElement.appendChild(li);
    console.log("📝 Added 'no items' message");
    return;
  }
  
  items.forEach((item, index) => {
    console.log(`🏷️ Rendering item ${index + 1}:`, item);
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
    console.log(`✅ Added item ${index + 1} to DOM`);
  });
  
  console.log("🎨 Rendering complete. Final DOM children:", itemListElement.children.length);
}

function markItemAsBought(itemId) {
  console.log("🛒 Marking item as bought:", itemId);
  
  // Wait for authentication before accessing database
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
    .then(() => {
      console.log("✅ Item marked as bought successfully");
      // Refresh the list
      fetchItems();
    })
    .catch(error => {
      console.error("❌ Error marking item as bought:", error);
    });
}

function fetchItems() {
  console.log("🔍 Fetching all items marked for buying...");
  console.log("🔐 Waiting for authentication...");
  
  // Wait for authentication before accessing database
  waitForAuth()
    .then(() => {
      console.log("✅ Authentication complete, accessing database...");
      const itemsRef = ref(db, "handleliste");
      return get(itemsRef);
    })
    .then(snapshot => {
      console.log("📡 Firebase response received");
      const data = snapshot.val() || {};
      console.log("📊 Raw database data (first 3 items):", Object.keys(data).slice(0, 3).reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {}));
      
      const allItems = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      console.log("📋 Total items found:", allItems.length);
      
      const buyableItems = allItems.filter(item => item.Buy === true);
      console.log("🛒 Items marked for buying (Buy === true):", buyableItems.length);
      console.log("🛒 Buyable items details:", buyableItems);
      
      // Extra debugging - check each item's Buy value
      const buyTrueCount = allItems.filter(item => item.Buy === true).length;
      const buyFalseCount = allItems.filter(item => item.Buy === false).length;
      const buyUndefinedCount = allItems.filter(item => item.Buy === undefined).length;
      
      console.log("📊 Buy value statistics:");
      console.log("  - Buy === true:", buyTrueCount);
      console.log("  - Buy === false:", buyFalseCount);
      console.log("  - Buy === undefined:", buyUndefinedCount);
      
      renderItemList(buyableItems);
    })
    .catch(error => {
      console.error("❌ Firebase error:", error);
      console.error("📋 Error details:", error.message);
      
      // Show error message to user
      const itemListElement = getItemList();
      if (itemListElement) {
        if (error.code === 'permission-denied') {
          itemListElement.innerHTML = `<li style="color: orange; padding: 1em;">
            🔐 Authentication required. Please check Firebase Console:<br>
            1. Enable Anonymous Authentication<br>
            2. Check Database Rules<br>
            <button onclick="location.reload()">🔄 Retry</button>
          </li>`;
        } else if (error.code === 'auth/admin-restricted-operation') {
          itemListElement.innerHTML = `<li style="color: orange; padding: 1em;">
            🔐 Anonymous auth not enabled in Firebase Console<br>
            Please enable it in Authentication → Sign-in method<br>
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
    });
}

window.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 ShoppingList app starting...");
  
  applySavedFontSize();
  const person = getFromStorage("person", "Morten");
  
  console.log("👤 Current person:", person);
  
  document.getElementById("personSelector").value = person;
  
  console.log("📡 Starting to fetch items...");
  fetchItems();
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
