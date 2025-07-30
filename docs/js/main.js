// js/main.js

import { db, ref, update, get, child } from "./firebase-init.js";
import {
  getFromStorage,
  applySavedFontSize,
  saveToStorage,
  updateFontSize
} from "./common.js";

const itemList = document.getElementById("itemList");

function renderItemList(items) {
  itemList.innerHTML = "";
  items.forEach(item => {
    const li = document.createElement("li");
    li.classList.add("item-row");

    const nameSpan = document.createElement("span");
    nameSpan.classList.add("item-name");
    nameSpan.textContent = item.Name;

    const shopSpan = document.createElement("span");
    shopSpan.classList.add("item-shop");
    shopSpan.textContent = item.Shop;

    li.appendChild(nameSpan);
    li.appendChild(shopSpan);

    li.addEventListener("click", () => markItemAsBought(item.id));

    itemList.appendChild(li);
  });
}

function markItemAsBought(itemId) {
  const itemRef = ref(db, `handleliste/${itemId}`);
  get(itemRef).then(snapshot => {
    if (snapshot.exists()) {
      const item = snapshot.val();
      const currentDate = new Date().toISOString().split("T")[0];
      const newBoughtDate = [currentDate, ...(item.BoughtDate || [])].slice(0, 10);
      update(itemRef, {
        Buy: false,
        BoughtBy: getFromStorage("person", "Anonymous"),
        BoughtDate: newBoughtDate,
        BuyNumber: (item.BuyNumber || 0) + 1
      });
    }
  });
}

function fetchItems(shop) {
  const itemsRef = ref(db, "handleliste");
  get(itemsRef).then(snapshot => {
    const data = snapshot.val() || {};
    const filtered = Object.entries(data).map(([id, val]) => ({ id, ...val }))
      .filter(item => item.Buy === true && (shop === "Alle" || item.Shop === shop));
    renderItemList(filtered);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  applySavedFontSize();
  const person = getFromStorage("person", "Morten");
  document.getElementById("personSelector").value = person;
  const shop = getFromStorage("shop", "Alle");
  document.getElementById("shopName").textContent = shop;
  fetchItems(shop);
});

window.updatePerson = () => {
  const person = document.getElementById("personSelector").value;
  saveToStorage("person", person);
};

window.updateFontSize = updateFontSize;
