const {sb}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
const etat=()=>({dayMeals:{},inv:{frigo:[
  {id:'av',name:'Avocats',qty:0,unit:'pc',pieceG:150,mac100:{kcal:160,prot:2,gluc:8,lip:14.7},macPiece:{kcal:240,prot:3,gluc:12,lip:22}},
  {id:'oe',name:'Oeufs',qty:17,unit:'pcs',pieceG:55,mac100:{kcal:131,prot:11.5,gluc:0.7,lip:8.7},macPiece:{kcal:72,prot:6.3,gluc:0.4,lip:4.8}},
  {id:'cr',name:'Crème fraîche légère',qty:0,unit:'g',mac100:{kcal:167,prot:2.8,gluc:5,lip:15}}],
  congelateur:[],placards:[
  {id:'pc',name:'Pâtes complètes',qty:1800,unit:'g',mac100:{kcal:342,prot:12,gluc:65,lip:2,fib:9}},
  {id:'fl',name:"Flocons d'avoine",qty:240,unit:'g',mac100:{kcal:372,prot:13,gluc:59,lip:7}},
  {id:'zz',name:'Truc inconnu',qty:10,unit:'g',mac100:{kcal:100,prot:1,gluc:1,lip:1}}],epices:[]}});

console.log('\n=== XIV. Fibres de l\'inventaire ===');
t('*** chaque article reconnu recoit ses fibres, a 0 g compris ***',()=>{
  X('_etatCorrige=false;');sb._applyState(etat());
  eq(X("findItem('av').mac100.fib"),6.7);eq(X("findItem('av').macPiece.fib"),10.1,'150 g a 6,7');
  eq(X("findItem('oe').mac100.fib"),0,'0 connu, pas inconnu');eq(X("findItem('oe').macPiece.fib"),0);
  eq(X("findItem('cr').mac100.fib"),0);eq(X("findItem('fl').mac100.fib"),10);
  eq(X('_etatCorrige'),true,'etat a reenregistrer');
});
t('une valeur deja saisie n\'est pas ecrasee',()=>{sb._applyState(etat());eq(X("findItem('pc').mac100.fib"),9);});
t('un article hors table n\'est pas touche',()=>{sb._applyState(etat());eq(X("typeof findItem('zz').mac100.fib"),'undefined');});
t('*** une seule fois : un champ vide ensuite reste vide ***',()=>{
  const e=etat();e.fibInv=true;sb._applyState(e);
  eq(X("typeof findItem('av').mac100.fib"),'undefined');eq(X('S.fibInv'),true);
});
t('le drapeau part avec l\'etat enregistre',()=>{
  const i=src.indexOf('async function _saveStateNow');if(src.slice(i,i+6000).indexOf('fibInv:S.fibInv')<0)throw new Error('fibInv absent');
});
t('la table couvre les 99 articles et reste dans 0-40 g/100 g',()=>{
  const k=X('Object.keys(FIBRES_INVENTAIRE)');eq(k.length,99);
  k.forEach(n=>{const v=X('FIBRES_INVENTAIRE')[n];if(!(v>=0&&v<=40))throw new Error(n+' : '+v);if(X('normMac')(n)!==n)throw new Error('cle non normalisee '+n);});
});
t('deconnexion a gauche du nom, reglages a droite',()=>{
  const i=src.indexOf('<div class="apphead">'),b=src.slice(i,i+1500);
  const d=b.indexOf('title="Se déconnecter"'),n=b.indexOf('${_nomAffiche()}'),r=b.indexOf('openSettings()');
  if(!(d>0&&d<n&&n<r))throw new Error('ordre '+d+' '+n+' '+r);
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
