// Only shopping-list rows and pending purchase metadata are persisted.
const KEY = 'handleliste.offline.v1';
let state;
try {
  state = JSON.parse(localStorage.getItem(KEY)) || {};
} catch { state = {}; }
state.items = Array.isArray(state.items) ? state.items : [];
state.pending = state.pending && typeof state.pending === 'object' ? state.pending : {};

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch (error) { console.error('Offline storage unavailable', error); return false; }
}
export function cachedItems() { return state.items; }
export function pendingPurchases() { return Object.entries(state.pending); }
export function isPending(id) { return Boolean(state.pending[id]); }
export function cacheItems(items) {
  const rows = items.map(({ id, Name, Shop }) => ({ id, Name, Shop }));
  for (const item of state.items) {
    if (isPending(item.id) && !rows.some(row => row.id === item.id)) rows.push(item);
  }
  state.items = rows;
  persist();
}
export function queuePurchase(id, person, date) {
  if (isPending(id)) return true;
  state.pending[id] = { person, date };
  if (persist()) return true;
  delete state.pending[id];
  return false;
}
export function acknowledgePurchase(id) {
  delete state.pending[id];
  state.items = state.items.filter(item => item.id !== id);
  persist();
}
export function clearOfflineList() {
  state = { items: [], pending: {} };
  persist();
}
