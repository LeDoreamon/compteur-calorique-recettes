const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');

function inv(){
  S.ingNames={};
  S.inv={frigo:[
    {id:'a',name:'Cremme fraiche',qty:400,unit:'g',mac100:{kcal:167,prot:2.8,gluc:5,lip:15}},
    {id:'b',name:'Poulet',qty:500,unit:'g',mac100:{kcal:165,prot:31,gluc:0,lip:4}}
  ],placards:[],congelateur:[],epices:[]};
}
function renommer(id,nouveau,cat){
  G('openItemDetail')(cat||'frigo',id);
  docEl('item-name').value=nouveau;
  docEl('item-unit').value='g';
  docEl('item-pieceg').value='';docEl('item-pkg-size').value='';docEl('item-pkg-count').value='';
  docEl('item-dlc').value='';
  const it=sb.findItem(id);
  docEl('item-kcal').value=it.mac100.kcal;docEl('item-prot').value=it.mac100.prot;
  docEl('item-gluc').value=it.mac100.gluc;docEl('item-lip').value=it.mac100.lip;
  G('saveItemDetail')();
  return sb.findItem(id);
}

console.log('\n=== EJ. Renommer un article ===');
t('*** le nom est un champ de saisie ***',()=>{
  if(!/<input id="item-name"/.test(src))throw new Error('toujours un div en lecture seule');
  if(/id="item-name"[^>]*textContent/.test(src))throw new Error('ecrit encore via textContent');
});
t('le champ se remplit a l\'ouverture',()=>{
  inv();
  G('openItemDetail')('frigo','a');
  eq(docEl('item-name').value,'Cremme fraiche');
});
t('*** la correction est enregistree ***',()=>{
  inv();
  eq(renommer('a','Crème fraîche légère').name,'Crème fraîche légère');
});
t('*** l\'identifiant ne change pas ***',()=>{
  inv();
  const it=renommer('a','Crème fraîche légère');
  eq(it.id,'a','les recettes pointent dessus');
});
t('les macros et la quantite survivent au renommage',()=>{
  inv();
  const it=renommer('a','Crème fraîche légère');
  eq(it.qty,400);eq(it.mac100.kcal,167);
});
t('un nom vide ne remplace pas l\'ancien',()=>{
  inv();
  eq(renommer('a','   ').name,'Cremme fraiche');
});
t('les espaces autour sont retires',()=>{
  inv();
  eq(renommer('a','  Crème fraîche  ').name,'Crème fraîche');
});
t('renommer sans changer le nom ne casse rien',()=>{
  inv();
  eq(renommer('a','Cremme fraiche').name,'Cremme fraiche');
});

console.log('\n=== EK. Coherence avec le reste ===');
t('*** le nom de repli suit le renommage ***',()=>{
  inv();
  S.ingNames={'a':'Cremme fraiche'};
  renommer('a','Crème fraîche légère');
  eq(S.ingNames['a'],'Crème fraîche légère','table des noms non mise a jour');
});
t('un article absent de la table n\'y est pas ajoute',()=>{
  inv();S.ingNames={};
  renommer('a','Crème fraîche légère');
  eq(Object.keys(S.ingNames).length,0);
});
t('*** l\'article reste retrouvable par son nouveau nom ***',()=>{
  inv();
  renommer('a','Crème fraîche légère');
  const it=sb.findItemByName('creme fraiche legere');
  if(!it)throw new Error('introuvable par le nouveau nom');
  eq(it.id,'a');
});
t('l\'ancien nom ne retrouve plus rien',()=>{
  inv();
  renommer('a','Crème fraîche légère');
  const it=sb.findItemByName('Cremme fraiche');
  if(it)throw new Error('encore trouvable par l\'ancien nom');
});

console.log('\n=== EL. Collision de noms ===');
t('*** renommer vers un nom deja pris demande confirmation ***',()=>{
  inv();
  const vrai=sb.confirm;let demande=false;
  sb.confirm=function(){demande=true;return true;};
  try{renommer('a','Poulet');}finally{sb.confirm=vrai;}
  if(!demande)throw new Error('aucune question posee');
});
t('refuser annule le renommage',()=>{
  inv();
  const vrai=sb.confirm;
  sb.confirm=function(){return false;};
  try{renommer('a','Poulet');}finally{sb.confirm=vrai;}
  eq(sb.findItem('a').name,'Cremme fraiche','le nom a change malgre le refus');
});
t('accepter conserve deux articles distincts',()=>{
  inv();
  const vrai=sb.confirm;
  sb.confirm=function(){return true;};
  try{renommer('a','Poulet');}finally{sb.confirm=vrai;}
  eq(S.inv.frigo.length,2,'les articles ont fusionne');
  eq(sb.findItem('a').name,'Poulet');
  eq(sb.findItem('b').name,'Poulet');
});
t('renommer vers son propre nom ne declenche rien',()=>{
  inv();
  const vrai=sb.confirm;let demande=false;
  sb.confirm=function(){demande=true;return true;};
  try{renommer('a','Cremme fraiche');}finally{sb.confirm=vrai;}
  eq(demande,false);
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
