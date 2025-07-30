// js/markitemtobuy.js

import { db, ref, update, get } from "./firebase-init.js";
import { applySavedFontSize, getFromStorage } from "./common.js";

document.addEventListener("DOMContentLoaded", async () => {
  applySavedFontSize();
  const person = getFromStorage("person", "Morten");

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
});

function markToBuy(id, liElement) {
  const itemRef = ref(db, `handleliste/${id}`);
  update(itemRef, { Buy: true }).then(() => liElement.remove());
}

window.showAddItemDialog = () => window.location.href = "additemtodatabase.html";
window.goToShopPage = () => window.location.href = "index.html";
