const {sb,docEl}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
const vraiCallAI=X('callAI');
function ia(rep){sb.__ia=async()=>{if(rep instanceof Error)throw rep;return {content:[{type:'text',text:rep}],empty:!rep};};X("callAI=__ia");}
function finIA(){sb.__vrai=vraiCallAI;X('callAI=__vrai');}
const base=()=>X("S.pasBase=0;S.profil=null;S.today='2026-10-03';");

console.log('\n=== XXVI. Pas et activites selon le poids ===');
t('*** le cout d\'un pas suit le poids : 0,04 kcal a 80 kg, 0,05 a 100 kg ***',()=>{
  base();X("S.weights=[{d:'2026-10-01',w:100}]");eq(X("burnStepKcal(1000,'2026-10-03')"),50);
  X("S.weights=[{d:'2026-10-01',w:60}]");eq(X("burnStepKcal(1000,'2026-10-03')"),30);
  X("S.weights=[]");eq(X("burnStepKcal(1000,'2026-10-03')"),40,'sans pesee : 80 kg');
});
t('*** une journee passee utilise le poids de ce jour-la, pas celui d\'aujourd\'hui ***',()=>{
  base();X("S.weights=[{d:'2026-10-02',w:90},{d:'2026-09-01',w:100}]");
  eq(X("burnStepKcal(1000,'2026-09-15')"),50,'mi-septembre : 100 kg');eq(X("burnStepKcal(1000,'2026-10-03')"),45,'aujourd\'hui : 90 kg');
  X("__setBurn({'2026-09-15':{steps:1000,activities:[]}})");eq(X("burnDayTotal('2026-09-15').brut"),50);
});
t('la routine de pas reste deduite',()=>{base();X("S.weights=[];S.pasBase=500");eq(X("burnStepKcal(1500,'2026-10-03')"),40);});
t('*** activite estimee par l\'IA : sans la depense de repos (deja dans la cible) ***',async()=>{
  base();X("S.weights=[{d:'2026-10-01',w:80}];_burnActs=[]");docEl('burn-date').value='2026-10-03';
  docEl('burn-act-name').value='Course';docEl('burn-act-min').value='60';ia('500');
  try{await X('burnEstimateActivity')();}finally{finIA();}
  eq(X('_burnActs[0].kcal'),420,'500 - 80 kg x 1 h');
});
t('*** repli sans IA : MET net et poids du jour ***',async()=>{
  base();X("S.weights=[{d:'2026-10-01',w:80},{d:'2026-08-01',w:120}];_burnActs=[]");docEl('burn-date').value='2026-10-03';
  docEl('burn-act-name').value='Course';docEl('burn-act-min').value='30';ia(new Error('API:x'));
  try{await X('burnEstimateActivity')();}finally{finIA();}
  eq(X('_burnActs[0].kcal'),Math.round(8.8*80*0.5));
});

console.log('\n=== XXVII. Courses : 🧾 article par article ===');
t('*** plus de reglage par rayon ; l\'ancien est reporte sur les articles du rayon ***',()=>{
  if(/toggleGraveRayon/.test(src))throw new Error('bouton rayon encore present');
  X("_etatCorrige=false");sb._applyState({inv:{frigo:[]},dayMeals:{},catalogue:'autre',shopSeeded:true,shop:{list:[{id:'a',name:'Eau',rayon:'boissons'},{id:'b',name:'Lait',rayon:'laitiers'}],graveyard:[],graveRayons:['boissons']}});
  eq(X("S.shop.list[0].graveOnly"),true,'eau');eq(X("S.shop.list[1].graveOnly"),undefined,'lait');eq(X("S.shop.graveRayons.length"),0);eq(X('_etatCorrige'),true);
  eq(X("shopTransfer('boissons')"),true,'le rayon redevient normal');
});
t('rayon hors inventaire : pas de bouton 🧾 (rien a ranger de toute facon)',()=>{
  X("S.mainTab='courses';S.coursesVoirAchetes=false;S.waiting=[];S.shop={list:[{id:'m',name:'Sopalin',rayon:'menager'}],graveyard:[],graveRayons:[]}");
  if(/toggleGraveItem\('m'\)/.test(X('renderCoursesHTML()')))throw new Error('bouton inutile');
});

