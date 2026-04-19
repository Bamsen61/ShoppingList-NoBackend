// js/markitemtobuy.js

import { db, ref, update, onValue, waitForAuth } from "./firebase-init.js";
import { applySavedFontSize, getFromStorage } from "./common.js";

let unsubscribeListener = null; // Store the listener to clean up later

document.addEventListener("DOMContentLoaded", async () => {
  applySavedFontSize();
  const person = getFromStorage("person", "Morten");

  try {
    await waitForAuth();
    const itemsRef = ref(db, "handleliste");
    
    unsubscribeListener = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val() || {};
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
  list.innerHTML = "";

  const allItems = Object.entries(data).map(([id, val]) => ({ id, ...val })).filter(x => x.Buy === false);

  const personItems = allItems.filter(x => x.AddedBy === person).sort((a, b) => b.BuyNumber - a.BuyNumber).slice(0, 15);
  const personIds = new Set(personItems.map(i => i.id));

  const topOthers = allItems.filter(x => !personIds.has(x.id)).sort((a, b) => b.BuyNumber - a.BuyNumber).slice(0, 1);
  const topOthersIds = new Set(topOthers.map(i => i.id));

  const rest = allItems.filter(x => !personIds.has(x.id) && !topOthersIds.has(x.id)).sort((a, b) => a.Name.localeCompare(b.Name));

  const displayItems = [...personItems, ...topOthers, ...rest];

  displayItems.forEach((item) => {
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
    li.addEventListener("click", () => markToBuy(item.id, li));
    list.appendChild(li);
  });
}

// Clean up listener when page unloads
window.addEventListener('beforeunload', () => {
  if (unsubscribeListener) {
    unsubscribeListener();
  }
});

async function markToBuy(id, liElement) {
  try {
    await waitForAuth();
    const itemRef = ref(db, `handleliste/${id}`);
    await update(itemRef, { Buy: true });
  } catch (error) {
    console.error("❌ Error marking item to buy:", error);
    console.error("❌ Error details:", error.message);
    alert("Failed to mark item. Please try again.");
  }
}

window.showAddItemDialog = () => {
  window.location.href = "additemtodatabase.html";
};

window.goToShopPage = () => {
  window.location.href = "index.html";
};
