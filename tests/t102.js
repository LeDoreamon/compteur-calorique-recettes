// Copie, « refaire » et suppression d'un repas : le stock bouge comme a la cuisson (18/10/2026)
const {sb}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const S=sb.S;
const J=X('S.today'),J2=X("shiftDate(S.today,2)");
/* inventaire ou le poulet a ete recree depuis la cuisson : nouvel identifiant, meme nom */
const prepa=()=>{
  S.inv={frigo:[{id:'poulet_neuf',name:'Blanc de poulet',qty:1000,unit:'g'},{id:'riz_t',name:'Riz basmati',qty:500,unit:'g'},
    {id:'yaourts',name:'Yaourts 0% fruits',qty:4,unit:'pcs'},{id:'skyr_g',name:'Skyr',qty:900,unit:'g',pkg:{size:150}}],
    placards:[],congelateur:[],epices:[]};
  S.dayMeals={};S.displayDate=J;
  S.dayMeals[J]=[{rid:'x_cuisine',mult:1,name:'Poulet riz',macros:{kcal:600,prot:50,gluc:70,lip:10},
    ings:[{id:'poulet_ancien',n:'Blanc de poulet',name:'Blanc de poulet',qty:200,unit:'g'},{id:'riz_t',n:'Riz basmati',name:'Riz basmati',qty:80,unit:'g'}]}];
};
const q=id=>S.inv.frigo.find(i=>i.id===id).qty;

console.log('\n=== LXXIII. Copier un repas : le stock suit, meme recherche qu\'a la cuisson ===');
t('*** copie vers apres-demain : retire tout de suite, y compris un article recree depuis (retrouve par son nom) ***',()=>{
  prepa();X("copyMealTo(S.today,0,'"+J2+"')");
  eq(q('poulet_neuf'),800,'poulet (ancien identifiant, retrouve par le nom)');eq(q('riz_t'),420,'riz');
  eq((S.dayMeals[J2]||[]).length,1,'repas copie');
});
t('copie du jour entier : meme chose',()=>{
  prepa();X("copyDayTo('"+J2+"')");eq(q('poulet_neuf'),800);eq(q('riz_t'),420);
});
t('*** supprimer le repas copie rend le stock (le poulet aussi) ***',()=>{
  prepa();X("copyMealTo(S.today,0,'"+J2+"')");
  X("_mealStock(S.dayMeals['"+J2+"'][0],1)");eq(q('poulet_neuf'),1000);eq(q('riz_t'),500);
});
t('« Refaire un repas habituel » retire aussi par le nom',()=>{
  prepa();X("refaireRepas(S.today,0)");eq(q('poulet_neuf'),800);eq(q('riz_t'),420);
});
t('stock illimite : rien ne bouge ; article introuvable : rien ne casse',()=>{
  prepa();S.inv.frigo[0].qty=null;S.dayMeals[J][0].ings.push({id:'disparu',n:'Truffe',qty:5});
  X("copyMealTo(S.today,0,'"+J2+"')");eq(q('poulet_neuf'),null);eq(q('riz_t'),420);
});
t('*** dessert : meme quantite qu\'a la cuisson (un pot d\'un article en grammes = le poids d\'un pot) ***',()=>{
  prepa();S.dayMeals[J][0].dessert='yaourt';X("copyMealTo(S.today,0,'"+J2+"')");eq(q('yaourts'),3,'1 yaourt a la piece');
  const d={inv:'skyr_g',n:'Skyr',qty:1};eq(X('dessertDeductQty')(S.inv.frigo.find(i=>i.id==='skyr_g'),d),150,'pot de 150 g');
});
t('repas hors inventaire (ni ingredients ni recette) : rien n\'est retire',()=>{
  prepa();S.dayMeals[J]=[{rid:'_free_1',mult:1,name:'Kebab',macros:{kcal:900,prot:40,gluc:80,lip:45}}];
  X("copyMealTo(S.today,0,'"+J2+"')");eq(q('poulet_neuf'),1000);eq(q('riz_t'),500);
});

console.log('---- '+pass+' ok, '+fail+' KO');
