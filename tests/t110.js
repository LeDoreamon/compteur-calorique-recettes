// Audit du 06/11/2026 : lancement hors ligne apres une mise a jour, saisies neutralisees, dates limites en UTC
process.env.TZ='Europe/Paris';   /* l'ecart d'un jour au passage a l'heure d'ete ne se voit qu'a l'heure de Paris (la CI tourne en UTC) */
const {sb,docEl}=require('./sb.js');
const vm=require('vm');
const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const S=sb.S;
const swSrc=fs.readFileSync('sw.js','utf8');
const BASE='https://h.io/compteur-calorique-recettes/';

/* service worker dans un bac a sable : caches et reseau simules */
function monteSW(reseau){
  const ecouteurs={},magasin=new Map();
  const boite=nom=>{if(!magasin.has(nom))magasin.set(nom,new Map());const m=magasin.get(nom);
    return {add:async req=>{const r=await ctx.fetch(req);if(!r||!r.ok)throw new Error('add '+req.url);m.set(req.url,r);},
      put:async(req,r)=>{m.set(req.url||req,r);},match:async req=>m.get(req.url||req),keys:async()=>[...m.keys()].map(url=>({url}))};};
  class Request{constructor(u,o){this.url=new URL(u,BASE+'sw.js').href;this.cache=o&&o.cache;}}
  const ctx={self:{addEventListener:(t,f)=>{ecouteurs[t]=f;},skipWaiting(){},clients:{claim:async()=>{ctx.reclame=true;}}},
    caches:{open:async n=>boite(n),keys:async()=>[...magasin.keys()],delete:async n=>magasin.delete(n),match:async req=>{for(const m of magasin.values())if(m.has(req.url))return m.get(req.url);}},
    fetch:async req=>reseau(req.url||req),Request,URL,Set,Promise,setTimeout,clearTimeout,Response:{error:()=>({type:'error'})}};
  vm.createContext(ctx);vm.runInContext(swSrc,ctx);
  const evenement=async(type)=>{let p=null;ecouteurs[type]({waitUntil:x=>{p=x;}});await p;};
  return {ctx,magasin,evenement,cache:nom=>magasin.get(nom)};
}
const ok=url=>({ok:true,status:200,type:'basic',url,clone(){return this;}});
const BUILD=(swSrc.match(/const CACHE='macros-([0-9-]+)'/)||[])[1];

console.log('\n=== LXXXIII. Audit du 06/11/2026 ===');
t('*** installation : les fichiers indispensables sont precharges, catalogue de ce build compris ***',async()=>{
  const w=monteSW(url=>ok(url));await w.evenement('install');
  const c=w.cache('macros-'+BUILD);if(!c)throw new Error('cache absent');
  [BASE,BASE+'catalogue.js?v='+BUILD,BASE+'manifest.json',BASE+'icon-192.png?v=3'].forEach(u=>{if(!c.has(u))throw new Error('manque '+u+' : '+[...c.keys()].join(' '));});
});
t('installation sans reseau : la mise a jour n\'est pas bloquee',async()=>{
  const w=monteSW(()=>{throw new Error('hors ligne');});await w.evenement('install');   /* ne doit pas lever */
});
t('*** activation : ce que le nouveau cache n\'a pas est repris de l\'ancien, puis l\'ancien est efface ***',async()=>{
  const w=monteSW(()=>{throw new Error('hors ligne');});
  const vieux=await w.ctx.caches.open('macros-2020-01-01-0000');
  for(const u of [BASE,BASE+'catalogue.js?v=2020-01-01-0000',BASE+'icon-192.png?v=3',BASE+'icon-192.png'])await vieux.put({url:u},ok(u));
  await w.evenement('install');await w.evenement('activate');
  eq([...w.magasin.keys()].join(','),'macros-'+BUILD,'un seul cache');
  const c=w.cache('macros-'+BUILD);
  [BASE,BASE+'catalogue.js?v=2020-01-01-0000',BASE+'icon-192.png?v=3',BASE+'icon-192.png'].forEach(u=>{if(!c.has(u))throw new Error('perdu : '+u);});
  eq(w.ctx.reclame,true,'clients.claim');
});
t('*** activation apres prechargement : la nouvelle version gagne, pas d\'ancien catalogue en double ***',async()=>{
  const w=monteSW(url=>Object.assign(ok(url),{neuf:true}));
  const vieux=await w.ctx.caches.open('macros-2020-01-01-0000');
  for(const u of [BASE,BASE+'catalogue.js?v=2020-01-01-0000',BASE+'zxing.min.js'])await vieux.put({url:u},ok(u));
  await w.evenement('install');await w.evenement('activate');
  const c=w.cache('macros-'+BUILD);
  eq(c.get(BASE).neuf,true,'page neuve');if(c.has(BASE+'catalogue.js?v=2020-01-01-0000'))throw new Error('ancien catalogue garde');
  if(!c.has(BASE+'zxing.min.js'))throw new Error('fichier absent du prechargement perdu');
});
t('la page charge le catalogue avec le meme numero que celui du service worker',()=>{
  const h=fs.readFileSync('index.html','utf8');if(h.indexOf('catalogue.js?v='+BUILD+'"')<0)throw new Error('numeros differents');
});

