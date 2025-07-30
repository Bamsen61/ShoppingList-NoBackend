// js/additemtodatabase.js

import { db, push, ref } from "./firebase-init.js";
import { applySavedFontSize, getFromStorage } from "./common.js";

document.addEventListener("DOMContentLoaded", () => {
  applySavedFontSize();
});

window.submitItem = async function () {
  const Name = document.getElementById("itemName").value.trim();
  const Shop = document.getElementById("itemShop").value.trim();
  const AddedBy = getFromStorage("person", "Morten");

  if (!Name || !Shop) {
    alert("Name and Shop are required.");
    return;
  }

  const item = {
    Name,
    Shop,
    AddedBy,
    BoughtBy: "",
    BoughtDate: [],
    Buy: true,
    BuyNumber: 0
  };

  await push(ref(db, "handleliste"), item);
  window.location.href = "index.html";
};

window.cancelAdd = function () {
  window.location.href = "index.html";
};
