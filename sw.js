// build 2026-06-09 05h03
const CACHE='macros-2026-06-09-0503';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.map(x=>caches.delete(x)))).then(()=>self.clients.matchAll({type:'window',includeUncontrolled:true})).then(cs=>cs.forEach(c=>c.navigate&&c.navigate(c.url))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.url.includes('api.groq.com')||e.request.url.includes('firebasedatabase.app'))return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r;}).catch(()=>caches.match(e.request)));});
