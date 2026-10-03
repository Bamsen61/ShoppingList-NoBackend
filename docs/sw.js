const CACHE = 'handleliste-shell-v3';
const BASE = new URL('./', self.location.href);
const FILES = [
  'index.html', 'login.html', 'markitemtobuy.html', 'additemtodatabase.html', 'edititem.html',
  'css/style.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  ...['main', 'common', 'dates', 'version', 'firebase-init', 'offline-list', 'pwa',
    'markitemtobuy', 'additemtodatabase', 'edititem'].map(name => 'js/' + name + '.js')
];
const SDK = ['app', 'auth', 'database'].map(name => 'https://www.gstatic.com/firebasejs/9.23.0/firebase-' + name + '.js');
const ASSETS = [...FILES.map(file => new URL(file, BASE).href), ...SDK];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
// A new worker waits for existing windows to close, avoiding mixed app versions.
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('handleliste-shell-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const local = url.origin === BASE.origin && url.pathname.startsWith(BASE.pathname);
  if (request.mode === 'navigate' && local) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        // Keep HTML and modules from the same installed app version.
        if (response.ok) return await cache.match(url.href) || response;
      }
      catch { /* Offline navigation always returns the shopping list. */ }
      return cache.match(new URL('index.html', BASE).href);
    })());
    return;
  }
  if (!ASSETS.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(request) || fetch(request);
  })());
});