const P='Riz <b>gras</b> "x"',NEUTRE='Riz ‹b›gras‹/b› ”x”';
t('*** nom de repas tape a la main : neutralise des l\'enregistrement ***',()=>{
  X("TARGETS={kcal:2310,prot:175,gluc:208,lip:80};S.inv={frigo:[],placards:[],congelateur:[],epices:[]};S.dayMeals={};S.displayDate=S.today;");
  X("openAddMeal('text')");docEl('addmeal-name').value=P;docEl('addmeal-kcal').value='300';X('_addMealInvMode=false;_addMealFreeItems=[];confirmAddMealFinal()');
  eq(S.dayMeals[X('S.today')][0].name,NEUTRE);if(X('renderMacros()').indexOf('<b>gras')>=0)throw new Error('balise interpretee');
  X('openEditMeal(S.today,0)');docEl('em-name').value=P+' 2';X('saveEditMeal()');eq(S.dayMeals[X('S.today')][0].name,NEUTRE+' 2','modification');
});
t('*** courses, article d\'inventaire, recette perso : neutralises aussi ***',()=>{
  X("S.shop={list:[],graveyard:[]}");docEl('shop-add-name').value=P;docEl('shop-add-rayon').value='';X('addShopItem()');eq(S.shop.list[0].name,NEUTRE,'courses');
  const src=fs.readFileSync('index.html','utf8');
  [/const n=_saisie\('ai-name'\);if\(!n\)\{_alerte/,/var name=_saisie\('burn-act-name'\);/,/it\.name=_saisie\(nmEl\);/,/var name=_saisie\('cr-name'\);/,
   /map\(function\(s\)\{return _neutre\(s\.trim\(\)\);\}\)/,/var _nv=_ne\?_saisie\(_ne\):'';/].forEach(re=>{if(!re.test(src))throw new Error('non neutralise : '+re);});
  eq((src.match(/document\.getElementById\('(addmeal-name|em-name|cr-name|ai-name|burn-act-name)'\)\.value\.trim\(\)/g)||[]).length,0,'saisie brute restante');
});
t('une apostrophe reste une apostrophe (« Huile d\'olive »)',()=>{
  docEl('shop-add-name').value="Huile d'olive";X('addShopItem()');eq(S.shop.list[S.shop.list.length-1].name,"Huile d'olive");
});
t('*** date limite +14 j (œufs, yaourts) : bon jour quel que soit le changement d\'heure ***',()=>{
  eq(X("effDlc({id:'oeufs',name:'Oeufs',dlc:'2026-10-20'})"),'2026-11-03','passage a l\'heure d\'hiver');
  eq(X("effDlc({id:'oeufs',name:'Oeufs',dlc:'2026-03-20'})"),'2026-04-03','passage a l\'heure d\'ete');
  eq(X("effDlc({id:'oeufs',name:'Oeufs',dlc:'pas une date'})"),'pas une date','date illisible rendue telle quelle');
  eq(X("dlcAnomalie({id:'creme',name:'Crème fraîche',dlc:'2026-03-27'})"),'2026-04-01','tolerance de 5 jours');
});
t('manifeste : description a jour',()=>{
  const m=JSON.parse(fs.readFileSync('manifest.json','utf8'));if(/Maureen/.test(m.description))throw new Error(m.description);
});

(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' -> '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
