// js/markitemtobuy.js

import { db, ref, update, onValue, waitForAuth } from "./firebase-init.js";
import { applySavedFontSize, getFromStorage } from "./common.js";

console.log("🚀 markitemtobuy.js script loaded!");

let unsubscribeListener = null; // Store the listener to clean up later

document.addEventListener("DOMContentLoaded", async () => {
  console.log("📱 DOMContentLoaded fired in markitemtobuy.js");
  
  applySavedFontSize();
  const person = getFromStorage("person", "Morten");
  console.log("👤 Current person:", person);

  try {
    console.log("🔐 Waiting for authentication...");
    await waitForAuth();
    console.log("✅ Authentication complete!");
    
    console.log("📡 Setting up real-time listener for items...");
    const itemsRef = ref(db, "handleliste");
    
    // Set up real-time listener instead of one-time get()
    unsubscribeListener = onValue(itemsRef, (snapshot) => {
      console.log("🔔 Real-time update received!");
      const data = snapshot.val() || {};
      console.log("📊 Raw data received, total items:", Object.keys(data).length);
      
      renderAddItems(data, person);
    }, (error) => {
      console.error("❌ Real-time listener error:", error);
    });
    
  } catch (error) {
    console.error("❌ Error setting up real-time listener:", error);
    console.error("❌ Error details:", error.message);
    console.error("❌ Error stack:", error.stack);
    const list = document.getElementById("addList");
    if (list) {
      list.innerHTML = `<li style="color: red; padding: 1em;">
        ❌ Authentication required to load items.<br>
        <button onclick="location.reload()">🔄 Retry</button>
      </li>`;
    }
  }
});

function renderAddItems(data, person) {
  const list = document.getElementById("addList");
  console.log("📋 Found addList element:", !!list);
  list.innerHTML = "";

  const allItems = Object.entries(data).map(([id, val]) => ({ id, ...val })).filter(x => x.Buy === false);
  console.log("🛒 Items with Buy=false:", allItems.length);

  const personItems = allItems.filter(x => x.AddedBy === person).sort((a, b) => b.BuyNumber - a.BuyNumber).slice(0, 15);
  const personIds = new Set(personItems.map(i => i.id));

  const topOthers = allItems.filter(x => !personIds.has(x.id)).sort((a, b) => b.BuyNumber - a.BuyNumber).slice(0, 1);
  const topOthersIds = new Set(topOthers.map(i => i.id));

  const rest = allItems.filter(x => !personIds.has(x.id) && !topOthersIds.has(x.id)).sort((a, b) => a.Name.localeCompare(b.Name));

  const displayItems = [...personItems, ...topOthers, ...rest];
  console.log("🎨 Total items to display:", displayItems.length);

  displayItems.forEach((item, index) => {
    console.log(`📋 Creating item ${index + 1}:`, item.Name);
    const li = document.createElement("li");
    li.classList.add("item-row");
    li.innerHTML = `<span class="item-name">${item.Name}</span><span class="item-shop">${item.Shop}</span>`;
    li.addEventListener("click", () => markToBuy(item.id, li));
    list.appendChild(li);
  });
  
  console.log("✅ markitemtobuy.js items rendered!");
}

// Clean up listener when page unloads
window.addEventListener('beforeunload', () => {
  if (unsubscribeListener) {
    unsubscribeListener();
    console.log("🧹 Real-time listener cleaned up");
  }
});

async function markToBuy(id, liElement) {
  console.log("🎯 markToBuy called for item ID:", id);
  try {
    console.log("🔐 Waiting for auth in markToBuy...");
    await waitForAuth();
    console.log("📝 Updating item to Buy=true...");
    const itemRef = ref(db, `handleliste/${id}`);
    await update(itemRef, { Buy: true });
    console.log("✅ Item updated successfully");
    // Note: Don't manually remove the item - let the real-time listener handle it
  } catch (error) {
    console.error("❌ Error marking item to buy:", error);
    console.error("❌ Error details:", error.message);
    alert("Failed to mark item. Please try again.");
  }
}

window.showAddItemDialog = () => {
  console.log("🔄 Navigating to add new item page...");
  window.location.href = "additemtodatabase.html";
};

window.goToShopPage = () => {
  console.log("🏠 Navigating back to shopping list...");
  window.location.href = "index.html";
};
