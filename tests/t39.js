const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');

function activia(){
  S.inv={frigo:[{id:'act',name:'Activia bifidus fruits 0% panaché 125 g x 12',
    qty:1,unit:'g',dessert:true,pkg:{size:125},
    mac100:{kcal:43,prot:3.7,gluc:7,lip:0.1}}],placards:[],congelateur:[],epices:[]};
}
// Passe l'article en macros par piece de 125 g
function passerEnPiece(pgValeur){
  G('openItemDetail')('frigo','act');
  G('setItemMacMode')('piece');
  docEl('item-kcal').value=54;docEl('item-prot').value=4.6;
  docEl('item-gluc').value=8.7;docEl('item-lip').value=0.1;
  const champ=docEl('item-mac-pieceg');
  champ.value=(pgValeur===undefined?125:pgValeur);
  docEl('item-unit').value='g';
  docEl('item-pkg-size').value='';docEl('item-pkg-count').value='';
  docEl('item-dlc').value='';
  G('saveItemDetail')();
  return sb.findItem('act');
}

console.log('\n=== EM. Conflit d\'identifiants ===');
t('*** les deux champs « poids par pièce » ont des identifiants distincts ***',()=>{
  eq((src.match(/id="item-pieceg"/g)||[]).length,1,'section Unite');
  eq((src.match(/id="item-mac-pieceg"/g)||[]).length,1,'mode macros');
});
t('l\'enregistrement lit le champ du mode macros en priorite',()=>{
  if(!/getElementById\('item-mac-pieceg'\)\|\|document\.getElementById\('item-pieceg'\)/.test(src))
    throw new Error('ordre de lecture incorrect');
});
t('*** le selecteur d\'unite n\'ecrase plus le mode piece ***',()=>{
  if(!/!\(_itemMacMode==='piece'&&\(_uEl\.value==='g'\|\|_uEl\.value==='ml'\)\)/.test(src))
    throw new Error('le bloc unite repasse derriere le bloc macros');
});
t('*** le poids saisi est bien enregistre ***',()=>{
  activia();
  eq(passerEnPiece(125).pieceG,125,'la saisie est perdue');
});
t('un poids absent retombe sur une valeur par defaut',()=>{
  activia();
  const it=passerEnPiece('');
  if(!(it.pieceG>0))throw new Error('pieceG invalide : '+it.pieceG);
});

console.log('\n=== EN. Conversion en pièces ===');
t('*** l\'unité bascule en pièces ***',()=>{
  activia();
  eq(passerEnPiece(125).unit,'pc','l\'unite reste au poids');
});
t('les macros par pièce sont conservées telles quelles',()=>{
  activia();
  const it=passerEnPiece(125);
  eq(it.macPiece.kcal,54);eq(it.macPiece.prot,4.6);
});
t('*** les macros pour 100 g sont recalculees depuis le poids ***',()=>{
  activia();
  const it=passerEnPiece(125);
  eq(it.mac100.kcal,43.2,'54 x 100 / 125');
});
t('*** un pot compte bien 54 kcal, pas 6750 ***',()=>{
  activia();
  const it=passerEnPiece(125);
  eq(Math.round(sb.itemMealMacros(it,1).kcal),54,'une piece');
  eq(Math.round(sb.itemMealMacros(it,12).kcal),648,'douze pots');
});

console.log('\n=== EO. Portion dessert ===');
t('*** l\'unite affichee suit le calcul reel ***',()=>{
  // etat incoherent herite : macros par piece mais unite en g
  S.inv={frigo:[{id:'x',name:'Activia',qty:1,unit:'g',dessert:true,
    macPiece:{kcal:54,prot:4.6,gluc:8.7,lip:0.1},
    mac100:{kcal:43,prot:3.7,gluc:7,lip:0.1}}],placards:[],congelateur:[],epices:[]};
  G('openItemDetail')('frigo','x');
  docEl('item-dessert-qty').value=1;
  G('updateItemDessertKcal')();
  eq(docEl('item-dessert-unit').textContent,'pc','devrait annoncer des pieces');
});
t('un article au poids garde son unite',()=>{
  S.inv={frigo:[{id:'y',name:'Compote',qty:500,unit:'g',dessert:true,
    mac100:{kcal:51,prot:0.5,gluc:12,lip:0.5}}],placards:[],congelateur:[],epices:[]};
  G('openItemDetail')('frigo','y');
  G('updateItemDessertKcal')();
  eq(docEl('item-dessert-unit').textContent,'g');
});
t('le calcul de la portion reste juste',()=>{
  S.inv={frigo:[{id:'z',name:'Compote',qty:500,unit:'g',dessert:true,
    mac100:{kcal:51,prot:0.5,gluc:12,lip:0.5}}],placards:[],congelateur:[],epices:[]};
  G('openItemDetail')('frigo','z');
  docEl('item-dessert-qty').value=125;
  G('updateItemDessertKcal')();
  if(!/64 kcal/.test(docEl('item-dessert-kcal').textContent))
    throw new Error(docEl('item-dessert-kcal').textContent);
});

console.log('\n=== EP. Signalement dans le diagnostic ===');
t('*** un article aux macros par piece et unite au poids est signale ***',()=>{
  S.inv={frigo:[{id:'w',name:'Activia',qty:12,unit:'g',
    macPiece:{kcal:54,prot:4.6,gluc:8.7,lip:0.1},
    mac100:{kcal:43,prot:3.7,gluc:7,lip:0.1}}],placards:[],congelateur:[],epices:[]};
  const d=sb.invIssues();
  const s=(d.suspects||[]).filter(x=>x.incoherent);
  if(!s.length)throw new Error('non signale');
  eq(s[0].it.id,'w');
});
t('le libelle explique l\'incoherence',()=>{
  S.diagOpen=1;
  const h=G('renderInvDiag')();
  if(!/macros par pièce, unité en g/.test(h))throw new Error(h.slice(0,300));
});
t('un article coherent n\'est pas signale',()=>{
  S.inv={frigo:[{id:'ok',name:'Oeufs',qty:12,unit:'pcs',pieceG:55,
    macPiece:{kcal:72,prot:6.3,gluc:0.4,lip:4.8},
    mac100:{kcal:131,prot:11,gluc:0.7,lip:8.7}}],placards:[],congelateur:[],epices:[]};
  const d=sb.invIssues();
  if((d.suspects||[]).some(x=>x.incoherent))throw new Error('signale a tort');
});
t('la detection des quantites douteuses fonctionne toujours',()=>{
  S.inv={frigo:[{id:'p',name:'Pizzas',qty:934,unit:'pcs',pieceG:467,
    mac100:{kcal:240,prot:10,gluc:28,lip:9}}],placards:[],congelateur:[],epices:[]};
  const d=sb.invIssues();
  const s=(d.suspects||[]).filter(x=>!x.incoherent);
  if(!s.length)throw new Error('quantite douteuse non detectee');
  eq(s[0].paquets,2);
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
