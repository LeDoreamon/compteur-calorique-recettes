const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');
const W=sb.window;

console.log('\n=== FI. Ordre de priorite des images ===');
t('*** ta photo passe avant tout ***',()=>{
  W.PHOTOS={'test_r':'data:image/jpeg;base64,MIENNE'};
  W.LIENS_IMAGES={'test_r':'https://exemple/photo.jpg'};
  W._liensCasses={};
  eq(G('photoRecette')('test_r'),'data:image/jpeg;base64,MIENNE');
});
t('*** sans ta photo, le lien est utilise ***',()=>{
  W.PHOTOS={};
  W.LIENS_IMAGES={'test_r':'https://exemple/photo.jpg'};
  W._liensCasses={};
  eq(G('photoRecette')('test_r'),'https://exemple/photo.jpg');
});
t('*** un lien casse est ignore ***',()=>{
  W.PHOTOS={};
  W.LIENS_IMAGES={'test_r':'https://exemple/photo.jpg'};
  W._liensCasses={'https://exemple/photo.jpg':1};
  eq(G('photoRecette')('test_r'),null,'devrait retomber sur la vignette');
});
t('sans photo ni lien : rien, donc vignette',()=>{
  W.PHOTOS={};W.LIENS_IMAGES={};W._liensCasses={};
  eq(G('photoRecette')('test_r'),null);
});
t('ta photo prime meme si le lien est valide',()=>{
  W.PHOTOS={'test_r':'data:image/jpeg;base64,MIENNE'};
  W.LIENS_IMAGES={'test_r':'https://exemple/photo.jpg'};
  W._liensCasses={};
  eq(G('photoEstDeToi')('test_r'),true);
});
t('photoEstDeToi ne repond pas vrai pour un lien',()=>{
  W.PHOTOS={};W.LIENS_IMAGES={'test_r':'https://exemple/x.jpg'};
  eq(G('photoEstDeToi')('test_r'),false);
});

console.log('\n=== FJ. Verification des liens ===');
t('*** la verification existe et se declenche au demarrage ***',()=>{
  if(!/function verifierLiens/.test(src))throw new Error('absente');
  const i=src.indexOf('_photosChargees=true;');
  if(!/verifierLiens\(\)/.test(src.slice(i,i+180)))throw new Error('non appelee au demarrage');
});
t('elle ne tourne pas hors ligne',()=>{
  const i=src.indexOf('function verifierLiens');
  if(!/!navigator\.onLine\)return/.test(src.slice(i,i+180)))throw new Error('tourne hors ligne');
});
t('*** elle teste par un chargement reel, sans requete bloquee ***',()=>{
  const i=src.indexOf('function verifierLiens');
  const b=src.slice(i,i+1100);
  if(!/new Image\(\)/.test(b))throw new Error('pas de chargement d\'image');
  if(!/img\.onerror/.test(b))throw new Error('echec non detecte');
});
t('un lien qui ne repond pas est abandonne au bout d\'un delai',()=>{
  const i=src.indexOf('function verifierLiens');
  if(!/setTimeout\(function\(\)\{img\.onload=img\.onerror=null;marque\(true\);\},6000\)/.test(src.slice(i,i+1100)))
    throw new Error('aucun delai de garde');
});
t('un lien masque par ta photo n\'est pas teste',()=>{
  const i=src.indexOf('function verifierLiens');
  if(!/!PHOTOS\[_cleFB\(k\)\]/.test(src.slice(i,i+700)))throw new Error('teste des liens inutiles');
});
t('une nouvelle verification a lieu au retour du reseau',()=>{
  if(!/addEventListener\('online',function\(\)\{_liensVerifies=false/.test(src))
    throw new Error('pas de nouvelle verification');
});
t('l\'affichage n\'est rafraichi que si quelque chose change',()=>{
  const i=src.indexOf('function verifierLiens');
  if(!/if\(\+\+fini===restants\.length&&change\)render\(\)/.test(src.slice(i,i+1100)))
    throw new Error('rendu systematique');
});

console.log('\n=== FK. Table de liens ===');
t('*** les adresses Wikimedia sont stables ***',()=>{
  const u=G('_wm')('Porridge.jpg',400);
  if(!/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//.test(u))throw new Error(u);
  if(!/width=400/.test(u))throw new Error('largeur absente');
});
t('les noms de fichiers sont encodes',()=>{
  const u=G('_wm')('An omelette.jpg',400);
  if(/ /.test(u))throw new Error('espace non encode : '+u);
});
t('*** la table ne reference que des recettes existantes ***',()=>{
  // Les tests precedents ont remplace LIENS_IMAGES : on relit la vraie table
  const bloc=src.slice(src.indexOf('var LIENS_IMAGES={'),src.indexOf('};',src.indexOf('var LIENS_IMAGES={')));
  const ids=(bloc.match(/^\s*([a-z0-9_]+):_wm\(/gm)||[]).map(function(x){return x.trim().replace(':_wm(','');});
  if(!ids.length)throw new Error('table vide');
  ids.forEach(function(id){
    if(!(sb.RCP||[]).some(function(r){return r.id===id;}))
      throw new Error(id+' ne correspond a aucune recette');
  });
});

console.log('\n=== FL. Badge de synchro sur l\'accueil ===');
t('*** le badge figure sur la page d\'accueil ***',()=>{
  S.inv={frigo:[],placards:[],congelateur:[],epices:[]};S.dayMeals[S.today]=[];
  const h=G('renderAccueil')();
  if(!/id="sync-badge-accueil"/.test(h))throw new Error('badge absent');
});
t('*** il est place sous les macros ***',()=>{
  const h=G('renderAccueil')();
  const iMac=h.indexOf('Lipides');
  const iB=h.indexOf('sync-badge-accueil');
  if(iB<iMac)throw new Error('badge au-dessus des macros');
});
t('*** les deux badges se mettent a jour ensemble ***',()=>{
  if(!/function _majBadgesSync/.test(src))throw new Error('fonction absente');
  const i=src.indexOf('function _majBadgesSync');
  const b=src.slice(i,i+320);
  if(!/'sync-badge','sync-badge-accueil'/.test(b))throw new Error('un seul badge traite');
});
t('plus aucune mise a jour isolee ne subsiste',()=>{
  if(/getElementById\('sync-badge'\)/.test(src))
    throw new Error('un point de mise a jour ignore le badge de l\'accueil');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
