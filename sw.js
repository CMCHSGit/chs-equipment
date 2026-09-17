// CHS Equipment Tracker — Service Worker
// Strategy: network-first for HTML (always gets latest), cache fallback for offline

// Bump this whenever a non-HTML cached asset (manifest.json, icons, etc.)
// changes — the cache-first branch below only refetches on a cache miss,
// so a stale entry otherwise lingers forever for already-visited devices.
const CACHE_NAME = 'chs-equipment-v3';
// Real file, not an inline data URI — manifest.json's icons were
// switched from inline base64 to real files for the same reason (see
// TODO.md): Chrome's installability checks failed to load a data URI
// icon, and a service worker fetching this normally hits the app's own
// cache-first strategy above, so there's no added network dependency.
const NOTIFICATION_ICON = '/icon-192.png';

const CACHED_URLS = ['/'];

// Install: cache the app shell immediately and skip waiting
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHED_URLS))
      .then(() => self.skipWaiting()) // Activate new SW without waiting
  );
});

// Activate: clear out any old caches from previous versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // Take control of all open tabs
  );
});

// Fetch: network-first for HTML, cache-first for everything else
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Firebase and external API calls — never intercept
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) return;

  // HTML page — network first, update cache, fall back to cache if offline.
  // cache: 'no-store' is required here — a plain fetch() is still subject to
  // normal HTTP caching, and GitHub Pages serves this file with
  // Cache-Control: max-age=600, so without this a "network-first" fetch
  // could still be silently satisfied from the browser's HTTP cache for up
  // to 10 minutes after a deploy, defeating the whole point of this branch.
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        // ignoreSearch matters here: the install step only ever pre-caches
        // the bare '/' (CACHED_URLS below), but every real entry point has
        // a query string (start_url is '/?mobile=1', deep links add
        // ?reassign=/?return=). Without it, offline-with-no-prior-visit to
        // any of those falls through to a cache MISS on an exact-URL match
        // against that bare '/' entry and fails outright, even though the
        // identical index.html would happily serve it.
        .catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
    return;
  }

  // Everything else (scripts, fonts, CDN) — cache first, network fallback
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
      )
  );
});

// Push notifications (Firebase Cloud Messaging) — a device gets here after
// opting in via the mobile app's "Enable push notifications" toggle
// (index.html's mpEnablePush()); actual sends happen server-side from
// .gas-proxy/Code.js's sendPushToPerson_(). Deliberately a plain push
// listener rather than Firebase's own background-message handler, so the
// payload shape below (notification.title/body, data.url) is one we
// control end-to-end on both the sending and receiving side.
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) {}
  const title = (payload.notification && payload.notification.title) || 'CHS Equipment Tracker';
  const body = (payload.notification && payload.notification.body) || '';
  const url = (payload.data && payload.data.url) || '/?mobile=1';
  // icon/badge matter for how Android renders this in the shade — without
  // them it falls back to a generic bell. They do NOT control whether
  // Android attributes the notification to "Chrome" vs the installed app
  // itself — that's decided (at the moment the notification is shown, not
  // baked in earlier) by whether this origin currently has a WebAPK, i.e.
  // was properly "Installed" rather than just bookmarked. See TODO.md.
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_ICON,
    data: { url }
  }));
});

// Tapping the notification focuses an already-open tab (navigating it to
// the target URL) or opens a new one — the URL is the same ?reassign=<id>
// deep link the equivalent email already uses, so it lands in the same
// place (handleReturnLink() in index.html).
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/?mobile=1';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
