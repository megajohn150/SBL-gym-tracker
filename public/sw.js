/* Tracker service worker.
   The page and its assets are kept in a cache so the app opens in a
   basement with no signal. The Supabase API is never cached — stale
   training data would be worse than none. */

var V = 'tracker-v10';

var CORE = [
  './',
  './index.html',
  './manifest.json',
  './logo/icon-180.png',
  './logo/icon-192.png',
  './logo/icon-512.png',
  './imgs/body.svg',
  './imgs/muscles.jpg',
  './imgs/muscles-light.jpg',
  './imgs/avatars.jpg',
  './imgs/avatars-light.jpg',
  './imgs/arm.jpg',
  './imgs/arm-light.jpg',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Fraunces:opsz,wght@9..144,600;9..144,800&display=swap'
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


/* --- push: a friend reacted while the app was closed --- */
self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = {}; }
  var title = d.title || 'Tracker';
  var go = d.go ? { go: d.go, pu: d.pu, pi: d.pi, id: d.id } : null;
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: './logo/icon-192.png',
    badge: './logo/icon-192.png',
    tag: d.tag || 'tracker',
    data: { go: go, url: './' + goHash(go) }
  }));
});

// what the page reads on a cold start, when there is nobody to message yet
function goHash(go) {
  if (!go) return '';
  if (go.go === 'u') return '#go=u:' + go.id;
  return '#go=' + go.go + ':' + go.pu + ':' + go.pi;
}

// bring the app forward instead of opening a second copy of it, and tell it
// what the notification was about
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var data = e.notification.data || {};
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (!('focus' in list[i])) continue;
        if (data.go) list[i].postMessage({ type: 'tracker-go', go: data.go });
        return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(data.url || './');
    })
  );
});
