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
    
    if (error.code === 'PERMISSION_DENIED') {
      alert("Authentication required. Please check your connection and try again.");
    } else {
      alert("Failed to add item. Please try again.");
    }
  }
};

window.cancelAdd = function () {
  window.location.href = "index.html";
};
