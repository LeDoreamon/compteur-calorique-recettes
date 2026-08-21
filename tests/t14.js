const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const tri=G('_triRecettes'),dens=G('_densProt');

const R=[
 {id:'a',name:'Zèbre au four',kcal:900,prot:30,urgent:0},   // dens 3.3
 {id:'b',name:'Avocat grillé',kcal:200,prot:40,urgent:0},   // dens 20
 {id:'c',name:'Muffin',kcal:500,prot:10,urgent:1},          // dens 2
 {id:'d',name:'Épinards',kcal:100,prot:5,urgent:0}          // dens 5
];
const ordre=()=>R.slice().sort(tri).map(r=>r.id).join('');

console.log('\n=== AR. Tri : les favoris restent en haut ===');
t('*** un favori passe devant, meme avec le pire score ***',()=>{
  S.favs=['c'];S.recTri='prot';S.recTriDir=-1;
  eq(ordre()[0],'c','le favori doit etre premier');
});
t('*** le tri s\'applique quand meme entre les non-favoris ***',()=>{
  S.favs=['c'];S.recTri='prot';S.recTriDir=-1;
  eq(ordre(),'cbad','favori puis prot decroissantes');
});
t('plusieurs favoris sont tries entre eux',()=>{
  S.favs=['c','a'];S.recTri='prot';S.recTriDir=-1;
  eq(ordre().slice(0,2),'ac','a (30P) avant c (10P)');
});
t('aucun favori : tri pur',()=>{
  S.favs=[];S.recTri='prot';S.recTriDir=-1;
  eq(ordre(),'bacd');
});

console.log('\n=== AS. Les quatre criteres ===');
t('A-Z croissant',()=>{
  S.favs=[];S.recTri='az';S.recTriDir=1;
  eq(ordre(),'bdca','Avocat, Epinards, Muffin, Zebre');
});
t('A-Z decroissant',()=>{
  S.favs=[];S.recTri='az';S.recTriDir=-1;
  eq(ordre(),'acdb');
});
t('kcal croissantes',()=>{
  S.favs=[];S.recTri='kcal';S.recTriDir=1;
  eq(ordre(),'dbca','100,200,500,900');
});
t('kcal decroissantes',()=>{
  S.favs=[];S.recTri='kcal';S.recTriDir=-1;
  eq(ordre(),'acbd');
});
t('proteines decroissantes',()=>{
  S.favs=[];S.recTri='prot';S.recTriDir=-1;
  eq(ordre(),'bacd','40,30,10,5');
});
t('*** densite proteique decroissante ***',()=>{
  S.favs=[];S.recTri='dens';S.recTriDir=-1;
  eq(ordre(),'bdac','20 ; 5 ; 3.3 ; 2');
});
t('le calcul de densite est juste',()=>{
  eq(Math.round(dens(R[1])),20,'40P pour 200kcal');
  eq(Math.round(dens(R[3])*10)/10,5,'5P pour 100kcal');
});
t('densite : division par zero evitee',()=>{
  eq(dens({kcal:0,prot:10}),0);
  eq(dens(null),0);
});
t('sans critere : ordre d\'origine (urgentes d\'abord)',()=>{
  S.favs=[];S.recTri='';S.recTriDir=1;
  eq(ordre()[0],'c','la recette urgente en tete');
});

console.log('\n=== AT. Interaction ===');
t('setRecTri applique le sens par defaut du critere',()=>{
  S.recTri='';G('setRecTri')('prot');
  eq(S.recTri,'prot');eq(S.recTriDir,-1,'prot par defaut decroissant');
  G('setRecTri')('az');
  eq(S.recTriDir,1,'A-Z par defaut croissant');
});
t('re-cliquer sur le critere actif revient a l\'ordre d\'origine',()=>{
  G('setRecTri')('kcal');eq(S.recTri,'kcal');
  G('setRecTri')('kcal');eq(S.recTri,'','desactive');
});
t('la fleche inverse le sens',()=>{
  G('setRecTri')('prot');const d=S.recTriDir;
  G('toggleRecTriDir')();eq(S.recTriDir,-d);
  G('toggleRecTriDir')();eq(S.recTriDir,d);
});
t('la fleche ne fait rien sans critere actif',()=>{
  S.recTri='';S.recTriDir=1;
  G('toggleRecTriDir')();eq(S.recTriDir,1);
});

