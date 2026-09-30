const {sb,docEl}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
function prepa(){X(`_loaded=true;S.today='2026-09-30';S.mainTab='courses';S.coursesVoirAchetes=false;S.waiting=[];S.pasRacheter={};S.inv={frigo:[],congelateur:[],placards:[],epices:[]};
  S.shop={list:[{id:'a',name:'Lait',rayon:'laitier',checked:false},{id:'b',name:'Pâtes',rayon:'pates',checked:false},{id:'c',name:'Éponge',rayon:'menager',checked:false}],graveyard:[],graveRayons:[]};`);}
const it=id=>X("S.shop.list.find(function(i){return i.id==='"+id+"'})");
const vue=()=>X('renderCoursesHTML()');
console.log('\n=== XVIII. Courses facon Rappels ===');
t('*** cocher = panier : l\'article reste visible jusqu\'a la validation ***',()=>{
  prepa();X("toggleShopItem('a')");eq(it('a').checked,true);
  const h=vue();if(h.indexOf('Lait')<0||h.indexOf('dans le panier</span>')<0)throw new Error('masque trop tot');
  if(h.indexOf('Afficher les achetés')>=0)throw new Error('bouton sans achete');
  eq(X('S.waiting.length'),0,'part a ranger avant validation');
});
t('*** decocher un article du panier le remet a acheter ***',()=>{
  X("toggleShopItem('a')");eq(it('a').checked,false);if(vue().indexOf('dans le panier</span>')>=0)throw new Error('encore au panier');
});
t('*** valider : panier -> achete (masque, garde son rayon) + A ranger, sauf 🧾 et hors inventaire ***',()=>{
  prepa();X("toggleShopItem('a');toggleShopItem('b');toggleShopItem('c');toggleGraveItem('b');validateCourses()");
  eq(it('a').achete,'2026-09-30');eq(it('a').checked,false);eq(it('a').rayon,'laitier');
  eq(X('S.waiting.map(function(w){return w.name}).join()'),'Lait','seul le lait va a ranger');
  eq(X('S.shop.list.length'),3,'articles supprimes');
  if(vue().indexOf('class="shop-row"')>=0)throw new Error('achetes visibles');
  if(vue().indexOf('Rien d’autre à acheter')<0)throw new Error('message liste vide');
});
t('*** racheter : decocher un achete le remet sur la liste ***',()=>{
  if(vue().indexOf('Afficher les achetés')<0)throw new Error('bouton afficher');X('basculerAchetes()');const h=vue();if(h.indexOf('acheté le 30/09')<0||h.indexOf('Masquer les achetés')<0)throw new Error('date achat / bouton');
  X("toggleShopItem('a')");eq(it('a').achete,undefined);eq(it('a').checked,false);
  X('basculerAchetes()');if(vue().indexOf('Lait')<0)throw new Error('pas revenu');
});
t('ajouter un article deja achete le fait revenir, sans doublon',()=>{
  docEl('shop-add-name').value='pâtes';docEl('shop-add-rayon').value='pates';X('addShopItem()');
  eq(X('S.shop.list.length'),3);eq(it('b').achete,undefined);
});
t('suggestion de stock bas : un article achete n\'empeche pas la suggestion ni ne se duplique',()=>{
  prepa();X("toggleShopItem('a');validateCourses();S.inv.frigo=[{id:'l',name:'Lait',qty:0,unit:'ml'}]");
  if(!X('shopSuggestions()').some(s=>s.name==='Lait'))throw new Error('non suggere');
  X('_ajouterAuxCourses("Lait","laitier")');eq(X('S.shop.list.length'),3);eq(it('a').achete,undefined);
});
t('*** effacer les achetes (apres confirmation) ***',()=>{
  prepa();X("toggleShopItem('a');toggleShopItem('c');validateCourses();S.coursesVoirAchetes=true");
  if(vue().indexOf('Effacer les 2 articles achetés')<0)throw new Error('bouton');
  X('effacerAchetes()');eq(X('S.shop.list.map(function(i){return i.id}).join()'),'b');
});
t('*** migration : les anciens « Deja achetes » rejoignent leur rayon, masques ***',()=>{
  X(`S.shop={list:[{id:'x',name:'Riz',rayon:'pates',checked:false}],graveyard:[{id:'g1',name:'Lessive',rayon:'menager'},{id:'g2',name:'riz',rayon:'pates'}],graveRayons:[]};`);
  eq(X('_migrerDejaAchetes()'),true);eq(X('S.shop.graveyard.length'),0);
  eq(X('S.shop.list.length'),2,'doublon riz');const l=X("S.shop.list.find(function(i){return i.name==='Lessive'})");eq(l.achete,'avant');eq(l.rayon,'menager');
  eq(X('_migrerDejaAchetes()'),false,'relance');
  if(!/if\(_migrerDejaAchetes\(\)\)_etatCorrige=true;/.test(src))throw new Error('non appelee au chargement');
});
t('plus de liste « Deja achetes » a part',()=>{
  ['renderGraveyardHTML','regraveAdd','graveDelete','coursesGrave'].forEach(n=>{if(new RegExp('\\b'+n+'\\b').test(src))throw new Error(n);});
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