console.log('\n=== XXVIII. Mon programme ===');
t('*** mon ancien programme est recopie une fois dans mon compte, pas dans les autres ***',()=>{
  sb._applyState({inv:{frigo:[]},dayMeals:{},catalogue:'liam',shopSeeded:true});
  eq(X("S.programme.map(function(s){return s.id}).join()"),'hautA,basA,hautB,basB');eq(X('S.progMigre'),true);
  sb._applyState({inv:{frigo:[]},dayMeals:{},catalogue:'autre',shopSeeded:true});eq(X('S.programme.length'),0,'autre compte');
  sb._applyState({inv:{frigo:[]},dayMeals:{},catalogue:'liam',shopSeeded:true,progMigre:true});eq(X('S.programme.length'),0,'supprime par moi : ne revient pas');
});
t('*** le programme est enregistre avec l\'etat, et neutralise au chargement ***',()=>{
  if(!/programme:S\.programme\|\|\[\],progMigre:!!S\.progMigre/.test(src))throw new Error('non enregistre');
  sb._applyState({inv:{frigo:[]},dayMeals:{},progMigre:true,programme:[{id:'x',nom:'<img src=x onerror=alert(1)>',exos:'"a"',min:9999,met:99}]});
  const p=X('S.programme[0]');if(/[<>"]/.test(p.nom+p.exos))throw new Error('non neutralise');eq(p.min,180);eq(p.met,12);
});
t('*** creer, modifier, supprimer une seance ***',async()=>{
  X("S.programme=[];S.weights=[{d:'2026-10-01',w:80}]");X('ouvrirProgramme()');eq(docEl('prog-overlay').style.display,'flex');
  docEl('prog-nom').value='Push';docEl('prog-exos').value='Développé couché, dips';docEl('prog-min').value='50';docEl('prog-niv').value='5';
  X('enregistrerSeanceProg()');eq(X('S.programme.length'),1);eq(X('S.programme[0].met'),5);eq(X('S.programme[0].min'),50);
  const id=X('S.programme[0].id');X("modifierSeanceProg('"+id+"')");docEl('prog-nom').value='Push lourd';docEl('prog-min').value='70';docEl('prog-niv').value='5';docEl('prog-exos').value='';
  X('enregistrerSeanceProg()');eq(X('S.programme.length'),1,'modifie, pas duplique');eq(X('S.programme[0].nom'),'Push lourd');
  X("supprimerSeanceProg('"+id+"')");await new Promise(r=>setTimeout(r,0));eq(X('S.programme.length'),0);
});
t('nom ou duree manquants : rien n\'est enregistre',()=>{
  X("S.programme=[];ouvrirProgramme()");docEl('prog-nom').value='';docEl('prog-min').value='50';X('enregistrerSeanceProg()');
  docEl('prog-nom').value='Jambes';docEl('prog-min').value='';X('enregistrerSeanceProg()');eq(X('S.programme.length'),0);
});
t('*** l\'IA choisit l\'intensite et propose une duree si elle manque ***',async()=>{
  X("S.programme=[];ouvrirProgramme()");docEl('prog-nom').value='Jambes';docEl('prog-exos').value='Squat lourd, presse';docEl('prog-min').value='';
  ia('{"met":5.3,"min":70}');try{await X('estimerSeanceIA')();}finally{finIA();}
  eq(docEl('prog-niv').value,'5','soutenue');eq(docEl('prog-min').value,'70');
});
t('*** la seance choisie s\'ajoute a la journee, pour le poids du jour ***',()=>{
  X("S.weights=[{d:'2026-10-01',w:80}];S.programme=[{id:'p1',nom:'Push',min:60,met:5,exos:''}];_burnActs=[]");docEl('burn-date').value='2026-10-03';
  X('renderProgramme()');docEl('burn-prog-sel').value='p1';X('renderProgramme()');docEl('burn-prog-min').value='60';X('ajouterSeanceProgramme()');
  eq(X('_burnActs[0].kcal'),320);eq(X('_burnActs[0].name'),'Séance — Push');
});
console.log('\n=== XXIX. Recettes IA : autant qu\'il en manque ===');
const RV=X('RCP.slice()');
function pose(par){X("RCP.length=0");let k=0;Object.keys(par).forEach(sl=>{for(let i=0;i<par[sl];i++)X("RCP.push({id:'z"+(k++)+"',name:'R"+k+"',slots:['"+sl+"'],used:[]})");});}
t('*** on vise 4 recettes faisables par repas : le manque seulement ***',()=>{
  pose({breakfast:4,lunch:1,snack:4,dinner:0});const b=X('_besoinRecettes()');
  eq(b.manque.lunch,3);eq(b.manque.dinner,4);eq(b.manque.breakfast,0);eq(b.n,7);
  if(!/EXACTEMENT 7 recettes au total : 3 pour le déjeuner, 4 pour le dîner/.test(X('_consigneNombre')(b)))throw new Error(X('_consigneNombre')(b));
});
t('une recette non cuisinable avec le stock ne compte pas',()=>{
  pose({lunch:4});X("RCP.forEach(function(r){r.used=[{id:'introuvable',qty:100}]})");eq(X('_besoinRecettes().manque.lunch'),4);
});
t('*** peu de recettes : on en demande plus, au plus 8 ***',()=>{pose({});eq(X('_besoinRecettes().n'),8);});
t('*** assez partout : on demande avant d\'en ajouter 2 ***',async()=>{
  pose({breakfast:4,lunch:5,snack:4,dinner:6});
  X("S.inv={frigo:[1,2,3,4,5,6].map(function(i){return {id:'f'+i,name:'A'+i,qty:100,unit:'g'};}),congelateur:[],placards:[],epices:[]}");
  let q='';const vc=sb.confirm;sb.confirm=m=>{q=m;return false;};let appel=false;sb.__ia2=async()=>{appel=true;return {content:[{type:'text',text:'[]'}]};};X('callAI=__ia2');
  try{await X('generateStockRecipes')();}finally{sb.confirm=vc;finIA();}
  if(!/assez de recettes faisables/.test(q))throw new Error('pas de question');if(appel)throw new Error('IA appelee malgre le refus');
  const m=X('_besoinMinimal(_besoinRecettes())');eq(m.n,2);eq(m.manque.breakfast+m.manque.snack,2,'les repas les moins fournis');
});
t('la consigne remplace l\'ancien « 8 a 12 recettes »',()=>{
  if(/Vise 8 à 12|MAXIMUM de recettes|_ask\(6,/.test(src))throw new Error('ancienne consigne');
  X('RCP.length=0');sb.__rv=RV;X('__rv.forEach(function(r){RCP.push(r)})');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
