const {sb,docEl}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;
const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
const J=d=>X('shiftDate(S.today,'+d+')');
const repas=(nom,k,p,slot)=>({rid:'x_'+nom,name:nom,slot:slot||null,macros:{kcal:k,prot:p,gluc:10,lip:5}});
function prepa(){
  X("_loaded=true;S.mainTab='accueil';S.displayDate=S.today;S.pendingFreeMeal=null;S.dayMeals={};");
  X("S.inv={frigo:[{id:'p',name:'Poulet',qty:500,unit:'g'}],congelateur:[],placards:[],epices:[]};");
}

console.log('\n=== VA. Bouton + et volet d\'ajout ===');
t('*** le + est un bouton flottant, hors de la barre du bas ***',()=>{
  X('_bnavPose=false;');X('renderBnav()');
  const h=docEl('bnav').innerHTML;
  if(/bnav-plus|menu-ajout/.test(h))throw new Error('encore dans la barre');
  eq((h.match(/class="bnav-b/g)||[]).length,5,'cinq onglets');
  const src=require('fs').readFileSync('index.html','utf8');
  if(!/<button id="fab-ajout" onclick="ouvrirMenuAjout\(\)"/.test(src))throw new Error('bouton flottant absent');
  if(!/#fab-ajout \{ position: fixed;[^}]*right: calc\(16px \+ env\(safe-area-inset-right/.test(src))throw new Error('pas en bas a droite');
  if(!/<svg viewBox="0 0 24 24"[^>]*><path d="M12 5v14M5 12h14"/.test(src))throw new Error('+ non dessine en SVG');
});
t('le contenu garde de la place sous le bouton flottant',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!/\.container \{ padding-bottom: calc\(150px/.test(src))throw new Error('marge basse');
});
t('*** Accueil -> recette : la page defile jusqu\'a la fiche ***',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  const i=src.indexOf("else if(action==='go-recipe')");
  if(!/_allerVersRecette\(el\.dataset\.val\)/.test(src.slice(i,i+400)))throw new Error('pas de defilement');
  const f=src.slice(src.indexOf('function _allerVersRecette'),src.indexOf('function _animateTabs'));
  if(!/closest\('\.rcard'\)/.test(f)||!/apphead/.test(f)||!/scrollTo/.test(f))throw new Error('calcul incomplet');
});
t('barre Reste cachee = retiree du rendu, sans flou d\'arriere-plan',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  const c=src.slice(src.indexOf('#barre-reste {'),src.indexOf('#barre-reste.vis'));
  if(/backdrop-filter/.test(c))throw new Error('flou present');
  if(!/#barre-reste:not\(\.vis\) \{ display: none; \}/.test(src))throw new Error('pas retiree');
});
t('le volet propose les six parcours',()=>{
  prepa();X('ouvrirMenuAjout()');
  const h=docEl('menu-ajout-corps').innerHTML;
  ['texte','photo','code','inventaire','activite','pesee'].forEach(a=>{if(h.indexOf("menuAjoutAction('"+a+"')")<0)throw new Error('manque '+a);});
  eq(docEl('menu-ajout').style.display,'flex');
});
t('jour vise : celui du tracker dans Recettes, aujourd\'hui ailleurs',()=>{
  prepa();X("S.displayDate=shiftDate(S.today,-2);");
  eq(X('_jourAjout()'),X('S.today'),'accueil');
  X("S.mainTab='recipes';");eq(X('_jourAjout()'),J(-2),'recettes');
});
t('un autre jour que aujourd\'hui est annonce dans le volet',()=>{
  prepa();X("S.mainTab='recipes';S.displayDate=shiftDate(S.today,-1);");X('ouvrirMenuAjout()');
  if(docEl('menu-ajout-corps').innerHTML.indexOf('Pour hier')<0)throw new Error('pas d\'annonce');
});
t('Pas et activites ouvre la fiche du bon jour ; Pesee mene au Bilan',()=>{
  prepa();let jour=null;const vrai=sb.openBurnLog;sb.openBurnLog=d=>{jour=d;};
  try{X("menuAjoutAction('activite')");}finally{sb.openBurnLog=vrai;}
  eq(jour,X('S.today'));
  X("menuAjoutAction('pesee')");eq(X('S.mainTab'),'weight');
});
t('Code-barres et Inventaire passent par la fenetre d\'ajout existante',()=>{
  prepa();const appels=[];const s={o:sb.openAddMeal,c:sb.openScanner,i:sb.invAddMeal};
  sb.openAddMeal=t=>appels.push('add:'+t);sb.openScanner=m=>appels.push('scan:'+m);sb.invAddMeal=()=>appels.push('inv');
  try{X("menuAjoutAction('code')");X("menuAjoutAction('inventaire')");X("menuAjoutAction('photo')");}
  finally{sb.openAddMeal=s.o;sb.openScanner=s.c;sb.invAddMeal=s.i;}
  eq(appels.join(),'add:text,scan:meal,add:text,inv,add:photo');
});

console.log('\n=== VB. Repas habituels ===');
t('*** classes par frequence puis par recence, sur 30 jours ***',()=>{
  prepa();
  X("S.dayMeals[shiftDate(S.today,-1)]=["+JSON.stringify(repas('Porridge',450,30,'breakfast'))+","+JSON.stringify(repas('Bol poulet',600,50))+"];");
  X("S.dayMeals[shiftDate(S.today,-2)]=["+JSON.stringify(repas('Porridge',452,30,'breakfast'))+"];");
  X("S.dayMeals[shiftDate(S.today,-3)]=["+JSON.stringify(repas('Porridge',448,30,'breakfast'))+","+JSON.stringify(repas('Omelette',300,20))+"];");
  X("S.dayMeals[shiftDate(S.today,-40)]=["+JSON.stringify(repas('Vieux plat',700,40))+","+JSON.stringify(repas('Vieux plat',700,40))+"];");
  const h=X('_repasHabituels(6)');
  eq(h.map(x=>x.nom+'×'+x.nb).join(','),'Porridge×3,Bol poulet×1,Omelette×1');
  eq(h[0].jour,J(-1),'modele = saisie la plus recente');
});
t('les dates mal formees ou futures sont ignorees',()=>{
  prepa();
  X("S.dayMeals[\"2026-01-01');alert(1);//\"]=["+JSON.stringify(repas('Piege',500,20))+"];");
  X("S.dayMeals[shiftDate(S.today,1)]=["+JSON.stringify(repas('Demain',500,20))+"];");
  eq(X('_repasHabituels(6)').length,0);
});
t('*** refaire un repas l\'ajoute au jour vise et deduit le stock ***',()=>{
  prepa();
  const m=repas('Poulet riz',650,55,'lunch');m.ings=[{id:'p',qty:200}];
  X("S.dayMeals[shiftDate(S.today,-1)]=["+JSON.stringify(m)+"];");
  X("refaireRepas(shiftDate(S.today,-1),0)");
  eq(X('(S.dayMeals[S.today]||[]).length'),1);
  eq(X('S.dayMeals[S.today][0].slot'),'lunch','moment d\'origine garde');
  eq(X("S.inv.frigo[0].qty"),300,'stock');
  eq(X('S.dayMeals[shiftDate(S.today,-1)].length'),1,'modele intact');
});
t('garde nocturne : la question hier/aujourd\'hui s\'affiche dans Recettes',()=>{
  prepa();X("S.dayMeals[shiftDate(S.today,-1)]=["+JSON.stringify(repas('Tard',400,20))+"];");
  const vrai=sb.heureProfil;sb.heureProfil=()=>2;
  try{X("refaireRepas(shiftDate(S.today,-1),0)");}finally{sb.heureProfil=vrai;}
  eq(X('S.pendingFreeMeal&&S.pendingFreeMeal.name'),'Tard');
  eq(X('S.mainTab'),'recipes');
  eq(X('(S.dayMeals[S.today]||[]).length'),0);
});
t('un repas libre en attente de nuit bascule aussi sur Recettes',()=>{
  const i=src.indexOf('S.pendingFreeMeal=_meal;');
  if(!/S\.mainTab='recipes'/.test(src.slice(i,i+80)))throw new Error('onglet non force');
});

console.log('\n=== VC. Appliquer la cible conseillee ===');
t('*** une etape ne depasse pas 300 kcal ***',()=>{
  X("TARGETS={kcal:2300,prot:170,gluc:230,lip:70};");
  eq(X('_etapeCible(1610)'),2000);eq(X('_etapeCible(2150)'),2150);eq(X('_etapeCible(2800)'),2600);
  eq(X('_etapeCible(2280)'),null,'ecart < 50');eq(X('_etapeCible(1100)'),null,'sous 1200');
});
t('*** proteines et lipides gardes, glucides ajustes ***',()=>{
  prepa();X("S.profil={prenom:'L',cibles:{kcal:2300,prot:170,gluc:230,lip:70}};TARGETS=_ciblesProfil();");
  X('appliquerCibleConseillee(2000)');
  eq(JSON.stringify(X('S.profil.cibles')),JSON.stringify({kcal:2000,prot:170,gluc:155,lip:70}));
  eq(X('TARGETS.kcal'),2000);eq(X('S.profil.prenom'),'L','profil ecrase');
});
t('refuser la confirmation ne change rien',()=>{
  prepa();X("S.profil={cibles:{kcal:2300,prot:170,gluc:230,lip:70}};TARGETS=_ciblesProfil();");
  const vrai=sb.confirm;sb.confirm=()=>false;
  try{X('appliquerCibleConseillee(2000)');}finally{sb.confirm=vrai;}
  eq(X('TARGETS.kcal'),2300);
});
t('le bouton n\'apparait qu\'en seche, quand la perte ralentit',()=>{
  X("TARGETS={kcal:2300,prot:170,gluc:230,lip:70};");
  const bloc=pw=>X('renderTDEEBlock')({ok:true,tdee:2161,perWeek:pw,days:28,avgCal:2154,logs:29});
  if(!/appliquer-cible/.test(bloc(0)))throw new Error('absent en stagnation');
  if(/appliquer-cible/.test(bloc(0.4)))throw new Error('present alors que le rythme est bon');
  const vrai=sb._enPriseDeMasse;sb._enPriseDeMasse=()=>true;
  try{if(/appliquer-cible/.test(bloc(0)))throw new Error('present en prise de masse');}finally{sb._enPriseDeMasse=vrai;}
});

console.log('\n=== VD. Barre « Reste » ===');
t('*** presente dans Recettes seulement ***',()=>{
  prepa();X("TARGETS={kcal:2300,prot:170,gluc:230,lip:70};S.dayMeals[S.today]=["+JSON.stringify(repas('A',1200,80))+"];");
  eq(X('_htmlBarreReste()'),'','hors Recettes');
  X("S.mainTab='recipes';");
  const h=X('_htmlBarreReste()');
  if(h.indexOf('1100 kcal')<0||h.indexOf('90 g')<0)throw new Error(h);
  if(!/data-action="remonter-tracker"/.test(h))throw new Error('pas de retour au tracker');
});
t('depassement et proteines atteintes',()=>{
  prepa();X("S.mainTab='recipes';TARGETS={kcal:2300,prot:170,gluc:230,lip:70};S.dayMeals[S.today]=["+JSON.stringify(repas('A',2500,180))+"];");
  const h=X('_htmlBarreReste()');
  if(h.indexOf('Dépassé de')<0||h.indexOf('200 kcal')<0||h.indexOf('prot. atteintes')<0)throw new Error(h);
});
t('un autre jour affiche est nomme',()=>{
  prepa();X("S.mainTab='recipes';S.displayDate=shiftDate(S.today,-1);");
  if(X('_htmlBarreReste()').indexOf('hier')<0)throw new Error('jour absent');
});
t('la barre est posee dans l\'en-tete a chaque rendu',()=>{
  if(!/<div class="apphead">\$\{_htmlBarreReste\(\)\}/.test(src))throw new Error('absente de l\'en-tete');
  const i=src.indexOf('_animateTabs();\n  _majBarreReste();');if(i<0)throw new Error('pas de mise a jour apres rendu');
});

(async()=>{
  for(const [n,f] of tests){
    try{await f();pass++;console.log('  ok  '+n);}
    catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}
  }
  console.log('---- '+pass+' ok, '+fail+' KO');
})();
