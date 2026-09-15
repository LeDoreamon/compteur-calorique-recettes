const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');
const INV=require('./data/inv.json');

function stock(){
  const c={frigo:[],placards:[],congelateur:[],epices:[]};
  Object.keys(INV).forEach(function(k){
    const it=INV[k];const o={id:it.id,name:it.n,unit:it.u,qty:(it.q===-1?null:it.q)};
    if(it.piece)o.macPiece={kcal:it.piece[0],prot:it.piece[1],gluc:it.piece[2],lip:it.piece[3]};
    else o.mac100={kcal:it.m[0],prot:it.m[1],gluc:it.m[2],lip:it.m[3]};
    if(it.pieceG)o.pieceG=it.pieceG;
    c.placards.push(o);
  });
  S.inv=c;S.dayMeals[S.today]=[];
}
function repas(slot,kcal,prot){
  S.dayMeals[S.today].push({rid:'r'+slot,name:slot,mult:1,slot:slot,
    macros:{kcal:kcal,prot:prot,gluc:40,lip:15}});
}

console.log('\n=== FD. Ordre des repas ===');
t('*** journee vierge : on commence par le petit-dejeuner ***',()=>{
  stock();
  eq(G('prochainMoment')(S.today).id,'breakfast');
});
t('*** petit-dejeuner pris : on passe au dejeuner ***',()=>{
  stock();repas('breakfast',460,35);
  eq(G('prochainMoment')(S.today).id,'lunch');
});
t('*** un diner deja loggé ne fait pas sauter le dejeuner ***',()=>{
  stock();repas('breakfast',460,35);repas('dinner',800,60);
  eq(G('prochainMoment')(S.today).id,'lunch','doit revenir au dejeuner manquant');
});
t('*** la collation ne vient qu\'en dernier ***',()=>{
  stock();repas('breakfast',400,30);repas('lunch',700,60);repas('dinner',700,60);
  eq(G('prochainMoment')(S.today).id,'snack');
});
t('un petit-dejeuner oublie revient en premier',()=>{
  stock();repas('lunch',700,60);repas('dinner',700,60);
  eq(G('prochainMoment')(S.today).id,'breakfast');
});
t('les quatre moments couverts : plus rien a proposer',()=>{
  stock();['breakfast','lunch','dinner','snack'].forEach(function(s){repas(s,400,30);});
  eq(G('prochainMoment')(S.today),null);
});
t('un repas sans moment ne compte pour aucun',()=>{
  stock();
  S.dayMeals[S.today].push({rid:'x',name:'Sans moment',mult:1,macros:{kcal:500,prot:30,gluc:40,lip:15}});
  eq(G('prochainMoment')(S.today).id,'breakfast');
});

console.log('\n=== FE. Ce qu\'il reste ===');
t('*** journee vierge : tout reste a couvrir ***',()=>{
  stock();
  const r=G('resteDuJour')(S.today);
  eq(r.kcal,sb.TARGETS.kcal);eq(r.prot,sb.TARGETS.prot);
});
t('le reste diminue avec les repas',()=>{
  stock();repas('breakfast',460,35);
  const r=G('resteDuJour')(S.today);
  eq(r.kcal,sb.TARGETS.kcal-460);eq(r.prot,sb.TARGETS.prot-35);
});
t('*** un depassement ne donne jamais de reste negatif ***',()=>{
  stock();repas('breakfast',5000,300);
  const r=G('resteDuJour')(S.today);
  eq(r.kcal,0);eq(r.prot,0);
});

console.log('\n=== FF. Suggestions ===');
t('*** les recettes proposees correspondent au moment ***',()=>{
  stock();
  const s=G('suggestionsAccueil')(S.today,3);
  if(!s.recettes.length)throw new Error('aucune suggestion');
  s.recettes.forEach(function(x){
    if(x.r.slots.indexOf('breakfast')<0)throw new Error(x.r.name+' n\'est pas un petit-dejeuner');
  });
});
t('*** apres le petit-dejeuner, ce sont des plats ***',()=>{
  stock();repas('breakfast',460,35);
  const s=G('suggestionsAccueil')(S.today,3);
  s.recettes.forEach(function(x){
    if(x.r.slots.indexOf('lunch')<0)throw new Error(x.r.name+' n\'est pas un dejeuner');
  });
});
t('*** rien qui fasse exploser le budget ***',()=>{
  stock();repas('breakfast',400,30);repas('lunch',700,60);repas('dinner',900,70);
  const s=G('suggestionsAccueil')(S.today,3);
  const r=G('resteDuJour')(S.today);
  if(s.recettes.length){
    const pire=Math.max.apply(null,s.recettes.map(function(x){return x.m.kcal;}));
    if(pire>r.kcal+400)throw new Error('propose '+pire+' kcal pour '+r.kcal+' restantes');
  }
});
t('seules les recettes realisables sont proposees',()=>{
  S.inv={frigo:[],placards:[],congelateur:[],epices:[]};S.dayMeals[S.today]=[];
  eq(G('suggestionsAccueil')(S.today,3).recettes.length,0,'stock vide : rien ne doit etre propose');
});
t('au plus le nombre demande',()=>{
  stock();
  eq(G('suggestionsAccueil')(S.today,2).recettes.length<=2,true);
});
t('aucune suggestion quand tout est couvert',()=>{
  stock();['breakfast','lunch','dinner','snack'].forEach(function(s){repas(s,400,30);});
  const s=G('suggestionsAccueil')(S.today,3);
  eq(s.moment,null);eq(s.recettes.length,0);
});

