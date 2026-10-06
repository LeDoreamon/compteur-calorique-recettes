const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=require('fs').readFileSync('index.html','utf8');
const vraiQS=sb.document.querySelector;
let absents=[];
sb.document.querySelector=s=>(s[0]==='#'&&absents.indexOf(s)<0)?docEl(s.slice(1)):null;
let saves=0;const vraiSave=X('saveState');X("saveState=function(){}");sb.saveState=()=>{saves++;};
function prep(){X("S.mainTab='accueil';S.tutoVu=false;_tutoEtape=-1");saves=0;absents=[];}
const bulle=()=>docEl('tuto').innerHTML;
console.log('\n=== XLV. Tutoriel de premier compte ===');
t('*** sept etapes : objectif, +, journee, inventaire, courses, bilan, reglages ***',()=>{
  eq(X('TUTO.length'),7);
  eq(X("TUTO.map(function(e){return e.sel}).join(' ')"),'#acc-objectif #fab-ajout #daypane #bnav-b-inventory #bnav-b-courses #bnav-b-weight #btn-reglages');
  ['id="acc-objectif"','<button id="btn-reglages"','<div id="tuto"','<button id="fab-ajout"'].forEach(s=>{if(src.indexOf(s)<0)throw new Error('cible absente : '+s);});
  if(src.indexOf("id=\"daypane\"")<0||src.indexOf("'<button id=\"bnav-b-'+t[0]")<0)throw new Error('cibles journee / barre');
});
t('*** lancement : etape 1 affichee, bulle avec compteur, Passer et Suivant ***',()=>{
  prep();X('lancerTuto()');
  eq(docEl('tuto').style.display,'block');
  const h=bulle();if(h.indexOf('1 / 7')<0||h.indexOf('Ton objectif du jour')<0)throw new Error('etape 1');
  if(h.indexOf('finTuto()')<0||h.indexOf('tutoSuivant()')<0)throw new Error('boutons');
  if(h.indexOf('tuto-trou')<0)throw new Error('mise en lumiere');
});
t('*** chaque etape ouvre le bon onglet ; la derniere dit « C\'est parti » sans « Passer » ***',()=>{
  prep();X('lancerTuto()');X('tutoSuivant()');eq(X('S.mainTab'),'accueil');
  X('tutoSuivant()');eq(X('S.mainTab'),'recipes','journee dans Repas');if(bulle().indexOf('Ta journée')<0)throw new Error('etape 3');
  X('tutoSuivant();tutoSuivant();tutoSuivant();tutoSuivant()');eq(X('_tutoEtape'),6);eq(X('S.mainTab'),'accueil');
  const h=bulle();if(h.indexOf('C’est parti')<0)throw new Error('dernier bouton');if(h.indexOf('finTuto()')>=0)throw new Error('Passer a la derniere etape');
});
t('*** fin : calque ferme, tutoriel marque vu et enregistre, retour a l\'accueil ***',()=>{
  X('tutoSuivant()');eq(docEl('tuto').style.display,'none');eq(X('S.tutoVu'),true);eq(X('_tutoEtape'),-1);if(saves<1)throw new Error('non enregistre');eq(X('S.mainTab'),'accueil');
});
t('*** « Passer » arrete tout des la premiere etape ***',()=>{prep();X('lancerTuto()');X('finTuto()');eq(docEl('tuto').style.display,'none');eq(X('S.tutoVu'),true);if(saves<1)throw new Error('non enregistre');});
t('element introuvable : etape sautee',()=>{prep();absents=['#acc-objectif'];X('lancerTuto()');eq(X('_tutoEtape'),1);if(bulle().indexOf('Le bouton +')<0)throw new Error('pas saute');X('finTuto()');});
t('*** lance automatiquement pour un compte neuf seulement ***',()=>{
  prep();const st=sb.setTimeout;sb.setTimeout=f=>{f();return 1;};try{X('_tutoSiNouveau()');}finally{sb.setTimeout=st;}eq(X('_tutoEtape'),0,'compte neuf');X('finTuto()');
  X("_tutoEtape=-1;S.tutoVu=true");sb.setTimeout=f=>{f();return 1;};try{X('_tutoSiNouveau()');}finally{sb.setTimeout=st;}eq(X('_tutoEtape'),-1,'deja vu');
});
t('*** etat : un ancien compte (sans champ) est considere comme ayant vu le tutoriel ; false conserve ***',()=>{
  const ap=X('_applyState');const base={_profile:X('ACTIVE_PROFILE'),rev:1,inv:{frigo:[],congelateur:[],placards:[],epices:[]},dayMeals:{}};
  ap(Object.assign({},base));eq(X('S.tutoVu'),true);
  ap(Object.assign({},base,{tutoVu:false}));eq(X('S.tutoVu'),false);
  if(!/tutoVu:S\.tutoVu!==false/.test(src))throw new Error('non sauvegarde');
});
t('*** inscription : le nouvel etat porte tutoVu=false ***',async()=>{
  let corps=null;const vf=sb.fetch;sb.fetch=async(u,o)=>{if(o&&o.method==='PUT'&&/state/.test(u))corps=JSON.parse(o.body);return {ok:true,status:200,json:async()=>({id_token:'t',expires_in:'3600'})};};
  try{await X('_initNouveauProfil')('users/NEW',{prenom:'Camille',poids:72,poidsVise:65,pas:7000});}finally{sb.fetch=vf;}
  eq(corps&&corps.tutoVu,false);
});
t('*** relance depuis les Reglages ***',()=>{if(src.indexOf('onclick="closeSettings();lancerTuto()"')<0||src.indexOf('Revoir le tutoriel')<0)throw new Error('bouton absent');});
t('le calque passe au-dessus du bouton + et des fenetres',()=>{if(!/#tuto \{ display: none; position: fixed; inset: 0; z-index: 400; \}/.test(src))throw new Error('z-index');});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
sb.document.querySelector=vraiQS;sb.saveState=vraiSave;
console.log('---- '+pass+' ok, '+fail+' KO');})();
