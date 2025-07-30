// js/markitemtobuy.js

import { db, ref, update, get, waitForAuth } from "./firebase-init.js";
import { applySavedFontSize, getFromStorage } from "./common.js";

document.addEventListener("DOMContentLoaded", async () => {
  applySavedFontSize();
  const person = getFromStorage("person", "Morten");

  try {
    // Wait for authentication before accessing database
    await waitForAuth();
    
    const itemsRef = ref(db, "handleliste");
    const snapshot = await get(itemsRef);
    const data = snapshot.val() || {};
    const list = document.getElementById("addList");
    list.innerHTML = "";

    const allItems = Object.entries(data).map(([id, val]) => ({ id, ...val })).filter(x => x.Buy === false);

    const personItems = allItems.filter(x => x.AddedBy === person).sort((a, b) => b.BuyNumber - a.BuyNumber).slice(0, 15);
    const personIds = new Set(personItems.map(i => i.id));

    const topOthers = allItems.filter(x => !personIds.has(x.id)).sort((a, b) => b.BuyNumber - a.BuyNumber).slice(0, 1);
    const topOthersIds = new Set(topOthers.map(i => i.id));

    const rest = allItems.filter(x => !personIds.has(x.id) && !topOthersIds.has(x.id)).sort((a, b) => a.Name.localeCompare(b.Name));

    const displayItems = [...personItems, ...topOthers, ...rest];

    displayItems.forEach(item => {
      const li = document.createElement("li");
      li.classList.add("item-row");
      li.innerHTML = `<span class="item-name">${item.Name}</span><span class="item-shop">${item.Shop}</span>`;
      li.addEventListener("click", () => markToBuy(item.id, li));
      list.appendChild(li);
    });
  } catch (error) {
    console.error("❌ Error loading items:", error);
    const list = document.getElementById("addList");
    if (list) {
      list.innerHTML = `<li style="color: red; padding: 1em;">
        ❌ Authentication required to load items.<br>
        <button onclick="location.reload()">🔄 Retry</button>
      </li>`;
    }
  }
});

async function markToBuy(id, liElement) {
  try {
    await waitForAuth();
    const itemRef = ref(db, `handleliste/${id}`);
    await update(itemRef, { Buy: true });
    liElement.remove();
  } catch (error) {
    console.error("❌ Error marking item to buy:", error);
    alert("Failed to mark item. Please try again.");
  }
}

window.showAddItemDialog = () => window.location.href = "additemtodatabase.html";
window.goToShopPage = () => window.location.href = "index.html";
