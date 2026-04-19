// js/markitemtobuy.js

import { db, ref, update, onValue, waitForAuth } from "./firebase-init.js";
import { applySavedFontSize, getFromStorage } from "./common.js";

let unsubscribeListener = null; // Store the listener to clean up later
let activeLetterButton = null;

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
  const letterNav = document.getElementById("letterNav");
  list.innerHTML = "";
  letterNav.innerHTML = "";

  const displayItems = Object.entries(data)
    .map(([id, val]) => ({ id, ...val }))
    .filter(item => item.Buy === false)
    .sort((a, b) => (a.Name || "").localeCompare(b.Name || "", undefined, { sensitivity: "base" }));

  const letterTargets = new Map();
  const lettersInUse = [];

  displayItems.forEach((item, index) => {
    const li = document.createElement("li");
    li.classList.add("item-row");

    const nameSpan = document.createElement("span");
    nameSpan.classList.add("item-name");
    nameSpan.textContent = item.Name || "Unnamed item";

    const shopSpan = document.createElement("span");
    shopSpan.classList.add("item-shop");
    shopSpan.textContent = item.Shop || "No shop";

    const itemLetter = getItemLetter(item.Name);
    if (!letterTargets.has(itemLetter)) {
      li.id = `letter-target-${index}`;
      li.classList.add("letter-target");
      letterTargets.set(itemLetter, li.id);
      lettersInUse.push(itemLetter);
    }

    li.appendChild(nameSpan);
    li.appendChild(shopSpan);
    li.addEventListener("click", () => markToBuy(item.id));
    list.appendChild(li);
  });

  renderLetterNav(letterNav, lettersInUse, letterTargets);
}

// Clean up listener when page unloads
window.addEventListener('beforeunload', () => {
  if (unsubscribeListener) {
    unsubscribeListener();
  }
});

function getItemLetter(name) {
  const firstCharacter = (name || "").trim().charAt(0);
  return (firstCharacter || "#").toLocaleUpperCase("nb-NO");
}

function renderLetterNav(letterNav, lettersInUse, letterTargets) {
  activeLetterButton = null;

  lettersInUse.forEach((letter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "letter-nav-button";
    button.textContent = letter;
    button.setAttribute("aria-label", `Jump to items starting with ${letter}`);
    button.addEventListener("click", () => {
      const targetId = letterTargets.get(letter);
      const targetElement = targetId ? document.getElementById(targetId) : null;

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
        if (activeLetterButton) {
          activeLetterButton.classList.remove("is-active");
        }
        button.classList.add("is-active");
        activeLetterButton = button;
      }
    });

    letterNav.appendChild(button);
  });
}

async function markToBuy(id) {
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
