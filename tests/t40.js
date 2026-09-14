const {sb}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');
const cleFB=G('_cleFB'),assainir=G('_assainirCles');

console.log('\n=== EQ. Caracteres interdits par Firebase ===');
t('*** le slash est remplace ***',()=>{
  if(/\//.test(cleFB('citron / citron vert')))throw new Error(cleFB('citron / citron vert'));
});
t('le point aussi',()=>{if(/\./.test(cleFB('creme 5.5%')))throw new Error(cleFB('creme 5.5%'));});
t('le dollar, le diese et les crochets aussi',()=>{
  ['$','#','[',']'].forEach(function(c){
    if(cleFB('a'+c+'b').indexOf(c)>=0)throw new Error(c+' conserve');
  });
});
t('les caracteres de controle sont retires',()=>{
  eq(cleFB('a\u0001b'),'ab');
});
t('les caracteres legitimes survivent',()=>{
  eq(cleFB('the vert | noir'),'the vert | noir');
  eq(cleFB('boeuf hache (450g a 5% mg)'),'boeuf hache (450g a 5% mg)');
});
t('entree vide ou nulle',()=>{eq(cleFB(''),'');eq(cleFB(null),'');});

console.log('\n=== ER. Assainissement recursif ===');
t('*** une cle invalide est corrigee en profondeur ***',()=>{
  const o=assainir({'citron / vert':1,ok:{'a.b':2}});
  if(Object.keys(o).some(k=>/\//.test(k)))throw new Error('slash restant');
  if(Object.keys(o.ok).some(k=>/\./.test(k)))throw new Error('point restant en profondeur');
});
t('les valeurs ne sont pas touchees',()=>{
  const o=assainir({a:{nom:'Citron / Citron vert',n:12}});
  eq(o.a.nom,'Citron / Citron vert','la valeur a ete modifiee');
  eq(o.a.n,12);
});
t('les tableaux sont conserves',()=>{
  const o=assainir({l:[{x:1},{y:2}]});
  if(!Array.isArray(o.l))throw new Error('tableau perdu');
  eq(o.l.length,2);
});
t('les dates de dayMeals restent intactes',()=>{
  const o=assainir({dayMeals:{'2026-09-12':[{rid:'a'}]}});
  if(!o.dayMeals['2026-09-12'])throw new Error('cle de date alteree');
});
t('profondeur excessive : pas de boucle infinie',()=>{
  var o={};var c=o;for(var i=0;i<20;i++){c.s={};c=c.s;}
  assainir(o);
});
t('valeurs nulles ou primitives',()=>{assainir(null);assainir(5);assainir('x');});

console.log('\n=== ES. Cles construites par l\'app ===');
t('*** une exclusion de rachat produit une cle valide ***',()=>{
  S.inv={frigo:[{id:'c',name:'Citron / Citron vert',qty:0,unit:'ml',mac100:{kcal:20,prot:0,gluc:5,lip:0}}],
         placards:[],congelateur:[],epices:[]};
  S.pasRacheter={};
  G('exclureDuRachat')('Citron / Citron vert');
  Object.keys(S.pasRacheter).forEach(function(k){
    if(/[.#$\/\[\]]/.test(k))throw new Error('cle invalide : '+k);
  });
});
t('l\'exclusion fonctionne malgre le nettoyage',()=>{
  S.inv={frigo:[{id:'c',name:'Citron / Citron vert',qty:0,unit:'ml',mac100:{kcal:20,prot:0,gluc:5,lip:0}}],
         placards:[],congelateur:[],epices:[]};
  S.pasRacheter={};S.shop={list:[],graveyard:[]};
  G('exclureDuRachat')('Citron / Citron vert');
  const s=G('shopSuggestions')();
  if(s.some(x=>/Citron/.test(x.name)))throw new Error('encore propose');
});
t('*** une paire ignoree produit une cle valide ***',()=>{
  S.paires0k={};
  G('ignorerVoisins')('Thé vert / noir','Thé vert');
  Object.keys(S.paires0k).forEach(function(k){
    if(/[.#$\/\[\]]/.test(k))throw new Error('cle invalide : '+k);
  });
});

console.log('\n=== ET. Etat deja corrompu ===');
t('*** les cles invalides sont nettoyees au chargement ***',()=>{
  sb._applyState({inv:{frigo:[]},dayMeals:{},
    pasRacheter:{'citron / vert':1},paires0k:{'a.b|c':1},ingNames:{'x/y':'Truc'}});
  [S.pasRacheter,S.paires0k,S.ingNames].forEach(function(o){
    Object.keys(o||{}).forEach(function(k){
      if(/[.#$\/\[\]]/.test(k))throw new Error('cle invalide conservee : '+k);
    });
  });
});
t('le contenu est preserve',()=>{
  sb._applyState({inv:{frigo:[]},dayMeals:{},ingNames:{'x/y':'Truc'}});
  eq(Object.values(S.ingNames)[0],'Truc');
});

console.log('\n=== EU. Filet a l\'enregistrement ===');
t('*** le payload est assaini avant envoi ***',()=>{
  const i=src.indexOf('var payload=JSON.stringify({');
  const b=src.slice(i,i+2600);
  if(!/_assainirCles\(JSON\.parse\(payload\)\)/.test(b))
    throw new Error('aucun assainissement avant envoi');
});
t('il precede l\'ecriture locale et distante',()=>{
  const iA=src.indexOf('_assainirCles(JSON.parse(payload))');
  const iL=src.indexOf("localStorage.setItem(ACTIVE_PROFILE+'_st',payload)");
  if(iA<0||iL<0)throw new Error('reperes introuvables');
  if(iA>iL)throw new Error('assainissement apres l\'ecriture locale');
});
t('le message d\'erreur explique le 400',()=>{
  if(!/caractere interdit/.test(src))throw new Error('message non explicite');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
