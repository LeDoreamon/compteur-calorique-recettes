const {sb,docEl}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
function repas(k){return "[{id:'m',name:'R',kcal:"+k+",prot:150,gluc:200,lip:60,moment:'dejeuner'}]";}
function prepa(){X(`_loaded=true;S.today='2026-10-03';S.displayDate=S.today;S.weights=[];S.dayMeals={};_burnData={};S.profil=Object.assign({},S.profil||{},{objectif:'perte'});
  S.waiting=[];S.pasRacheter={};S.coursesVoirAchetes=false;S.inv={frigo:[],congelateur:[],placards:[],epices:[]};S.openCat={};
  S.shop={list:[{id:'a',name:'Lait',rayon:'laitiers',checked:false}],graveyard:[],graveRayons:[]};`);}

console.log('\n=== XXIII. Audit ergonomie (03/10) ===');
t('*** Bilan : point du coach sans « Moy. 7 j » (dans le pilotage), avec le reste du jour ***',()=>{
  prepa();X("S.dayMeals[S.today]="+repas(800)+";S.dayMeals[shiftDate(S.today,-1)]="+repas(2000)+";");
  const h=X('renderCoachSummary()');
  if(/Moy\. 7 j/.test(h))throw new Error('moyenne en double');
  if(h.indexOf('>Reste<')<0)throw new Error('tuile Reste');
});
t('*** Bilan : la depense reelle n\'apparait plus dans le bloc Depense energetique ***',()=>{
  prepa();X("estimateTDEE=function(){return {ok:true,tdee:2519};}");
  try{const h=X('renderBurnBlock()');if(/pense r(é|\\u00e9)elle|2519/.test(h))throw new Error('depense reelle repetee');}
  finally{X('estimateTDEE=globalThis.estimateTDEE');}
});
t('*** Bilan : pas de moyenne d\'activite sur moins de 3 jours ***',()=>{
  prepa();X("_burnData={};_burnData[S.today]={steps:8000,activities:[]};");
  if(/Moy\. \d j/.test(X('renderBurnBlock()')))throw new Error('moyenne sur 1 jour');
  X("['2026-10-01','2026-10-02'].forEach(function(d){_burnData[d]={steps:6000,activities:[]};})");
  if(!/Moy\. 3 j/.test(X('renderBurnBlock()')))throw new Error('moyenne absente a 3 jours');
});
t('*** Courses : rayon « Auto » par defaut, le rayon est devine (plus de poulet en Articles menagers) ***',()=>{
  prepa();X("S.mainTab='courses'");const h=X('renderCoursesHTML()');
  if(!/<select id="shop-add-rayon"[^>]*><option value="">Auto<\/option>/.test(h))throw new Error('option auto en tete');
  docEl('shop-add-name').value='Blanc de poulet';docEl('shop-add-rayon').value='';X('addShopItem()');
  const it=X("S.shop.list.find(function(i){return i.name==='Blanc de poulet'})");
  eq(it.rayon,X("_guessRayon('Blanc de poulet')"),'rayon devine');if(it.rayon==='menager')throw new Error('menager');
  docEl('shop-add-name').value='Sopalin';docEl('shop-add-rayon').value='menager';X('addShopItem()');
  eq(X("S.shop.list.find(function(i){return i.name==='Sopalin'}).rayon"),'menager','choix manuel respecte');
});
t('*** Courses : 🧾 par article (estompe s\'il va dans « À ranger »), reglable aussi dans la fiche ***',()=>{
  prepa();X("S.mainTab='courses'");
  const n=h=>(h.match(/aria-pressed="true"/g)||[]).length;
  if(!/toggleGraveItem\('a'\)" aria-pressed="false"/.test(X('renderCoursesHTML()')))throw new Error('bouton estompe absent');
  eq(n(X('renderCoursesHTML()')),0,'marque sur un article normal');
  X("openShopItem('a')");eq(docEl('shopitem-grave').checked,false);
  docEl('shopitem-grave').checked=true;X('moveShopItem()');eq(X("S.shop.list[0].graveOnly"),true);
  eq(n(X('renderCoursesHTML()')),1,'article 🧾 marque');
  X("openShopItem('a')");eq(docEl('shopitem-grave').checked,true);docEl('shopitem-grave').checked=false;X('moveShopItem()');
  eq(X("S.shop.list[0].graveOnly"),undefined);
});
t('*** Inventaire : plus de badge « À consommer » en double sur une ligne deja rouge ***',()=>{
  prepa();X("S.mainTab='inventory';S.openCat.frigo=1;S.inv.frigo=[{id:'x',name:'Avocats',qty:2,unit:'pcs',urgent:true}]");
  const h=X('renderInvCats()');
  if(h.indexOf('⚠ À consommer')>=0)throw new Error('badge');if(h.indexOf('⏱')<0||h.indexOf('Avocats')<0)throw new Error('ligne');
});
t('Inventaire : explication des plats maison derriere ⓘ',()=>{
  prepa();X('_platsAide=false');let h=X('renderPlatsMaison()');
  if(h.indexOf('Un gâteau, des lasagnes')>=0)throw new Error('explication affichee');if(h.indexOf('Préparer un plat')<0)throw new Error('bouton');
  X('_platsAide=true');if(X('renderPlatsMaison()').indexOf('Un gâteau, des lasagnes')<0)throw new Error('ⓘ sans effet');X('_platsAide=false');
});
t('*** pastille « à consommer » : ouvre l\'inventaire, categories concernees depliees ***',()=>{
  prepa();X("S.mainTab='bilan';S.inv.frigo=[{id:'x',name:'Avocats',qty:2,unit:'pcs',urgent:true}];S.inv.placards=[{id:'y',name:'Riz',qty:500,unit:'g'}]");
  if(!/data-action="voir-urgents"[^>]*>⚠ 1 à consommer<\/button>/.test(src.replace(/\$\{urgTotal\}/,'1')))throw new Error('pastille non cliquable');
  X("_onActionClick({target:{closest:function(){return {dataset:{action:'voir-urgents',val:''}};}}})");
  eq(X('S.mainTab'),'inventory');eq(X('S.openCat.frigo'),1);eq(X('S.openCat.placards'),undefined,'categorie sans urgence ouverte');
});
console.log('\n=== XXIV. Nouveautes apres une mise a jour ===');
t('*** chaque build a ses nouveautes : BUILD_ID = sw.js = premiere entree ***',()=>{
  const id=X('BUILD_ID');eq(X('NOUVEAUTES[0].b'),id,'entree du build');
  if(sw.indexOf("const CACHE='macros-"+id+"'")<0)throw new Error('sw.js CACHE ≠ BUILD_ID');
  const hh=id.slice(11,13)+'h'+id.slice(13,15);if(src.indexOf('build '+id.slice(0,10)+' '+hh)<0)throw new Error('build Reglages ≠ BUILD_ID');
  if(!Array.isArray(X('NOUVEAUTES[0].points')))throw new Error('entree sans liste de points');
  const ids=X('NOUVEAUTES.map(function(n){return n.b}).join()').split(',');if(ids.slice().sort().reverse().join()!==ids.join())throw new Error('ordre');
});
t('*** montrees une seule fois par appareil, puis plus rien ***',()=>{
  const msgs=[];const va=sb.alert;sb.alert=m=>msgs.push(m);const vs=X('sessionActive');X('sessionActive=function(){return true;}');
  try{
    LS.dz_nouveautes='2026-01-01-0000';X('_nvFait=false;_loaded=true;_verifierNouveautes()');
    eq(msgs.length,1,'premiere ouverture');if(!/^Quoi de neuf dans Dorayaki \?\n\n• /.test(msgs[0]))throw new Error(msgs[0].slice(0,60));
    eq(LS.dz_nouveautes,X('BUILD_ID'));
    X('_nvFait=false;_verifierNouveautes()');eq(msgs.length,1,'deuxieme ouverture');
  }finally{sb.alert=va;sb.__vs=vs;X('sessionActive=__vs');}
});
t('appareil sans historique : seulement la derniere entree ; pas connecte : rien',()=>{
  const msgs=[];const va=sb.alert;sb.alert=m=>msgs.push(m);
  try{
    delete LS.dz_nouveautes;X('sessionActive=function(){return false;};_nvFait=false;_verifierNouveautes()');eq(msgs.length,0,'hors session');eq(LS.dz_nouveautes,undefined);
    X('sessionActive=function(){return true;};_nvFait=false;_verifierNouveautes()');eq(msgs.length,1);
    X('montrerNouveautes()');eq(msgs.length,2,'lien Quoi de neuf');
  }finally{sb.alert=va;X('sessionActive=__vs');}
});
t('inscription : le nouveau compte ne recoit pas la liste des changements',()=>{
  const i=src.indexOf('async function finaliserInscription');
  if(!/localStorage\.setItem\('dz_nouveautes',BUILD_ID\)[^\n]*\n\s*try\{location\.reload/.test(src.slice(i,i+2500)))throw new Error('marque absente');
  if(!/loadState\(\)\.then\(\(\)=>\{render\(\);_verifierNouveautes\(\);\}/.test(src))throw new Error('appel au demarrage');
  if(src.indexOf('onclick="montrerNouveautes()"')<0)throw new Error('lien Reglages');
});
t('*** build sans nouveaute visible (points vides) : rien n\'est montre, la derniere vraie entree reste dans « Quoi de neuf ? » ***',()=>{
  const msgs=[];const va=sb.alert;sb.alert=m=>msgs.push(m);const vn=X('NOUVEAUTES.slice()');
  try{
    X("NOUVEAUTES.splice(0,NOUVEAUTES.length,{b:'2099-01-02-0000',points:[]},{b:'2099-01-01-0000',points:['Vraie nouveaute']})");
    sb.__vs2=X('sessionActive');X('sessionActive=function(){return true;}');
    LS.dz_nouveautes='2099-01-01-0000';X('_nvFait=false;_verifierNouveautes()');eq(msgs.length,0,'entree vide montree');
    X('montrerNouveautes()');if(!/Vraie nouveaute/.test(msgs[0]||''))throw new Error('lien Reglages : '+msgs[0]);
  }finally{sb.alert=va;sb.__vn=vn;X('NOUVEAUTES.splice.apply(NOUVEAUTES,[0,NOUVEAUTES.length].concat(__vn));sessionActive=__vs2');}
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
