// Plats maison : retirer un plat en mode Modifier, comme un autre article (17/10/2026, demande de Liam)
const {sb}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const S=sb.S;
const prepa=()=>{
  S.inv={frigo:[{id:'pl_nuggets',name:'Pseudo Nuggets',qty:1,unit:'parts',pieceG:165,macPiece:{kcal:244,prot:30,gluc:12,lip:8},
    plat:{creeLe:S.today,parts:2,poidsEstime:330,ings:[]}},{id:'riz_t',name:'Riz',qty:500,unit:'g'}],placards:[],congelateur:[],epices:[]};
  S.deletedItems=[];
};
console.log('\n=== LXXI. Plats maison : retirer un plat ===');
t('*** mode Modifier : un ✕ rouge sur chaque plat, comme les autres articles ***',()=>{
  prepa();X('S.editMode=true');const h=X('renderPlatsMaison()');
  if(!/event\.stopPropagation\(\);deleteInvItem\('frigo','pl_nuggets'\)/.test(h))throw new Error('bouton absent');
  if(h.indexOf('Retirer ce plat')<0)throw new Error('libelle accessible');
});
t('hors mode Modifier : pas de bouton (rien de supprimable par megarde)',()=>{
  prepa();X('S.editMode=false');if(/deleteInvItem/.test(X('renderPlatsMaison()')))throw new Error('bouton visible hors edition');
});
t('*** retirer : le plat quitte la carte, les ingredients restent deduits, il passe dans « Recemment supprimes » ***',()=>{
  prepa();X("deleteInvItem('frigo','pl_nuggets')");
  if(S.inv.frigo.some(i=>i.id==='pl_nuggets'))throw new Error('toujours en stock');
  eq(S.inv.frigo.find(i=>i.id==='riz_t').qty,500,'autres articles inchanges');
  eq(X('_platsEnStock().length'),0,'carte vide');
  eq(S.deletedItems.length,1);eq(S.deletedItems[0].item.id,'pl_nuggets');
});
t('*** « Recemment supprimes » le remet tel quel dans la carte des plats ***',()=>{
  prepa();X("deleteInvItem('frigo','pl_nuggets')");X('restoreDeletedItem(0)');
  const p=X('_platsEnStock()');eq(p.length,1);eq(p[0].it.plat.parts,2,'plat intact');eq(p[0].it.qty,1);
});
X('S.editMode=false');
console.log('---- '+pass+' ok, '+fail+' KO');
