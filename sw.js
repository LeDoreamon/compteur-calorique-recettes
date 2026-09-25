// build 2026-09-25 02h42
const CACHE='macros-2026-09-25-0242';
// Reseau d'abord, mais pas indefiniment : sur une connexion faible, la copie
// en cache est servie au bout de DELAI_RESEAU ms. La requete continue et met
// le cache a jour pour le lancement suivant.
const DELAI_RESEAU=6000;
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
function _cachable(r){return !!r&&(r.ok||r.type==='opaque');}   // opaque : image d'un autre site, statut illisible
function reseauOuCache(req){
  return new Promise(resolve=>{
    let fini=false;
    const servir=r=>{if(fini||!r)return false;fini=true;resolve(r);return true;};
    const minuterie=setTimeout(()=>{caches.match(req).then(servir).catch(()=>{});},DELAI_RESEAU);
    fetch(req).then(r=>{
      if(_cachable(r)){const c=r.clone();caches.open(CACHE).then(x=>x.put(req,c)).catch(()=>{});}
      if(_cachable(r)){clearTimeout(minuterie);servir(r);return;}
      // Erreur serveur (404, 500…) : la copie en cache vaut mieux qu'une page d'erreur
      caches.match(req).then(c=>{clearTimeout(minuterie);servir(c||r);}).catch(()=>servir(r));
    }).catch(()=>{
      caches.match(req).then(c=>{clearTimeout(minuterie);if(!servir(c))servir(Response.error());})
        .catch(()=>servir(Response.error()));
    });
  });
}
self.addEventListener('fetch',e=>{
  const u=e.request.url;
  if(e.request.method!=='GET')return;
  if(u.includes('api.groq.com')||u.includes('firebasedatabase.app')||u.includes('openfoodfacts.org')||u.includes('googleapis.com'))return;
  e.respondWith(reseauOuCache(e.request));
});
