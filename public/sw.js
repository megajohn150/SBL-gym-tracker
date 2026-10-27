/* Tracker service worker.
   The page and its assets are kept in a cache so the app opens in a
   basement with no signal. The Supabase API is never cached — stale
   training data would be worse than none. */

var V = 'tracker-v1';

var CORE = [
  './',
  './index.html',
  './manifest.json',
  './logo/icon-180.png',
  './logo/icon-192.png',
  './logo/icon-512.png',
  './imgs/muscles.jpg',
  './imgs/muscles-light.jpg',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(V).then(function (c) {
      // one missing file must not fail the whole install
      return Promise.all(CORE.map(function (u) {
        return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === V ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function cacheable(url) {
  return url.origin === self.location.origin ||
    /jsdelivr\.net$|gstatic\.com$|googleapis\.com$/.test(url.hostname);
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (/supabase\.co$/.test(url.hostname)) return;      // auth and sync always go to the network

  // the page itself: fresh when online, last good copy when not
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (r) {
        var copy = r.clone();
        caches.open(V).then(function (c) { c.put('./index.html', copy); });
        return r;
      }).catch(function () {
        return caches.match('./index.html').then(function (hit) {
          return hit || caches.match('./');
        });
      })
    );
    return;
  }

  // everything else: cache first, it barely ever changes
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (r) {
        if (r && r.ok && cacheable(url)) {
          var copy = r.clone();
          caches.open(V).then(function (c) { c.put(req, copy); });
        }
        return r;
      });
    })
  );
});
