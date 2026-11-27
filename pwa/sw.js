/* Afterglow service worker. Built by vite.config.ts, which fills in the version and the app-shell file list per build.
 * - The app shell (index, entry script and styles, icons) is cached on install, so the app opens offline.
 * - Hashed build files (/assets/…) are cached the first time they load (the 3D chunks included).
 * - Fonts are cached across versions.
 * - Everything else (covers, PSN/Steam/TVmaze/AniList, the sync worker) always goes to the network.
 * Nightshelf lives on the same origin (mark-stessl.github.io): only caches named "afterglow-…" are touched. */
const VERSION = '__BUILD__';
const CORE = __CORE__;
const SHELL = `afterglow-${VERSION}`;
const FONTS = 'afterglow-fonts';
const BASE = new URL('./', self.location).pathname; // "/afterglow/"

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(c => c.addAll(CORE)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('afterglow-') && key !== SHELL && key !== FONTS) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

// the page asks the waiting worker to take over when you tap "Reload"
self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

async function cacheFirst(request, name) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) (await caches.open(name)).put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  const fresh = fetch(request).then(res => {
    if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
    return res;
  }).catch(() => hit);
  return hit || fresh;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // opening the app: network first, the cached shell when offline (routes live after the #)
  if (request.mode === 'navigate' && url.origin === self.location.origin && url.pathname.startsWith(BASE)) {
    event.respondWith(fetch(request).catch(async () => (await caches.match(`${BASE}index.html`)) || caches.match(BASE)));
    return;
  }
  if (url.origin === self.location.origin && url.pathname.startsWith(`${BASE}assets/`)) {
    event.respondWith(cacheFirst(request, SHELL));
    return;
  }
  if (url.origin === self.location.origin && url.pathname.startsWith(BASE)) {
    event.respondWith(staleWhileRevalidate(request, SHELL));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, FONTS));
  }
});
