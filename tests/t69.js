const {sb,docEl}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
console.log('\n=== XIX. Photo : choix avant l\'appareil ===');
t('*** la photo demande d\'abord si le repas vient de l\'inventaire ***',()=>{
  X('_loaded=true;S.today="2026-10-02";S.displayDate=S.today;');
  let clics=0;docEl('addmeal-photo-input').click=()=>{clics++;};
  X("openAddMeal('photo')");
  eq(docEl('addmeal-photo-choix').style.display,'block','question absente');eq(docEl('addmeal-input').style.display,'none');
  eq(clics,0,'appareil ouvert avant le choix');
  X('choixPhotoRepas(false)');eq(X('_addMealUseStock'),false);eq(clics,1);eq(docEl('addmeal-input').style.display,'block');
  X("openAddMeal('photo');choixPhotoRepas(true)");eq(X('_addMealUseStock'),true);eq(clics,2);
});
t('le mode texte n\'affiche pas la question',()=>{X("openAddMeal('text')");eq(docEl('addmeal-photo-choix').style.display,'none');eq(docEl('addmeal-input').style.display,'block');});
t('les deux reponses sont des boutons a geste direct',()=>{
  if(!/onclick="choixPhotoRepas\(true\)"/.test(src)||!/onclick="choixPhotoRepas\(false\)"/.test(src))throw new Error('boutons');
});
console.log('\n=== XIXB. Fiche article : scanner pour les macros ===');
function fiche(it){X("S.inv={frigo:["+JSON.stringify(it)+"],congelateur:[],placards:[],epices:[]};");X("openItemDetail('frigo','"+it.id+"')");}
t('*** bouton de scan dans la fiche, a cote de la recherche IA ***',()=>{
  if(!/onclick="openScanner\('item'\)"/.test(src))throw new Error('bouton absent');
  if(!/else if\(_scanMode==='item'\)\{appliquerScanFiche\(/.test(src))throw new Error('aiguillage');
});
t('*** article au poids : macros pour 100 g importees, passees en manuel ***',()=>{
  fiche({id:'yb',name:'Yaourt',qty:500,unit:'g',mac100:{kcal:1,prot:1,gluc:1,lip:1}});
  X("appliquerScanFiche('Skyr nature',{kcal:62,prot:10.5,gluc:4,lip:0.2,fib:0},'450 g')");
  eq(docEl('item-kcal').value,62);eq(docEl('item-prot').value,10.5);eq(docEl('item-fib').value,0);
  eq(X('_macSrc.item'),'manual');eq(X('_macManual.item.kcal'),62);
  if(!/importées \(pour 100 g\/ml\)/.test(docEl('item-scan-st').textContent))throw new Error('message');
});
t('*** article a la piece : converti pour une piece si son poids est connu ***',()=>{
  fiche({id:'oe',name:'Oeufs',qty:6,unit:'pcs',pieceG:55,macPiece:{kcal:70,prot:6,gluc:0,lip:5},mac100:{kcal:127,prot:11,gluc:0,lip:9}});
  docEl('item-mac-pieceg').value='55';
  X("appliquerScanFiche('Oeufs plein air',{kcal:140,prot:12.6,gluc:0.6,lip:9.8},'')");
  eq(docEl('item-kcal').value,77);eq(docEl('item-prot').value,6.9);
  if(!/une pièce de 55 g/.test(docEl('item-scan-st').textContent))throw new Error('message piece');
});
t('scan via OpenFoodFacts en mode fiche : la fiche est remplie',async()=>{
  fiche({id:'yb',name:'Yaourt',qty:500,unit:'g',mac100:{kcal:1,prot:1,gluc:1,lip:1}});
  const vrai=sb.fetch;sb.fetch=async()=>({ok:true,status:200,json:async()=>({status:1,product:{product_name:'Skyr',nutriments:{'energy-kcal_100g':62,proteins_100g:10,carbohydrates_100g:4,fat_100g:0.2}}})});
  try{X("_scanMode='item'");await X('lookupBarcode')('3017620422003');}finally{sb.fetch=vrai;}
  eq(docEl('item-kcal').value,62);
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
