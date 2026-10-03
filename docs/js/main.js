import { APP_VERSION } from './version.js';
import { getOsloDate } from './dates.js';
import { db, ref, update, get, onValue, waitForAuth, signOutUser } from './firebase-init.js';
import { getFromStorage, applySavedFontSize, saveToStorage, updateFontSize,
  attachLongPress, compareItemsByShopThenName } from './common.js';
import { cachedItems, cacheItems, queuePurchase, pendingPurchases,
  isPending, acknowledgePurchase, clearOfflineList } from './offline-list.js';

let connected = false;
let syncing = false;
let suspended = false;
let unsubscribeMainListener;
let unsubscribeConnection;
let generation = 0;
let reconnecting = false;
let reconnectTimeout;

function finishConnectionAttempt(success) {
  if (!reconnecting) return;
  reconnecting = false;
  clearTimeout(reconnectTimeout);
  const button = document.getElementById('addButton');
  button.disabled = false;
  button.classList.remove('connection-failed');
  if (!success) {
    void button.offsetWidth;
    button.classList.add('connection-failed');
  }
}

function retryConnection() {
  if (reconnecting) return;
  reconnecting = true;
  const button = document.getElementById('addButton');
  button.classList.remove('connection-failed');
  button.disabled = true;
  if (navigator.onLine === false) {
    void setupRealtimeListener();
    finishConnectionAttempt(false);
    return;
  }
  reconnectTimeout = window.setTimeout(() => finishConnectionAttempt(false), 5000);
  void setupRealtimeListener();
}

function renderItemList() {
  const list = document.getElementById('itemList');
  list.innerHTML = '';
  const items = [...cachedItems()].sort(compareItemsByShopThenName);
  if (!items.length) {
    const row = document.createElement('li');
    row.textContent = connected ? 'Ingen varer på handlelisten.' : 'Ingen handleliste lagret. Koble til internett først.';
    list.appendChild(row);
  }
  for (const item of items) {
    const row = document.createElement('li');
    row.classList.add('item-row');
    if (isPending(item.id)) row.classList.add('is-bought-offline');
    for (const [field, className] of [['Name', 'item-name'], ['Shop', 'item-shop']]) {
      const span = document.createElement('span');
      span.classList.add(className);
      span.textContent = item[field] || '';
      row.appendChild(span);
    }
    attachLongPress(row, {
      onClick: () => markItemAsBought(item.id),
      onLongPress: () => {
        if (connected && !syncing && !isPending(item.id)) {
          window.location.href = 'edititem.html?id=' + encodeURIComponent(item.id) + '&return=index.html';
        } else if (!connected) markItemAsBought(item.id);
      }
    });
    list.appendChild(row);
  }
  document.getElementById('addButton').textContent = connected ? 'Legg til' : 'Koble til internett';
  document.getElementById('personSelector').disabled = !connected;
  document.getElementById('fontSize').disabled = !connected;
}

async function markItemAsBought(id) {
  if (isPending(id)) return;
  // Online clicks still require authorized auth before a purchase is queued.
  if (connected) {
    try { await waitForAuth(); }
    catch (error) { handleError(error); return; }
  }
  if (!queuePurchase(id, getFromStorage('person', 'Morten'), getOsloDate())) {
    alert('Kunne ikke lagre kjøpet lokalt. Prøv igjen når lokal lagring er tilgjengelig.');
    return;
  }
  renderItemList();
  await syncPurchases();
}

async function syncPurchases() {
  if (!connected || syncing || suspended) return;
  syncing = true;
  try {
    await waitForAuth();
    while (pendingPurchases().length) {
      const [id, purchase] = pendingPurchases()[0];
      if (!connected || suspended) break;
      const itemRef = ref(db, 'handleliste/' + id);
      const snapshot = await get(itemRef);
      if (!connected || suspended) break;
      if (snapshot.exists() && snapshot.val().Buy === true) {
        const item = snapshot.val();
        await update(itemRef, {
          Buy: false,
          BoughtBy: purchase.person,
          BoughtDate: [purchase.date, ...(item.BoughtDate || [])].slice(0, 10),
          BuyNumber: (item.BuyNumber || 0) + 1
        });
      }
      // Buy=false also acknowledges a write whose response was lost.
      acknowledgePurchase(id);
    }
  } catch (error) { handleError(error); }
  finally { syncing = false; renderItemList(); }
}

function handleError(error) {
  console.error('Handleliste:', error);
  finishConnectionAttempt(false);
  if (error.message === 'Not authenticated' || error.code === 'permission-denied') clearOfflineList();
  connected = false;
  renderItemList();
}

function cleanupRealtimeListener() {
  generation++;
  unsubscribeMainListener?.();
  unsubscribeConnection?.();
  unsubscribeMainListener = unsubscribeConnection = null;
}

async function setupRealtimeListener() {
  cleanupRealtimeListener();
  const currentGeneration = generation;
  if (navigator.onLine === false || suspended) return;
  try {
    await waitForAuth();
    if (currentGeneration !== generation || navigator.onLine === false || suspended) return;
    unsubscribeMainListener = onValue(ref(db, 'handleliste'), snapshot => {
      const items = Object.entries(snapshot.val() || {}).map(([id, item]) => ({ id, ...item }));
      cacheItems(items.filter(item => item.Buy === true));
      renderItemList();
    }, handleError);
    unsubscribeConnection = onValue(ref(db, '.info/connected'), snapshot => {
      connected = snapshot.val() === true && navigator.onLine !== false;
      renderItemList();
      if (connected) {
        document.getElementById('addButton').classList.remove('connection-failed');
        finishConnectionAttempt(true);
        void syncPurchases();
      }
    });
  } catch (error) { handleError(error); }
}

window.addEventListener('offline', () => { connected = false; renderItemList(); });
window.addEventListener('online', () => { void setupRealtimeListener(); });
window.addEventListener('pagehide', () => { suspended = true; finishConnectionAttempt(true); cleanupRealtimeListener(); });
window.addEventListener('pageshow', event => {
  if (event.persisted) { suspended = false; connected = false; renderItemList(); void setupRealtimeListener(); }
});
window.addEventListener('DOMContentLoaded', () => {
  applySavedFontSize();
  document.getElementById('appVersion').textContent = 'v' + APP_VERSION;
  document.getElementById('personSelector').value = getFromStorage('person', 'Morten');
  document.getElementById('addButton').addEventListener('click', () => {
    if (connected && !syncing) window.location.href = 'markitemtobuy.html';
    else if (!connected) retryConnection();
  });
  document.getElementById('addButton').addEventListener('animationend', () => {
    document.getElementById('addButton').classList.remove('connection-failed');
  });
  renderItemList();
  void setupRealtimeListener();
});
window.updatePerson = () => { if (connected) saveToStorage('person', document.getElementById('personSelector').value); };
window.updateFontSize = () => { if (connected) updateFontSize(); };
window.logout = () => { if (confirm('Are you sure you want to sign out?')) signOutUser(); };
