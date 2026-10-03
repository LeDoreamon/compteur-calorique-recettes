const {sb}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
function inv(items){X("S.inv={frigo:"+JSON.stringify(items)+",congelateur:[],placards:[],epices:[]};S.shop={list:[],graveyard:[],graveRayons:[]};S.pasRacheter={}");}
const etat=id=>X("_stockBas(findItem('"+id+"'))");
const maj=()=>X('_majPleins()');

console.log('\n=== XXXIV. « Presque fini » selon le stock apres rachat ===');
t('*** un paquet tout juste range n\'est pas « presque fini » ***',()=>{
  inv([{id:'g',name:'Gnocchi',qty:500,unit:'g',pkg:{size:500}}]);maj();eq(etat('g'),null);
  if(X('shopSuggestions()').some(s=>s.name==='Gnocchi'))throw new Error('suggere');
});
t('*** consomme sous le quart du stock achete (et moins d\'un emballage) : « presque fini » ***',()=>{
  inv([{id:'g',name:'Gnocchi',qty:500,unit:'g',pkg:{size:500}}]);maj();
  X("findItem('g').qty=200");maj();eq(etat('g'),null,'40 %');
  X("findItem('g').qty=120");maj();eq(etat('g'),'presque fini','24 %');
  X("findItem('g').qty=0");maj();eq(etat('g'),'épuisé');
});
t('*** un rachat devient la nouvelle reference, meme plus petit que le precedent ***',()=>{
  inv([{id:'r',name:'Riz',qty:2000,unit:'g'}]);maj();
  X("findItem('r').qty=100");maj();eq(etat('r'),'presque fini');
  X("findItem('r').qty=600");maj();eq(X("findItem('r').plein"),600,'nouvelle reference');eq(etat('r'),null);
  X("findItem('r').qty=150");maj();eq(etat('r'),'presque fini','25 % de 600');
});
t('plusieurs emballages : tant qu\'il en reste un entier, pas de signal',()=>{
  inv([{id:'p',name:'Pâtes',qty:2000,unit:'g',pkg:{size:500}}]);maj();X("findItem('p').qty=500");maj();eq(etat('p'),null);
  X("findItem('p').qty=400");maj();eq(etat('p'),'presque fini');
});
t('pieces : 6 oeufs -> signal a 1',()=>{
  inv([{id:'o',name:'Oeufs',qty:6,unit:'pcs'}]);maj();X("findItem('o').qty=2");maj();eq(etat('o'),null);X("findItem('o').qty=1");maj();eq(etat('o'),'presque fini');
});
t('*** sans historique, un article deja bas reste signale (ancienne logique conservee) ***',()=>{
  inv([{id:'a',name:'Amandes',qty:50,unit:'g'},{id:'b',name:'Beurre',qty:60,unit:'g',pkg:{size:250}},{id:'b2',name:'Crème',qty:100,unit:'g',pkg:{size:250}},{id:'c',name:'Citrons',qty:1,unit:'pcs'}]);
  eq(etat('a'),'presque fini');eq(etat('b'),'presque fini');eq(etat('c'),'presque fini');
  eq(etat('b2'),null,'paquet entame a 40 % : plus signale');
  maj();eq(etat('a'),'presque fini','apres la premiere sauvegarde');
});
t('illimites et plats maison : jamais',()=>{
  inv([{id:'s',name:'Sel',qty:null,unit:''},{id:'pl',name:'Chili',qty:0.5,unit:'parts',plat:{parts:4}}]);maj();
  eq(etat('s'),null);eq(etat('pl'),null);eq(X("findItem('pl').plein"),undefined,'pas de reference sur un plat');
});
t('la sauvegarde met la reference a jour',()=>{
  if(!/try\{_majPleins\(\);\}catch\(e\)\{\}/.test(X('saveState.toString()')))throw new Error('non appele');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
