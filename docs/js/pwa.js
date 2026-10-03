if ('serviceWorker' in navigator) {
  let checking = false;
  let registrationPromise;

  async function checkForUpdate() {
    if (navigator.onLine === false || checking) return;
    checking = true;
    try {
      registrationPromise ||= navigator.serviceWorker.register(
        new URL('../sw.js', import.meta.url), { updateViaCache: 'none' }
      );
      const registration = await registrationPromise;
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      await registration.update();
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    } catch (error) {
      registrationPromise = null;
      console.warn('App update unavailable; retaining installed version', error);
    } finally { checking = false; }
  }

  window.addEventListener('focus', checkForUpdate);
  window.addEventListener('pageshow', checkForUpdate);
  window.addEventListener('online', checkForUpdate);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate();
  });
  void checkForUpdate();
}
// Subpages offer no offline operations, including when restored from history.
function returnOfflineToList() {
  if (navigator.onLine === false && !/\/(index\.html)?$/.test(location.pathname)) location.replace('./index.html');
}
window.addEventListener('offline', returnOfflineToList);
window.addEventListener('pageshow', returnOfflineToList);
returnOfflineToList();
