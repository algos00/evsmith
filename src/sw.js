/* EVSmith service worker (only used when the page is served over http/https, e.g. GitHub Pages).
   - the page itself: network first, so a new release shows up as soon as you are online; cached copy when offline
   - Pokémon pictures and fonts: kept after the first view, so they load instantly (and offline) next time */
const V = 'evsmith-{{version}}', SHELL = V + '-shell', IMG = 'evsmith-img-v1', FONT = 'evsmith-font-v1', MAX_IMG = 450;
const KEEP = [SHELL, IMG, FONT];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'])).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('evsmith-') && !KEEP.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}
async function cacheFirst(req, name, max) {
  const cache = await caches.open(name), hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) { cache.put(req, res.clone()).then(() => max && trim(cache, max)); }
  return res;
}
async function staleWhileRevalidate(req, name) {
  const cache = await caches.open(name), hit = await cache.match(req);
  const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || net;
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (req.mode === 'navigate' && u.origin === self.location.origin) {
    e.respondWith(fetch(req).then(res => { if (res.ok) { const a = res.clone(), b = res.clone(); caches.open(SHELL).then(c => { c.put(req, a); c.put('./', b); }); } return res; }).catch(() => caches.match(req).then(r => r || caches.match('./')).then(r => r || Response.error())));
  } else if (u.hostname === 'raw.githubusercontent.com' && req.destination === 'image') {
    e.respondWith(cacheFirst(req, IMG, MAX_IMG).catch(() => Response.error()));
  } else if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(req, FONT));
  } else if (u.origin === self.location.origin) {
    e.respondWith(staleWhileRevalidate(req, SHELL));
  }
});
