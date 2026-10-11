/* Rent Tracker's service worker: keeps a copy of the app on the phone so it opens instantly and
   works with no signal. The saved copy is shown straight away and quietly refreshed in the
   background, so an update to the app shows the next time it's opened.
   Change VERSION whenever the files change. */
const VERSION = 'rent-tracker-2026-10-11';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './figtree-latin.woff2',
  './figtree-latin-ext.woff2',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './shortcut-log-96.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('rent-tracker-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Opening the app (with or without ?action=log) always serves the one app page.
  const key = req.mode === 'navigate' ? './index.html' : req;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const saved = await cache.match(key, { ignoreSearch: true });
    const fresh = fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') cache.put(key, res.clone());
        return res;
      })
      .catch(() => null);
    if (saved) {
      event.waitUntil(fresh);
      return saved;
    }
    const res = await fresh;
    return res || new Response('Rent Tracker is offline and this file isn’t saved yet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