console.log('\n=== FG. Rendu de la page ===');
t('*** la page s\'affiche sans erreur ***',()=>{
  stock();
  const h=G('renderAccueil')();
  if(!h||h.length<400)throw new Error('rendu trop court');
  if(/NaN|undefined/.test(h))throw new Error(h.slice(0,200));
});
t('le bloc macros du jour est present',()=>{
  const h=G('renderAccueil')();
  ['Objectif du jour','Protéines','Glucides','Lipides'].forEach(function(x){
    if(h.indexOf(x)<0)throw new Error(x+' absent');
  });
});
t('*** les macros affichees sont celles du jour seul ***',()=>{
  stock();repas('breakfast',460,35);
  const h=G('renderAccueil')();
  if(h.indexOf('35/'+sb.TARGETS.prot)<0)throw new Error('proteines du jour absentes');
});
t('le prochain repas est annonce',()=>{
  stock();
  const h=G('renderAccueil')();
  if(!/Prochain repas/.test(h))throw new Error('bloc absent');
  if(!/Petit déjeuner/.test(h))throw new Error('moment absent');
});
t('les suggestions sont cliquables',()=>{
  stock();
  const h=G('renderAccueil')();
  if(!/data-action="go-recipe"/.test(h))throw new Error('non cliquables');
});
t('*** l\'activite du jour est proposee ***',()=>{
  const h=G('renderAccueil')();
  if(!/data-action="open-burn"/.test(h))throw new Error('bouton absent');
});
t('la depense s\'affiche une fois enregistree',()=>{
  stock();
  G('__setBurn')({[S.today]:{steps:12000,activities:[{kcal:300,n:'Muscu'}]}});
  const h=G('renderAccueil')();
  if(!/kcal<\/span> dépensés/.test(h))throw new Error('depense non affichee');
  if(!/12\s?000 pas/.test(h.replace(/\u202f|\u00a0/g,' ')))throw new Error('pas non affiches');
  G('__setBurn')({});
});
t('aucune ligne de depense si rien n\'est enregistre',()=>{
  stock();G('__setBurn')({});
  if(/dépensés/.test(G('renderAccueil')()))throw new Error('ligne affichee a tort');
});

console.log('\n=== FH. Integration ===');
t('*** l\'accueil est le premier onglet ***',()=>{
  if(!/\['accueil','\\ud83c\\udfe0','Accueil'\]/.test(src))throw new Error('onglet absent');
  const i=src.indexOf("const _BNAV=[");
  const b=src.slice(i,i+120);
  if(b.indexOf('accueil')>b.indexOf('recipes'))throw new Error('accueil n\'est pas en premier');
});
t('on arrive sur l\'accueil au choix du profil',()=>{
  if(!/S\.mainTab='accueil'/.test(src))throw new Error('arrivee ailleurs');
});
t('l\'ordre de navigation inclut l\'accueil',()=>{
  if(!/_NAVORDER=\['accueil'/.test(src))throw new Error('absent de l\'ordre');
});
t('*** l\'icone de l\'inventaire est un frigo dessine ***',()=>{
  if(!/ICONE_FRIGO/.test(src))throw new Error('icone absente');
  if(!/<rect x="5.5" y="2.5"/.test(src))throw new Error('trace absent');
  if(/'inventory','\\ud83e\\uddca'/.test(src))throw new Error('glacon encore utilise');
});
t('ouvrir une suggestion mene a la recette',()=>{
  if(!/action==='go-recipe'/.test(src))throw new Error('action absente');
  const i=src.indexOf("action==='go-recipe'");
  const b=src.slice(i,i+260);
  if(!/S\.mainTab='recipes'/.test(b))throw new Error('ne change pas d\'onglet');
  if(!/S\.openRec=/.test(b))throw new Error('ne deplie pas la recette');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
