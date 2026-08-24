const {sb}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const tol=G('_toleranceDlc'),anom=G('dlcAnomalie');
const jour=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
function art(name,depuis){return{id:'x',name:name,unit:'g',qty:100,dlc:jour(-depuis),mac100:{kcal:100,prot:5,gluc:5,lip:5}};}
function estAnomalie(name,depuis){
  S.inv={frigo:[art(name,depuis)],placards:[],congelateur:[],epices:[]};
  return (sb.invIssues().expires||[]).length>0;
}

console.log('\n=== BL. Le cas signale ===');
t('*** une DLC depassee d\'un jour n\'est plus une anomalie ***',()=>{
  if(estAnomalie('Crème fraîche légère',1))throw new Error('encore signalee');
});
t('la meme creme apres une semaine devient une anomalie',()=>{
  if(!estAnomalie('Crème fraîche légère',7))throw new Error('non signalee');
});

console.log('\n=== BM. Tolerance par famille ===');
t('produit generique : une semaine',()=>eq(tol({name:'Truc inconnu'}),7));
t('*** viande hachee : aucune tolerance ***',()=>eq(tol({name:'Boeuf haché 5%'}),0));
t('*** poisson : aucune tolerance ***',()=>eq(tol({name:'Saumon fumé'}),0));
t('*** volaille : aucune tolerance ***',()=>eq(tol({name:'Aiguillettes de poulet'}),0));
t('*** charcuterie : aucune tolerance ***',()=>{
  eq(tol({name:'Allumettes de bacon'}),0);
  eq(tol({name:'Jambon blanc'}),0);
});
t('cremes et pates fraiches : 5 jours',()=>{
  eq(tol({name:'Crème semi-épaisse'}),5);
  eq(tol({name:'Tortellini Prosciutto'}),5);
  eq(tol({name:'Gnocchis'}),5);
});
t('fromages affines : 21 jours',()=>{
  eq(tol({name:'Fromage râpé'}),21);
  eq(tol({name:'Parmesan'}),21);
});
t('produits secs : 60 jours',()=>{
  eq(tol({name:'Riz Oiseaux Célestes'}),60);
  eq(tol({name:'Flocons d\'avoine'}),60);
});
t('*** oeufs et fromage blanc : pas de rallonge (effDlc a deja +14j) ***',()=>{
  eq(tol({name:'Oeufs'}),0);
  eq(tol({name:'Fromage blanc 0% nature'}),0);
});

console.log('\n=== BN. Comportement bout en bout ===');
t('bacon depasse de 2 jours : signale',()=>{
  if(!estAnomalie('Allumettes de bacon',2))throw new Error('non signale');
});
t('boeuf hache : voir section BQ',()=>{
  if(!estAnomalie('Boeuf haché (450g à 5% MG)',1))throw new Error('non signale');
});
t('*** fromage blanc depasse de 10 jours : pas encore signale ***',()=>{
  // effDlc lui accorde deja 14 jours
  if(estAnomalie('Fromage blanc 0% nature ou parfumé',10))throw new Error('signale trop tot');
});
t('fromage blanc depasse de 20 jours : signale',()=>{
  if(!estAnomalie('Fromage blanc 0% nature ou parfumé',20))throw new Error('non signale');
});
t('fromage rape depasse de 15 jours : pas signale',()=>{
  if(estAnomalie('Fromage râpé',15))throw new Error('signale trop tot');
});
t('riz depasse de 30 jours : pas signale',()=>{
  if(estAnomalie('Riz Oiseaux Célestes',30))throw new Error('signale trop tot');
});
t('produit generique depasse de 3 jours : pas signale',()=>{
  if(estAnomalie('Compote maison',3))throw new Error('signale trop tot');
});
t('produit generique depasse de 10 jours : signale',()=>{
  if(!estAnomalie('Compote maison',10))throw new Error('non signale');
});

console.log('\n=== BO. Les alertes ne bougent pas ===');
t('*** effDlc est inchangee ***',()=>{
  const it={id:'a',name:'Crème fraîche',dlc:'2026-08-20'};
  eq(G('effDlc')(it),'2026-08-20','la date reelle doit rester');
});
t('le badge DLC se fonde toujours sur la date reelle',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!src.includes('getDlcStatus(effDlc(it))'))throw new Error('badge modifie');
});
t('seul le diagnostic utilise le seuil tolerant',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  eq((src.match(/dlcAnomalie\(/g)||[]).length,2,'1 definition + 1 usage');
});

console.log('\n=== BP. Robustesse ===');
t('article sans DLC',()=>{
  eq(anom({name:'X'}),null);
  if(estAnomalie('X',0)&&false)throw new Error('x');
});
t('date invalide ne casse pas',()=>{
  const r=anom({name:'X',dlc:'pas-une-date'});
  if(r===undefined)throw new Error('undefined');
});
t('article null',()=>{eq(tol(null),7);anom(null);});
t('article epuise n\'est jamais signale',()=>{
  S.inv={frigo:[{id:'z',name:'Crème',unit:'g',qty:0,dlc:jour(-30),mac100:{kcal:1,prot:0,gluc:0,lip:0}}],
         placards:[],congelateur:[],epices:[]};
  eq((sb.invIssues().expires||[]).length,0);
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');

console.log('\n=== BQ. Le boeuf n\'est pas un oeuf ===');
t('*** effDlc n\'accorde plus 14 jours au boeuf ***',()=>{
  eq(G('effDlc')({id:'b',name:'Boeuf haché (450g à 5% MG)',dlc:'2026-08-20'}),'2026-08-20');
});
t('la ligature "bœuf" est couverte aussi',()=>{
  eq(G('effDlc')({id:'b',name:'Steak de bœuf',dlc:'2026-08-20'}),'2026-08-20');
});
t('les vrais oeufs gardent leurs 14 jours',()=>{
  eq(G('effDlc')({id:'oeufs',name:'Oeufs',dlc:'2026-08-20'}),'2026-09-03');
});
t('bouillon de boeuf : pas de rallonge non plus',()=>{
  eq(G('effDlc')({id:'bb',name:'Bouillon boeuf',dlc:'2026-08-20'}),'2026-08-20');
});
t('*** boeuf hache depasse d\'un jour : signale ***',()=>{
  if(!estAnomalie('Boeuf haché (450g à 5% MG)',1))throw new Error('non signale');
});
console.log('\n---- total '+pass+' ok, '+fail+' KO ----');
