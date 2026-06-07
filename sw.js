// v4 — network-first pour forcer la mise à jour
const CACHE = 'macros-v4';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.matchAll({type:'window', includeUncontrolled:true}))
      .then(clients => clients.forEach(c => c.navigate && c.navigate(c.url)))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Toujours réseau en priorité, cache uniquement si offline
  if (e.request.url.includes('api.groq.com') ||
      e.request.url.includes('api.anthropic.com') ||
      e.request.url.includes('firebasedatabase.app')) return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