console.log('\n=== AU. Rendu du trieur ===');
t('les quatre puces sont presentes',()=>{
  S.recTri='';
  const h=G('renderRecTri')();
  ['A-Z','kcal','Prot.','P/100kcal'].forEach(l=>{if(!h.includes(l))throw new Error(l+' absent');});
});
t('pas de fleche tant qu\'aucun critere n\'est choisi',()=>{
  S.recTri='';
  if(/rtri dir/.test(G('renderRecTri')()))throw new Error('fleche affichee a tort');
});
t('la fleche apparait avec un critere',()=>{
  S.recTri='prot';S.recTriDir=-1;
  const h=G('renderRecTri')();
  if(!/rtri dir/.test(h))throw new Error('fleche absente');
  if(!h.includes('\u2193'))throw new Error('fleche bas attendue');
});
t('la puce active est marquee',()=>{
  S.recTri='kcal';
  if(!/data-val="kcal" class="rtri on"/.test(G('renderRecTri')()))throw new Error('non marquee');
});
t('balises equilibrees',()=>{
  S.recTri='dens';
  const h=G('renderRecTri')();
  eq((h.match(/<div/g)||[]).length,(h.match(/<\/div>/g)||[]).length,'div');
  eq((h.match(/<button/g)||[]).length,(h.match(/<\/button>/g)||[]).length,'button');
});

console.log('\n=== AV. Onglet DLC retire ===');
t('MEAL_TABS ne contient plus urgent',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  const m=src.match(/const MEAL_TABS=\[[^\]]+\]/)[0];
  if(m.includes("k:'urgent'"))throw new Error('encore present');
  eq((m.match(/\{k:/g)||[]).length,6,'6 onglets');
});
t('*** un etat enregistre sur DLC retombe sur un onglet valide ***',()=>{
  S.mealTab='urgent';S.mainTab='recipes';
  S.inv={frigo:[],placards:[],congelateur:[],epices:[]};
  sb.render();
  if(S.mealTab==='urgent')throw new Error('toujours sur un onglet inexistant');
  if(!['breakfast','lunch','snack','dinner','perso','favs'].includes(S.mealTab))throw new Error(S.mealTab);
});
t('les onglets restants rendent sans erreur',()=>{
  ['breakfast','lunch','snack','dinner','perso','favs'].forEach(m=>{
    S.mealTab=m;sb.render();
    if(!docEl('root').innerHTML)throw new Error('vide sur '+m);
  });
});
t('le trieur est masque dans l\'onglet Favoris',()=>{
  S.mealTab='favs';sb.render();
  const h=docEl('root').innerHTML;
  if(/class="rec-tris"/.test(h))throw new Error('trieur affiche dans Favoris');
});
t('le trieur est present dans les autres onglets',()=>{
  S.mealTab='lunch';sb.render();
  if(!/class="rec-tris"/.test(docEl('root').innerHTML))throw new Error('trieur absent');
});
t('balises equilibrees apres rendu complet',()=>{
  S.mealTab='dinner';S.recTri='dens';sb.render();
  const h=docEl('root').innerHTML;
  eq((h.match(/<div/g)||[]).length,(h.match(/<\/div>/g)||[]).length,'div');
});

console.log('\n=== AW. Persistance ===');
t('le tri est envoye dans l\'etat',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!src.includes("recTri:S.recTri||''"))throw new Error('absent du payload');
});
t('le tri est relu au chargement',()=>{
  sb._applyState({inv:{frigo:[]},dayMeals:{},recTri:'dens',recTriDir:-1});
  eq(S.recTri,'dens');eq(S.recTriDir,-1);
});
t('valeurs absentes : defauts sains',()=>{
  sb._applyState({inv:{frigo:[]},dayMeals:{}});
  eq(S.recTri,'');eq(S.recTriDir,1);
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
