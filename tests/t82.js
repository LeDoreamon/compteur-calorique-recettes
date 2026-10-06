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
  eq(X("TUTO.map(function(e){return e.sel}).join(' ')"),'#acc-objectif #fab-ajout #daypane #tuto-demo #tuto-demo #tuto-demo #set-overlay > div');
  eq(X("TUTO.map(function(e){return e.tab}).join(' ')"),'accueil accueil recipes inventory courses weight accueil');
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
  X('tutoSuivant()');eq(X('S.mainTab'),'inventory');X('tutoSuivant()');eq(X('S.mainTab'),'courses');X('tutoSuivant()');eq(X('S.mainTab'),'weight');
  X('tutoSuivant()');eq(X('_tutoEtape'),6);eq(X('S.mainTab'),'accueil');eq(docEl('set-overlay').style.display,'flex','reglages ouverts');
  const h=bulle();if(h.indexOf('C’est parti')<0)throw new Error('dernier bouton');if(h.indexOf('finTuto()')>=0)throw new Error('Passer a la derniere etape');
});
t('*** fin : calque ferme, reglages refermes, tutoriel marque vu et enregistre, retour a l\'accueil ***',()=>{
  X('tutoSuivant()');eq(docEl('set-overlay').style.display,'none','reglages restes ouverts');eq(docEl('tuto').style.display,'none');eq(X('S.tutoVu'),true);eq(X('_tutoEtape'),-1);if(saves<1)throw new Error('non enregistre');eq(X('S.mainTab'),'accueil');
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
t('*** « Precedent » : absent a l\'etape 1, ramene a l\'etape d\'avant (et a son onglet) ***',()=>{
  prep();X('lancerTuto()');if(bulle().indexOf('tutoPrecedent()')>=0)throw new Error('present a l\'etape 1');
  X('tutoSuivant();tutoSuivant()');eq(X('S.mainTab'),'recipes');if(bulle().indexOf('tutoPrecedent()')<0)throw new Error('absent');
  X('tutoPrecedent()');eq(X('_tutoEtape'),1);eq(X('S.mainTab'),'accueil');if(bulle().indexOf('Le bouton +')<0)throw new Error('mauvaise etape');
  X('tutoSuivant();tutoSuivant();tutoSuivant();tutoSuivant();tutoSuivant()');eq(X('_tutoEtape'),6);if(bulle().indexOf('tutoPrecedent()')<0)throw new Error('absent a la derniere');
  X('finTuto()');X('tutoPrecedent()');eq(X('_tutoEtape'),-1,'sans effet hors tutoriel');
});
t('*** exemples : liste de courses, inventaire et bilan types affiches, sans toucher aux donnees ***',()=>{
  prep();X("S.shop={list:[{id:'r1',name:'Mon vrai article',rayon:'divers',checked:false}],graveyard:[]};S.inv={frigo:[{id:'v1',name:'Mon vrai yaourt',qty:2,unit:'pots'}],congelateur:[],placards:[],epices:[]};S.weights=[{d:'2026-10-01',w:80}]");
  const avant=X('JSON.stringify([S.shop,S.inv,S.weights,S.dayMeals,S.weightGoal])');
  X('lancerTuto();tutoSuivant();tutoSuivant();tutoSuivant()');
  let d=docEl('tabpane').innerHTML;if(d.indexOf('id="tuto-demo"')<0||d.indexOf('Blancs de poulet')<0||d.indexOf('Mon vrai yaourt')>=0)throw new Error('inventaire type');
  if(bulle().indexOf('· exemple')<0)throw new Error('mention exemple');
  X('tutoSuivant()');d=docEl('tabpane').innerHTML;if(d.indexOf('Brocolis')<0||d.indexOf('Mon vrai article')>=0)throw new Error('liste type');
  X('tutoSuivant()');d=docEl('tabpane').innerHTML;if(d.indexOf('Objectif')<0)throw new Error('bilan type');
  eq(X('JSON.stringify([S.shop,S.inv,S.weights,S.dayMeals,S.weightGoal])'),avant,'donnees modifiees');
  X('tutoPrecedent()');if(docEl('tabpane').innerHTML.indexOf('Brocolis')<0)throw new Error('precedent : liste type');
  X('finTuto()');eq(X('JSON.stringify([S.shop,S.inv,S.weights,S.dayMeals,S.weightGoal])'),avant,'donnees modifiees a la fin');
  eq(X('_tutoDemoActif'),false,'exemple reste affiche');   /* le faux DOM ne recree pas #tabpane : on verifie le rendu reel par le drapeau */
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
sb.document.querySelector=vraiQS;sb.saveState=vraiSave;
console.log('---- '+pass+' ok, '+fail+' KO');})();
