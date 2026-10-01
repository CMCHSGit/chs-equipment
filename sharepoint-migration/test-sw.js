// Minimal throwaway service worker — Phase 1 steps 9-13 only.
// Not the real app's sw.js; just enough to prove SW registration + scope +
// push delivery work at all from a SharePoint-hosted location.

self.addEventListener('install', (event) => {
  console.log('[test-sw] install, scope =', self.registration.scope);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[test-sw] activate');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) {}
  const title = (payload.notification && payload.notification.title) || 'SharePoint test push';
  const body = (payload.notification && payload.notification.body) || 'If you can see this, FCM push delivery works from this location.';
  event.waitUntil(self.registration.showNotification(title, { body }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./test.html');
    })
  );
});
