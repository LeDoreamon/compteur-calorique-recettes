// build 2026-11-11 00h20
const CACHE='macros-2026-11-11-0020';
// Reseau d'abord, mais pas indefiniment : sur une connexion faible, la copie
// en cache est servie au bout de DELAI_RESEAU ms. La requete continue et met
// le cache a jour pour le lancement suivant.
const DELAI_RESEAU=6000;
// Lancement hors ligne apres une mise a jour (audit du 06/11/2026) : depuis le 12/10, la page
// ne se recharge plus quand un nouveau service worker prend la main. Le nouveau cache restait
// donc vide et l'ancien etait efface : hors ligne, l'appli ne s'ouvrait plus jusqu'au lancement
// en ligne suivant. Les fichiers indispensables sont precharges a l'installation (sans bloquer
// la mise a jour si le reseau manque), et l'activation reprend de l'ancien cache ce que le
// nouveau n'a pas encore.
const BUILD=CACHE.replace('macros-','');
const ESSENTIELS=['./','./catalogue.js?v='+BUILD,'./manifest.json','./icon-192.png?v=3','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(ESSENTIELS.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))).catch(()=>{}));
});
/* adresse sans le numero de build (catalogue.js?v=AAAA-MM-JJ-HHMM) : une version n'en double pas une autre */
function _chemin(u){return String(u).replace(/\?v=\d{4}-\d\d-\d\d-\d{4}$/,'');}
async function _reprendreAnciens(){
  const neuf=await caches.open(CACHE);
  const dejaLa=new Set((await neuf.keys()).map(r=>_chemin(r.url)));   /* catalogue.js?v=ancien ne double pas catalogue.js?v=nouveau */
  for(const n of await caches.keys()){
    if(n===CACHE)continue;
    try{
      const vieux=await caches.open(n);
      for(const req of await vieux.keys()){
        const p=_chemin(req.url);if(dejaLa.has(p))continue;
        const r=await vieux.match(req);if(r){await neuf.put(req,r);dejaLa.add(p);}
      }
    }catch(_){/* cache illisible : on le supprime quand meme */}
    await caches.delete(n);
  }
}
// La page demande la version pour savoir s'il faut proposer de recharger (12/10/2026)
self.addEventListener('message',e=>{if(e.data&&e.data.type==='version'&&e.ports&&e.ports[0])e.ports[0].postMessage({version:CACHE});});
self.addEventListener('activate',e=>{e.waitUntil(_reprendreAnciens().catch(()=>{}).then(()=>self.clients.claim()));});
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
