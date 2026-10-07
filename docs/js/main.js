import { APP_VERSION } from './version.js';
import { getOsloDate } from './dates.js';
import { db, ref, update, get, onValue, goOffline, goOnline, waitForAuth, signOutUser } from './firebase-init.js';
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
let recoveryTimeout;
let recoveryDelay = 5000;
let listReady = false;
let accessDenied = false;
let settingUp = false;

function onlineReady() {
  return connected && listReady && !syncing && !suspended && !accessDenied && pendingPurchases().length === 0;
}

function cancelRecovery() {
  clearTimeout(recoveryTimeout);
  recoveryTimeout = null;
}

function scheduleRecovery() {
  if (recoveryTimeout || suspended || accessDenied || navigator.onLine === false ||
      document.visibilityState === 'hidden') return;
  recoveryTimeout = window.setTimeout(() => {
    recoveryTimeout = null;
    recoveryDelay = Math.min(recoveryDelay * 2, 30000);
    void setupRealtimeListener(true);
  }, recoveryDelay);
}

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
  reconnectTimeout = window.setTimeout(() => {
    finishConnectionAttempt(false);
    scheduleRecovery();
  }, 5000);
  void setupRealtimeListener(true);
}

function renderItemList() {
  const ready = onlineReady();
  if (ready) {
    cancelRecovery();
    recoveryDelay = 5000;
    document.getElementById('addButton').classList.remove('connection-failed');
    finishConnectionAttempt(true);
  }
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
        if (onlineReady() && !isPending(item.id)) {
          window.location.href = 'edititem.html?id=' + encodeURIComponent(item.id) + '&return=index.html';
        } else if (!onlineReady()) markItemAsBought(item.id);
      }
    });
    list.appendChild(row);
  }
  document.getElementById('addButton').textContent = ready ? 'Legg til' : 'Koble til internett';
  document.getElementById('personSelector').disabled = !ready;
  document.getElementById('fontSize').disabled = !ready;
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
  if (!connected || !listReady || syncing || suspended || accessDenied) return;
  if (!pendingPurchases().length) return;
  syncing = true;
  renderItemList();
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
  if (error.message === 'Not authenticated' ||
      String(error.code || '').toLowerCase().replaceAll('_', '-') === 'permission-denied') accessDenied = true;
  if (accessDenied) { clearOfflineList(); cancelRecovery(); }
  connected = false;
  listReady = false;
  renderItemList();
  scheduleRecovery();
}

function cleanupRealtimeListener() {
  generation++;
  unsubscribeMainListener?.();
  unsubscribeConnection?.();
  unsubscribeMainListener = unsubscribeConnection = null;
}

async function setupRealtimeListener(restart = false) {
  if (settingUp || suspended || navigator.onLine === false) return;
  settingUp = true;
  cancelRecovery();
  cleanupRealtimeListener();
  connected = false;
  listReady = false;
  const currentGeneration = generation;
  const current = () => currentGeneration === generation && !suspended && navigator.onLine !== false;
  const onError = error => { if (current()) handleError(error); };
  renderItemList();
  try {
    await waitForAuth();
    if (!current()) return;
    accessDenied = false;
    // Replacing listeners alone reuses the same possibly stalled SDK connection.
    // The SDK retains queued writes during this transport restart.
    if (restart) { goOffline(db); goOnline(db); }
    unsubscribeMainListener = onValue(ref(db, 'handleliste'), snapshot => {
      if (!current()) return;
      const items = Object.entries(snapshot.val() || {}).map(([id, item]) => ({ id, ...item }));
      cacheItems(items.filter(item => item.Buy === true));
      listReady = true;
      void syncPurchases();
      renderItemList();
    }, onError);
    unsubscribeConnection = onValue(ref(db, '.info/connected'), snapshot => {
      if (!current()) return;
      connected = snapshot.val() === true;
      if (connected) void syncPurchases();
      else scheduleRecovery();
      renderItemList();
    }, onError);
  } catch (error) { onError(error); }
  finally {
    settingUp = false;
    if (!onlineReady()) scheduleRecovery();
  }
}

function recoverOnForeground() {
  if (!suspended && !accessDenied && !reconnecting && !onlineReady() && document.visibilityState !== 'hidden') {
    void setupRealtimeListener(true);
  }
}
window.addEventListener('offline', () => {
  cleanupRealtimeListener();
  cancelRecovery();
  connected = listReady = false;
  finishConnectionAttempt(false);
  renderItemList();
});
window.addEventListener('online', () => { void setupRealtimeListener(true); });
window.addEventListener('focus', recoverOnForeground);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') cancelRecovery();
  else recoverOnForeground();
});
window.addEventListener('pagehide', () => {
  suspended = true;
  connected = listReady = false;
  cancelRecovery();
  finishConnectionAttempt(true);
  cleanupRealtimeListener();
});
window.addEventListener('pageshow', event => {
  if (event.persisted) { suspended = false; renderItemList(); void setupRealtimeListener(true); }
  else recoverOnForeground();
});
window.addEventListener('DOMContentLoaded', () => {
  applySavedFontSize();
  document.getElementById('appVersion').textContent = 'v' + APP_VERSION;
  document.getElementById('personSelector').value = getFromStorage('person', 'Morten');
  document.getElementById('addButton').addEventListener('click', () => {
    if (onlineReady()) window.location.href = 'markitemtobuy.html';
    else retryConnection();
  });
  document.getElementById('addButton').addEventListener('animationend', () => {
    document.getElementById('addButton').classList.remove('connection-failed');
  });
  renderItemList();
  void setupRealtimeListener();
});
window.updatePerson = () => { if (onlineReady()) saveToStorage('person', document.getElementById('personSelector').value); };
window.updateFontSize = () => { if (onlineReady()) updateFontSize(); };
window.logout = () => { if (confirm('Are you sure you want to sign out?')) signOutUser(); };
