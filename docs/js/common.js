// js/common.js

import { db, ref, set, get, update, remove, push, waitForAuth } from "./firebase-init.js";

function getFromStorage(key, defaultValue) {
  return localStorage.getItem(key) || defaultValue;
}

function saveToStorage(key, value) {
  localStorage.setItem(key, value);
}

function setToStorage(key, value) {
  localStorage.setItem(key, value);
}

function updateFontSize() {
  const size = document.getElementById("fontSize").value;
  document.body.setAttribute("data-font-size", size);
  setToStorage("fontSize", size);
}

function applySavedFontSize() {
  const saved = getFromStorage("fontSize", "16");
  document.body.setAttribute("data-font-size", saved);
  const selector = document.getElementById("fontSize");
  if (selector) selector.value = saved;
}

function compareItemNames(a, b) {
  const keyA = getItemSortKey(a.Name);
  const keyB = getItemSortKey(b.Name);

  return compareSortKeys(keyA, keyB);
}

function compareItemsByShopThenName(a, b) {
  const shopComparison = compareSortKeys(getItemSortKey(a.Shop), getItemSortKey(b.Shop));

  if (shopComparison !== 0) {
    return shopComparison;
  }

  return compareItemNames(a, b);
}

function compareSortKeys(keyA, keyB) {
  if (keyA < keyB) {
    return -1;
  }

  if (keyA > keyB) {
    return 1;
  }

  return 0;
}

function getItemSortKey(name) {
  return (name || "")
    .toLocaleUpperCase("nb-NO")
    .replaceAll("Æ", "\uE000")
    .replaceAll("Ø", "\uE001")
    .replaceAll("Å", "\uE002");
}

function navigateWithoutHistory(url) {
  window.location.replace(url);
}

function returnToMainPage() {
  if (document.referrer) {
    const referrerUrl = new URL(document.referrer);

    if (referrerUrl.origin === window.location.origin && window.history.length > 1) {
      window.history.back();
      return;
    }
  }

  navigateWithoutHistory("index.html");
}

function attachLongPress(element, { onClick, onLongPress, delay = 700, moveTolerance = 12 }) {
  let pressTimer = null;
  let startX = 0;
  let startY = 0;
  let longPressTriggered = false;
  let pressCanceled = false;

  function clearPressTimer() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    element.classList.remove("is-pressing");
  }

  element.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    startX = event.clientX;
    startY = event.clientY;
    longPressTriggered = false;
    pressCanceled = false;
    element.classList.add("is-pressing");

    pressTimer = window.setTimeout(() => {
      longPressTriggered = true;
      clearPressTimer();
      onLongPress(event);
    }, delay);
  });

  element.addEventListener("pointermove", (event) => {
    const movedX = Math.abs(event.clientX - startX);
    const movedY = Math.abs(event.clientY - startY);

    if (movedX > moveTolerance || movedY > moveTolerance) {
      pressCanceled = true;
      clearPressTimer();
    }
  });

  element.addEventListener("pointerup", (event) => {
    clearPressTimer();

    if (pressCanceled) {
      return;
    }

    if (longPressTriggered) {
      event.preventDefault();
      return;
    }

    onClick(event);
  });

  element.addEventListener("pointercancel", clearPressTimer);
  element.addEventListener("pointerleave", clearPressTimer);
  element.addEventListener("contextmenu", (event) => {
    if (longPressTriggered) {
      event.preventDefault();
    }
  });
}

export {
  db, ref, set, get, update, remove, push,
  getFromStorage, saveToStorage, setToStorage,
  updateFontSize, applySavedFontSize, attachLongPress,
  compareItemNames, compareItemsByShopThenName,
  navigateWithoutHistory, returnToMainPage
};
