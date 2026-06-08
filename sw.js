// build 2026-06-08 05h18 — network-first, force update
const CACHE = 'macros-2026-06-08-0518';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.matchAll({type:'window', includeUncontrolled:true}))
      .then(clients => clients.forEach(c => c.navigate && c.navigate(c.url)))
  );
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.url.includes('api.groq.com') || e.request.url.includes('firebasedatabase.app')) return;
  e.respondWith(
    fetch(e.request).then(r => { const c=r.clone(); caches.open(CACHE).then(x=>x.put(e.request,c)); return r; })
      .catch(() => caches.match(e.request))
  );
});
