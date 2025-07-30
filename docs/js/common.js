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

function goToAddPage() {
  window.location.href = "add.html";
}

export {
  db, ref, set, get, update, remove, push,
  getFromStorage, saveToStorage, setToStorage,
  updateFontSize, applySavedFontSize,
  goToAddPage
};
