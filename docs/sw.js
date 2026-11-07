const CACHE = 'handleliste-shell-v12';
const BASE = new URL('./', self.location.href);
const FILES = [
  'index.html', 'login.html', 'markitemtobuy.html', 'additemtodatabase.html', 'edititem.html',
  'css/style.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  ...['main', 'common', 'dates', 'version', 'firebase-init', 'offline-list', 'pwa',
    'markitemtobuy', 'additemtodatabase', 'edititem'].map(name => 'js/' + name + '.js')
];
const SDK = ['app', 'auth', 'database'].map(name => 'https://www.gstatic.com/firebasejs/9.23.0/firebase-' + name + '.js');
const ASSETS = [...FILES.map(file => new URL(file, BASE).href), ...SDK];
// Bypass the HTTP cache: previous app modules must not enter the new shell cache.
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS.map(url => new Request(url, { cache: 'no-store' })));
    // Activate only after the complete app shell is ready, including offline assets.
    await self.skipWaiting();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});
// Upgrade open windows too, including v3/v4 clients without focus update checks.
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('handleliste-shell-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      const url = new URL(client.url);
      if (url.origin === BASE.origin && url.pathname.startsWith(BASE.pathname)) {
        // Do not await navigation here: its fetch waits for activation to finish.
        void client.navigate(client.url).catch(error => console.warn('App reload failed', error));
      }
    }
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
      // Serve the installed shell immediately, even when the network never responds.
      // Query parameters belong to the page, not its cached HTML resource.
      const page = new URL(url);
      page.search = '';
      if (page.pathname === BASE.pathname) page.pathname += 'index.html';
      return await cache.match(page.href) ||
        await cache.match(new URL('index.html', BASE).href) || fetch(request);
    })());
    return;
  }
  if (!ASSETS.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(request) || fetch(request);
  })());
});
