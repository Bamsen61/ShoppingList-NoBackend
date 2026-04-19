// js/additemtodatabase.js

import { db, push, ref, waitForAuth } from "./firebase-init.js";
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

  try {
    // Wait for authentication before adding item
    await waitForAuth();
    
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
  } catch (error) {
    console.error("❌ Error adding item:", error);
    
    if (error.message === 'Not authenticated' || error.message === 'Auth timeout') {
      alert("Please sign in before adding items.");
    } else if (error.code === 'PERMISSION_DENIED' || error.code === 'permission-denied') {
      alert("Access denied. Please sign in again and try once more.");
    } else {
      alert("Failed to add item. Please try again.");
    }
  }
};

window.cancelAdd = function () {
  window.location.href = "index.html";
};
