// js/markitemtobuy.js

import { db, ref, update, onValue, waitForAuth } from "./firebase-init.js";
import {
  applySavedFontSize,
  attachLongPress,
  compareItemNames,
  navigateWithoutHistory,
  returnToMainPage
} from "./common.js";

let unsubscribeListener = null; // Store the listener to clean up later
let activeLetterButton = null;
let availableItems = [];
let showAllItemsForSession = false;

// ============================================================
// CHANGE THIS NUMBER TO ADJUST HOW MANY DAYS ARE SHOWN FIRST.
// The "Legg til" list starts by showing only items bought within
// this many days. "Vis alle" and the letter sidebar show all items.
// ============================================================
const RECENTLY_BOUGHT_DAYS_LIMIT = 50;

const FIXED_LETTER_NAV = [
  "0",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "Æ", "Ø", "Å"
];

document.addEventListener("DOMContentLoaded", async () => {
  applySavedFontSize();
  const searchInput = document.getElementById("itemSearch");

  searchInput.addEventListener("input", () => {
    showAllItemsForSession = true;
    renderAddItems(searchInput.value);
  });

  try {
    await waitForAuth();
    const itemsRef = ref(db, "handleliste");
    
    unsubscribeListener = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val() || {};
      availableItems = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .filter(item => item.Buy === false)
        .sort(compareItemNames);

      renderAddItems(searchInput.value);
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

function renderAddItems(searchTerm = "", letterToScrollTo = null) {
  const list = document.getElementById("addList");
  const letterNav = document.getElementById("letterNav");
  list.innerHTML = "";
  letterNav.innerHTML = "";

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("nb-NO");
  const itemsForCurrentView = showAllItemsForSession
    ? availableItems
    : availableItems.filter(wasBoughtRecently);

  const displayItems = itemsForCurrentView.filter((item) => {
    if (!normalizedSearch) {
      return true;
    }

    const searchableText = (item.Name || "").toLocaleLowerCase("nb-NO");
    return searchableText.includes(normalizedSearch);
  });

  const letterTargets = new Map();

  if (displayItems.length === 0) {
    const li = document.createElement("li");
    li.style.padding = "1em";
    li.style.textAlign = "center";
    li.style.color = "#666";
    li.textContent = normalizedSearch
      ? "No matching items found."
      : "No items available to add.";
    list.appendChild(li);
    renderLetterNav(letterNav, letterTargets);
    return null;
  }

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
    }

    li.appendChild(nameSpan);
    li.appendChild(shopSpan);
    attachLongPress(li, {
      onClick: () => markToBuy(item.id),
      onLongPress: () => openEditItem(item.id)
    });
    list.appendChild(li);
  });

  renderLetterNav(letterNav, letterTargets);

  if (letterToScrollTo) {
    return scrollToLetter(letterToScrollTo, letterTargets);
  }

  return null;
}

// Clean up listener when page unloads
window.addEventListener('beforeunload', () => {
  if (unsubscribeListener) {
    unsubscribeListener();
  }
});

function getItemLetter(name) {
  const firstCharacter = (name || "").trim().charAt(0);
  const normalizedCharacter = (firstCharacter || "0").toLocaleUpperCase("nb-NO");
  return FIXED_LETTER_NAV.includes(normalizedCharacter) && normalizedCharacter !== "0"
    ? normalizedCharacter
    : "0";
}

function renderLetterNav(letterNav, letterTargets) {
  activeLetterButton = null;

  FIXED_LETTER_NAV.forEach((letter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "letter-nav-button";
    button.textContent = letter;
    button.setAttribute("aria-label", `Jump to items starting with ${letter}`);
    button.addEventListener("click", () => {
      const searchInput = document.getElementById("itemSearch");
      showAllItemsForSession = true;
      searchInput.value = "";
      const activeLetter = renderAddItems("", letter) || letter;

      const selectedButton = [...letterNav.children].find((navButton) => navButton.textContent === activeLetter);
      if (selectedButton) {
        setActiveLetterButton(selectedButton);
      }
    });

    letterNav.appendChild(button);
  });
}

function setActiveLetterButton(button) {
  if (activeLetterButton) {
    activeLetterButton.classList.remove("is-active");
  }

  button.classList.add("is-active");
  activeLetterButton = button;
}

function scrollToLetter(letter, letterTargets) {
  const targetLetter = getTargetLetter(letter, letterTargets);
  const targetId = targetLetter ? letterTargets.get(targetLetter) : null;
  const targetElement = targetId ? document.getElementById(targetId) : null;

  if (targetElement) {
    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    return targetLetter;
  }

  return null;
}

function getTargetLetter(letter, letterTargets) {
  if (letterTargets.has(letter)) {
    return letter;
  }

  const currentIndex = FIXED_LETTER_NAV.indexOf(letter);

  for (let index = currentIndex + 1; index < FIXED_LETTER_NAV.length; index += 1) {
    const laterLetter = FIXED_LETTER_NAV[index];
    if (letterTargets.has(laterLetter)) {
      return laterLetter;
    }
  }

  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const previousLetter = FIXED_LETTER_NAV[index];
    if (letterTargets.has(previousLetter)) {
      return previousLetter;
    }
  }

  return null;
}

function wasBoughtRecently(item) {
  const latestBoughtDate = getLatestBoughtDate(item.BoughtDate);

  if (!latestBoughtDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoffDate = new Date(today);
  cutoffDate.setDate(today.getDate() - RECENTLY_BOUGHT_DAYS_LIMIT);

  return latestBoughtDate >= cutoffDate;
}

function getLatestBoughtDate(boughtDates) {
  if (!Array.isArray(boughtDates) || boughtDates.length === 0) {
    return null;
  }

  return boughtDates.reduce((latestDate, dateText) => {
    const date = new Date(`${dateText}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return latestDate;
    }

    if (!latestDate || date > latestDate) {
      return date;
    }

    return latestDate;
  }, null);
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

function openEditItem(itemId) {
  navigateWithoutHistory(`edititem.html?id=${encodeURIComponent(itemId)}&return=markitemtobuy.html`);
}

window.showAddItemDialog = () => {
  navigateWithoutHistory("additemtodatabase.html");
};

window.showAllItems = () => {
  const searchInput = document.getElementById("itemSearch");
  showAllItemsForSession = true;
  searchInput.value = "";
  renderAddItems("");
};

window.goToShopPage = () => {
  returnToMainPage();
};
