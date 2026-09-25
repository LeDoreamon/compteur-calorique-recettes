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
  if(!/Activité du jour/.test(h))throw new Error('section absente');
  if(!/12\s?000 pas/.test(h.replace(/\u202f|\u00a0/g,' ')))throw new Error('pas non affiches');
  if(!/Muscu/.test(h))throw new Error('activite non listee');
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
  if(!/fill="#8FA8B8"/.test(src))throw new Error('frigo non colore');
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

console.log('\n=== FM. Pas de clignotement au demarrage ===');
t('*** l\'etat par defaut pointe deja sur l\'accueil ***',()=>{
  if(!/mainTab:'accueil'/.test(src))
    throw new Error('un premier rendu aurait lieu sur un autre onglet');
  if(/mainTab:'recipes'/.test(src))throw new Error('valeur par defaut encore sur les recettes');
});
t('le choix de profil confirme l\'accueil',()=>{
  const i=src.indexOf('function selectProfile');
  if(!/S\.mainTab='accueil'/.test(src.slice(i,i+700)))throw new Error('selectProfile pointe ailleurs');
});
t('l\'onglet initial du bac a sable est bien l\'accueil',()=>{
  eq(sb.S.mainTab,'accueil');
});
console.log('\n---- total '+pass+' ok, '+fail+' KO ----');

console.log('\n=== FM. Arrivee sur l\'accueil, sans clignotement ===');
t('*** l\'accueil est rendu avant que le calque ne se leve ***',()=>{
  const i=src.indexOf('function selectProfile');
  const b=src.slice(i,i+700);
  const iRender=b.indexOf('render();');
  const iCalque=b.indexOf("profile-screen').style.display='none'");
  if(iRender<0)throw new Error('aucun rendu avant');
  if(iCalque<0)throw new Error('calque introuvable');
  if(iRender>iCalque)throw new Error('le calque se leve avant le rendu : l\'onglet precedent se voit');
});
t('l\'onglet vise est bien l\'accueil',()=>{
  const i=src.indexOf('function selectProfile');
  const b=src.slice(i,i+700);
  if(b.indexOf("S.mainTab='accueil'")<0)throw new Error('mainTab non pose');
  if(b.indexOf("S.mainTab='accueil'")>b.indexOf('render();'))
    throw new Error('rendu avant que l\'onglet soit choisi');
});
t('*** aucune animation de transition a l\'arrivee ***',()=>{
  const i=src.indexOf('function selectProfile');
  if(!/_lastMainTab='';_lastMealTab='';_lastDay='';/.test(src.slice(i,i+700)))
    throw new Error('les reperes d\'animation ne sont pas remis a zero');
});
t('le rendu final suit le chargement des donnees',()=>{
  const i=src.indexOf('function selectProfile');
  if(!/loadState\(\)\.then\(\(\)=>render\(\)\)/.test(src.slice(i,i+700)))
    throw new Error('pas de rendu apres chargement');
});
t('*** un seul onglet est rendu, l\'accueil ***',()=>{
  const vus=[];
  const vrai=sb.window.render;
  sb.window.render=function(){vus.push(S.mainTab);return vrai.apply(null,arguments);};
  S.inv={frigo:[],placards:[],congelateur:[],epices:[]};
  try{G('selectProfile')('liam');}finally{sb.window.render=vrai;}
  if(!vus.length)throw new Error('aucun rendu');
  const autres=vus.filter(function(x){return x!=='accueil';});
  if(autres.length)throw new Error('onglets intermediaires : '+autres.join(', '));
});
console.log('\n---- total '+pass+' ok, '+fail+' KO ----');

