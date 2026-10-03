if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), { updateViaCache: 'none' })
    .catch(error => console.error('Service worker registration failed', error));
}
// Subpages offer no offline operations, including when restored from history.
function returnOfflineToList() {
  if (navigator.onLine === false && !/\/(index\.html)?$/.test(location.pathname)) location.replace('./index.html');
}
window.addEventListener('offline', returnOfflineToList);
window.addEventListener('pageshow', returnOfflineToList);
returnOfflineToList();
