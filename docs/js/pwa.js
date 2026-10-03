if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Reload the main page once so its modules match the installed shell.
    if (!reloading && /\/(index\.html)?$/.test(location.pathname)) {
      reloading = true;
      location.reload();
    }
  });
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
