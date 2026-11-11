// CHS Equipment Tracker — retired. Sends everyone to the demo tracker in the hub.
//
// Since 19 Oct 2026 the demo tracker lives at internal.chsnz.co.nz/equipment/
// (cmchs-internal-hub apps/equipment). This worker replaces the old one on
// every phone and browser that installed the old app from demo.chsnz.co.nz.
//
// Why: the old worker showed its saved copy of the old tracker first and only
// then checked the website ("stale-while-revalidate"), so the old app could
// still be opened after the switch. Since 5 Nov that copy can't save, and since
// 11 Nov it can't even load (the old database is locked): loans typed into it
// were emailed but never reached the tracker. A browser fetches this file again
// whenever the old app is opened, so this new one takes over on the next launch
// with signal and then:
//   - deletes every saved copy (no old tracker can be shown again),
//   - moves every open window of the old app to the hub, keeping the address's
//     query and hash (old links such as ?return= land on the right loan),
//   - answers every later visit by sending it straight to the hub.
// Notifications still sent to a phone registered here open the hub too.
//
// The old tracker is in git: tag old-tracker-final. Don't bring the old worker
// back: it is what kept the old copies alive.

const HUB = 'https://internal.chsnz.co.nz/equipment/';
const NOTIFICATION_ICON = '/icon-192.png';

// The hub's address for one of this site's addresses, keeping its query and hash.
function hubUrl(url) {
  try { const u = new URL(url, self.location.origin); return HUB + u.search + u.hash; }
  catch (e) { return HUB; }
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // navigate() works only on windows this worker now controls; any other is left to the forwarding page.
    await Promise.all(windows.map(w => ('navigate' in w ? w.navigate(hubUrl(w.url)) : Promise.resolve()).catch(() => {})));
  })());
});

// Every page visit goes to the hub; nothing is served from a saved copy.
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') event.respondWith(Response.redirect(hubUrl(event.request.url), 302));
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) {}
  const title = (payload.notification && payload.notification.title) || 'Demo tracker';
  const body = (payload.notification && payload.notification.body) || '';
  const url = (payload.data && payload.data.url) || HUB;
  event.waitUntil(self.registration.showNotification(title, { body, icon: NOTIFICATION_ICON, badge: NOTIFICATION_ICON, data: { url } }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || HUB;
  const url = raw.indexOf('https://internal.chsnz.co.nz/') === 0 ? raw : hubUrl(raw);
  event.waitUntil(clients.openWindow ? clients.openWindow(url) : Promise.resolve());
});
