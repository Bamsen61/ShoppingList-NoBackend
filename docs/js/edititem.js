// js/edititem.js

import { db, ref, get, update, remove, waitForAuth } from "./firebase-init.js";
import { applySavedFontSize, navigateWithoutHistory, returnToMainPage } from "./common.js";

const params = new URLSearchParams(window.location.search);
const itemId = params.get("id");
const returnPage = params.get("return") || "index.html";

function goBack() {
  if (returnPage === "index.html") {
    returnToMainPage();
    return;
  }

  navigateWithoutHistory(returnPage);
}

document.addEventListener("DOMContentLoaded", async () => {
  applySavedFontSize();

  if (!itemId) {
    alert("Mangler vare-ID.");
    goBack();
    return;
  }

  try {
    await waitForAuth();
    const snapshot = await get(ref(db, `handleliste/${itemId}`));

    if (!snapshot.exists()) {
      alert("Fant ikke varen.");
      goBack();
      return;
    }

    const item = snapshot.val();
    document.getElementById("itemName").value = item.Name || "";
    document.getElementById("itemShop").value = item.Shop || "";
  } catch (error) {
    console.error("❌ Error loading item:", error);
    alert("Kunne ikke laste varen. Prøv igjen.");
    goBack();
  }
});

window.saveItem = async function () {
  const Name = document.getElementById("itemName").value.trim();
  const Shop = document.getElementById("itemShop").value.trim();

  if (!Name || !Shop) {
    alert("Vare og butikk må fylles ut.");
    return;
  }

  try {
    await waitForAuth();
    await update(ref(db, `handleliste/${itemId}`), { Name, Shop });
    goBack();
  } catch (error) {
    console.error("❌ Error saving item:", error);
    alert("Kunne ikke lagre varen. Prøv igjen.");
  }
};

window.cancelEdit = function () {
  goBack();
};

window.deleteItem = async function () {
  if (!confirm("Slette varen?")) {
    return;
  }

  try {
    await waitForAuth();
    await remove(ref(db, `handleliste/${itemId}`));
    goBack();
  } catch (error) {
    console.error("❌ Error deleting item:", error);
    alert("Kunne ikke slette varen. Prøv igjen.");
  }
};
