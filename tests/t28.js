const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=require('fs').readFileSync('index.html','utf8');

// Remplit la fiche article et enregistre
function fiche({base,kcal,prot,gluc,lip,unit,mode}){
  S.inv={frigo:[{id:'z',name:'Produit',qty:100,unit:unit||'g',mac100:{kcal:1,prot:1,gluc:1,lip:1}}],
         placards:[],congelateur:[],epices:[]};
  G('openItemDetail')('frigo','z');
  if(mode==='piece')G('setItemMacMode')('piece'); else G('setItemMacMode')('100');
  docEl('item-mac-base').value=(base===undefined?100:base);
  docEl('item-kcal').value=kcal;docEl('item-prot').value=prot;
  docEl('item-gluc').value=gluc;docEl('item-lip').value=lip;
  docEl('item-unit').value=unit||'g';
  docEl('item-pieceg').value='';docEl('item-pkg-size').value='';docEl('item-pkg-count').value='';
  docEl('item-dlc').value='';
  G('saveItemDetail')();
  return sb.findItem('z');
}

console.log('\n=== CY. Saisie sur une autre base ===');
t('*** base 30 g : les valeurs sont ramenees a 100 ***',()=>{
  // etiquette « par 30 g : 150 kcal, 5 P, 20 G, 6 L »
  const it=fiche({base:30,kcal:150,prot:5,gluc:20,lip:6});
  eq(it.mac100.kcal,500,'150 x 100/30');
  eq(it.mac100.prot,16.7);
  eq(it.mac100.gluc,66.7);
  eq(it.mac100.lip,20);
});
t('*** base 100 : rien ne change ***',()=>{
  const it=fiche({base:100,kcal:240,prot:10,gluc:28,lip:9});
  eq(it.mac100.kcal,240);eq(it.mac100.prot,10);
});
t('base par defaut = 100',()=>{
  const it=fiche({kcal:240,prot:10,gluc:28,lip:9});
  eq(it.mac100.kcal,240);
});
t('base 250 ml (brique de lait)',()=>{
  const it=fiche({base:250,kcal:115,prot:8.5,gluc:12,lip:2.5,unit:'ml'});
  eq(it.mac100.kcal,46,'115 x 100/250');
  eq(it.mac100.prot,3.4);
});
t('base 45 g (portion de cereales)',()=>{
  const it=fiche({base:45,kcal:170,prot:4,gluc:34,lip:2});
  eq(it.mac100.kcal,377.8);
});
t('les macros servent ensuite au calcul d\'un repas',()=>{
  const it=fiche({base:30,kcal:150,prot:5,gluc:20,lip:6});
  eq(Math.round(sb.itemMealMacros(it,60).kcal),300,'60 g = 2 portions de 30');
});

console.log('\n=== CZ. Garde-fous ===');
t('base vide : traitee comme 100',()=>{
  S.inv={frigo:[{id:'z',name:'P',qty:1,unit:'g',mac100:{kcal:1,prot:1,gluc:1,lip:1}}],placards:[],congelateur:[],epices:[]};
  G('openItemDetail')('frigo','z');
  docEl('item-mac-base').value='';
  eq(G('baseMac')('item'),100);
});
t('base zero ou negative : traitee comme 100',()=>{
  docEl('item-mac-base').value='0';eq(G('baseMac')('item'),100);
  docEl('item-mac-base').value='-50';eq(G('baseMac')('item'),100);
});
t('base non numerique : traitee comme 100',()=>{
  docEl('item-mac-base').value='abc';eq(G('baseMac')('item'),100);
});
t('*** le mode « par piece » ignore la base ***',()=>{
  const it=fiche({base:30,kcal:78,prot:6.5,gluc:0.6,lip:5.5,unit:'pcs',mode:'piece'});
  if(it.macPiece)eq(it.macPiece.kcal,78,'valeur par piece inchangee');
});
t('la base est remise a 100 a chaque ouverture',()=>{
  S.inv={frigo:[{id:'z',name:'P',qty:1,unit:'g',mac100:{kcal:1,prot:1,gluc:1,lip:1}}],placards:[],congelateur:[],epices:[]};
  G('openItemDetail')('frigo','z');
  docEl('item-mac-base').value=30;
  G('openItemDetail')('frigo','z');
  eq(docEl('item-mac-base').value,100);
});

console.log('\n=== DA. Apercu de conversion ===');
t('*** l\'apercu montre le resultat pour 100 ***',()=>{
  S.inv={frigo:[{id:'z',name:'P',qty:1,unit:'g',mac100:{kcal:1,prot:1,gluc:1,lip:1}}],placards:[],congelateur:[],epices:[]};
  G('openItemDetail')('frigo','z');
  G('setItemMacMode')('100');
  docEl('item-mac-base').value=30;
  docEl('item-kcal').value=150;docEl('item-prot').value=5;
  docEl('item-gluc').value=20;docEl('item-lip').value=6;
  G('majApercuBase')('item');
  const el=docEl('item-mac-apercu');
  eq(el.style.display,'block','affiche');
  if(!/500 kcal/.test(el.textContent))throw new Error(el.textContent);
  if(!/16\.7 P/.test(el.textContent))throw new Error(el.textContent);
});
t('aucun apercu quand la base vaut 100',()=>{
  docEl('item-mac-base').value=100;
  G('majApercuBase')('item');
  eq(docEl('item-mac-apercu').style.display,'none');
});
t('l\'apercu tolere des champs vides',()=>{
  docEl('item-mac-base').value=30;
  docEl('item-kcal').value='';
  G('majApercuBase')('item');
  const txt=docEl('item-mac-apercu').textContent;
  if(/NaN|undefined/.test(txt))throw new Error(txt);
});
t('le champ est masque en mode piece',()=>{
  G('setItemMacMode')('piece');
  eq(docEl('item-mac-base').style.display,'none');
  G('setItemMacMode')('100');
  if(docEl('item-mac-base').style.display==='none')throw new Error('reste masque');
});

console.log('\n=== DB. Structure ===');
t('le champ existe dans le HTML',()=>{
  if(!/id="item-mac-base"/.test(src))throw new Error('champ absent');
  if(!/value="100"/.test(src.slice(src.indexOf('id="item-mac-base"')-10,src.indexOf('id="item-mac-base"')+200)))
    throw new Error('defaut non fixe a 100');
});
t('le libelle reste « Valeurs pour »',()=>{
  if(!/>Valeurs pour</.test(src))throw new Error('libelle modifie');
});
t('la saisie declenche l\'apercu',()=>{
  if(!/oninput="majApercuBase\('item'\)"/.test(src))throw new Error('apercu non rafraichi');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