console.log('\n=== FR. Activite detaillee sur l\'accueil ===');
function poseJour(kcal,steps,acts){
  S.inv={frigo:[],placards:[],congelateur:[],epices:[]};
  S.dayMeals[S.today]=kcal?[{rid:'x',name:'Repas',mult:1,slot:'lunch',
    macros:{kcal:kcal,prot:60,gluc:100,lip:30}}]:[];
  G('__setBurn')(steps||acts?{[S.today]:{steps:steps||0,activities:acts||[]}}:{});
}
t('*** les pas sont affiches avec leur apport ***',()=>{
  poseJour(2226,12400,[]);
  const h=G('renderAccueil')();
  if(!/12\s?400 pas/.test(h.replace(/\u202f|\u00a0/g,' ')))throw new Error('pas absents');
  if(!/Activité du jour/.test(h))throw new Error('section absente');
});
t('*** chaque activite est listee par son nom ***',()=>{
  poseJour(2226,8000,[{kcal:300,n:'Muscu'},{kcal:180,n:'Vélo'}]);
  const h=G('renderAccueil')();
  if(!/Muscu/.test(h))throw new Error('Muscu absente');
  if(!/Vélo/.test(h))throw new Error('Vélo absente');
  if(!/300 kcal/.test(h))throw new Error('calories de l\'activite absentes');
});
t('une activite sans nom reste lisible',()=>{
  poseJour(2000,0,[{kcal:250}]);
  const h=G('renderAccueil')();
  if(/undefined/.test(h))throw new Error('nom manquant mal gere');
  if(!/Activité<\/span>/.test(h))throw new Error('libelle de repli absent');
});
t('aucune section sans activite enregistree',()=>{
  poseJour(2000,0,[]);
  const h=G('renderAccueil')();
  if(/Activité du jour/.test(h))throw new Error('section affichee a tort');
});

console.log('\n=== FS. Marge avec l\'activite ===');
// Decision du 25/09/2026 : en seche, l'activite ne s'ajoute pas a la cible
// (elle creuse le deficit) ; en maintien et en prise, elle est a compenser.
t('*** seche : pas de marge « avec l\'activite », le deficit se creuse ***',()=>{
  S.profil={objectif:'perte'};poseJour(2226,12400,[{kcal:300,n:'Muscu'}]);
  const h=G('renderAccueil')();
  if(!/creusent ton déficit du jour/.test(h))throw new Error('message seche absent');
  if(/Activité à compenser/.test(h))throw new Error('marge affichee en seche');
});
t('*** maintien : la marge vaut cible plus depense moins consomme ***',()=>{
  S.profil={objectif:'maintien'};poseJour(2226,12400,[{kcal:300,n:'Muscu'}]);
  const b=sb.getBurn(S.today);
  const attendu=Math.round(sb.TARGETS.kcal+b.total-2226);
  const h=G('renderAccueil')();
  if(h.indexOf(attendu+' kcal')<0)throw new Error('marge attendue '+attendu+' absente du rendu');
});
t('*** un depassement est annonce comme tel (hors seche) ***',()=>{
  S.profil={objectif:'prise'};poseJour(4000,0,[{kcal:100,n:'Marche'}]);
  const h=G('renderAccueil')();
  if(!/−\d+ kcal/.test(h))throw new Error('depassement non signale');
});
t('*** le tracker n\'affiche plus de « Balance » ***',()=>{
  if(/Balance : /.test(src))throw new Error('l\'ancienne balance subsiste');
});
t('*** tracker : marge avec l\'activite hors seche, deficit en seche ***',()=>{
  const i=src.indexOf("Avec l'activité");
  if(i<0)throw new Error('libelle absent');
  const b=src.slice(i-700,i);
  if(!/_cibleDuJour\(dd\)-m\.kcal/.test(b))throw new Error('formule incorrecte');
  if(!/en plus de ton déficit/.test(b))throw new Error('branche seche absente');
});
t('la marge du tracker et celle de l\'accueil passent par la meme cible du jour',()=>{
  if(src.indexOf('_cibleDuJour(dd)-m.kcal')<0||src.indexOf('_cibleDuJour(jour)-m.kcal')<0)throw new Error('une des deux formules est absente');
  S.profil=null;
});
t('rien ne s\'affiche sans depense',()=>{
  poseJour(2000,0,[]);
  const i=src.indexOf("if(!b||!b.total)return ''");
  if(i<0)throw new Error('garde absente : la ligne s\'afficherait a vide');
});
console.log('\n---- total '+pass+' ok, '+fail+' KO ----');
