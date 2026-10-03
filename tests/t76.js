const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
function prepa(){X(`S.today='2026-10-03';fermerReassort();closeWaitingItem();document.getElementById('reassort-overlay').style.display='none';document.getElementById('wait-overlay').style.display='none';
  S.inv={frigo:[{id:'lait',name:'Lait',qty:0,unit:'ml',mac100:{kcal:46,prot:3.2,gluc:4.8,lip:1.6},pkg:{size:1000},dlc:'2026-09-20'},
                {id:'ldm',name:'Lait demi-écrémé',qty:500,unit:'ml',mac100:{kcal:46,prot:3.2,gluc:4.8,lip:1.6}}],
         congelateur:[],placards:[{id:'riz',name:'Riz basmati',qty:200,unit:'g',mac100:{kcal:350,prot:8,gluc:77,lip:1}}],epices:[{id:'sel',name:'Sel',qty:null,unit:''}]};
  S.waiting=[];`);}
const nb=()=>X("Object.keys(S.inv).reduce(function(a,c){return a+S.inv[c].length},0)");
const att=(o)=>X("S.waiting.push("+JSON.stringify(o)+")");

console.log('\n=== XXX. Ranger : article deja en stock ===');
t('*** article epuise du meme nom : on ajoute la quantite, macros et reglages gardes, aucun doublon ***',()=>{
  prepa();att({id:'w1',name:'Lait',rayon:'laitiers'});const n0=nb();
  X("openWaitingItem('w1')");eq(docEl('reassort-overlay').style.display,'flex');eq(docEl('wait-overlay').style.display,'none','formulaire complet ouvert');
  const h=docEl('reassort-corps').innerHTML;if(h.indexOf('Déjà dans ton inventaire')<0||h.indexOf('épuisé')<0)throw new Error('explication');
  if(h.indexOf('2 × 1000 ml')<0)throw new Error('raccourcis emballage');
  docEl('reassort-qty').value='2000';docEl('reassort-dlc').value='';X('confirmerReassort()');
  eq(X("findItem('lait').qty"),2000);eq(X("findItem('lait').mac100.kcal"),46);eq(nb(),n0,'doublon');eq(X('S.waiting.length'),0);
  eq(X("findItem('lait').dlc"),undefined,'date depassee retiree');
});
t('*** le lien garde depuis la suggestion de courses prime sur le nom ***',()=>{
  prepa();att({id:'w2',name:'Riz',rayon:'pates',invId:'riz'});X("openWaitingItem('w2')");
  if(docEl('reassort-corps').innerHTML.indexOf('Riz basmati')<0)throw new Error('mauvais article');
  docEl('reassort-qty').value='1000';X('confirmerReassort()');eq(X("findItem('riz').qty"),1200);
});
t('date limite : la plus proche gagne, une date depassee est remplacee',()=>{
  prepa();X("findItem('riz').dlc='2026-12-01'");att({id:'w3',name:'Riz basmati',rayon:'pates'});X("openWaitingItem('w3')");
  docEl('reassort-qty').value='500';docEl('reassort-dlc').value='2027-01-01';X('confirmerReassort()');eq(X("findItem('riz').dlc"),'2026-12-01');
  att({id:'w4',name:'Lait',rayon:'laitiers'});X("openWaitingItem('w4')");docEl('reassort-qty').value='1000';docEl('reassort-dlc').value='2026-10-10';X('confirmerReassort()');eq(X("findItem('lait').dlc"),'2026-10-10');
});
t('quantite manquante : rien ne change',()=>{
  prepa();att({id:'w5',name:'Lait',rayon:'laitiers'});let m='';const va=sb.alert;sb.alert=x=>{m=x;};
  try{X("openWaitingItem('w5')");docEl('reassort-qty').value='';X('confirmerReassort()');}finally{sb.alert=va;}
  if(!/quantité achetée/.test(m))throw new Error(m);eq(X('S.waiting.length'),1);eq(X("findItem('lait').qty"),0);
});
t('stock illimite : simplement retire de « A ranger »',()=>{
  prepa();att({id:'w6',name:'Sel',rayon:'epices'});X("openWaitingItem('w6')");X('confirmerReassort()');eq(X('S.waiting.length'),0);eq(X("findItem('sel').qty"),null);
});
console.log('\n=== XXXI. Ranger : nom proche ou nouvel article ===');
t('*** nom proche : l\'appli propose les articles voisins, sans les imposer ***',()=>{
  prepa();att({id:'w7',name:'Riz',rayon:'pates'});X("openWaitingItem('w7')");
  const h=docEl('reassort-corps').innerHTML;if(h.indexOf("choisirReassort('riz')")<0)throw new Error('proposition absente');
  X("choisirReassort('riz')");docEl('reassort-qty').value='300';X('confirmerReassort()');eq(X("findItem('riz').qty"),500);
});
t('« nouvel article » ouvre le formulaire complet',()=>{
  prepa();att({id:'w8',name:'Riz',rayon:'pates'});X("openWaitingItem('w8')");
  X("var __fo=_ouvrirFormulaireRangement;_ouvrirFormulaireRangement=function(id){globalThis.__form=id;}");sb.__form=null;
  try{X('nouvelArticleRangement()');}finally{X('_ouvrirFormulaireRangement=__fo');}
  eq(docEl('reassort-overlay').style.display,'none');eq(sb.__form,'w8');
});
t('aucun article proche : formulaire complet directement',()=>{
  prepa();att({id:'w9',name:'Chocolat noir',rayon:'collations'});
  X("var __fo=_ouvrirFormulaireRangement;_ouvrirFormulaireRangement=function(id){globalThis.__form=id;}");sb.__form=null;
  try{X("openWaitingItem('w9')");}finally{X('_ouvrirFormulaireRangement=__fo');}
  eq(docEl('reassort-overlay').style.display,'none');eq(sb.__form,'w9');
});
t('*** formulaire complet : meme nom dans une autre categorie et meme unite -> complete, pas de doublon ***',()=>{
  prepa();const n0=nb();
  X("_addOrMergeInv('placards',{id:'cx1',name:'Lait demi-écrémé',qty:1000,unit:'ml'})");eq(nb(),n0);eq(X("findItem('ldm').qty"),1500);
  X("_addOrMergeInv('placards',{id:'cx2',name:'Lait demi-écrémé',qty:2,unit:'pc'})");eq(nb(),n0+1,'unites differentes : article a part');
});
t('les plats maison ne servent jamais de cible',()=>{
  prepa();X("S.inv.frigo.push({id:'pl',name:'Chili',qty:2,unit:'parts',plat:{parts:4}})");att({id:'wa',name:'Chili',rayon:'conserve'});
  eq(X("_articleDuStock(S.waiting[0])"),null);
});
console.log('\n=== XXXII. Le lien suit l\'article des courses ===');
t('*** suggestion de stock bas -> liste de courses -> « A ranger » : invId conserve ***',()=>{
  prepa();X("S.shop={list:[],graveyard:[],graveRayons:[]};S.pasRacheter={}");
  const s=X('shopSuggestions()').find(x=>x.name==='Lait');if(!s||s.invId!=='lait')throw new Error('suggestion sans lien');
  X("_ajouterAuxCourses('Lait','laitiers',{invId:'lait'})");X("S.shop.list[0].checked=true;validateCourses()");
  eq(X("S.waiting[0].invId"),'lait');
});
console.log('\n=== XXXIII. « Recharger ce stock » depuis l\'ajout d\'article ===');
function ajout(o){
  X("_aic='frigo';_macSrc.aim='auto';_macManual.aim=null");
  docEl('ai-name').value=o.name;docEl('ai-present').checked=false;docEl('ai-pkg-on').checked=!!o.pkg;
  docEl('ai-pkg-size').value=o.pkg?String(o.pkg):'';docEl('ai-pkg-count').value=o.pkg?'1':'';docEl('ai-pkg-unit').value=o.unit||'g';
  docEl('ai-qty').value=o.pkg?'':String(o.qty||'');docEl('ai-unit').value=o.unit||'g';docEl('ai-dlc').value=o.dlc||'';docEl('ai-pieceg').value='';
  ['kcal','prot','gluc','lip'].forEach(k=>docEl('ai-m-'+k).value=o.mac?String(o.mac[k]):'');docEl('ai-m-fib').value='';
  const vc=sb.confirm;sb.confirm=()=>true;try{X('confirmAddItem()');}finally{sb.confirm=vc;}
}
t('*** article epuise recharge : la nouvelle date est prise, l\'ancienne oubliee ***',()=>{
  prepa();X("S.inv.frigo.push({id:'tor',name:'Tortellini Prosciutto',qty:0,unit:'g',dlc:'2026-09-01'})");const n0=nb();
  ajout({name:'Tortellini Prosciutto',pkg:250,unit:'g',dlc:'2026-11-11',mac:{kcal:270,prot:12,gluc:40,lip:6.2}});
  eq(nb(),n0,'doublon');eq(X("findItem('tor').qty"),250);eq(X("findItem('tor').dlc"),'2026-11-11');
  eq(X("findItem('tor').mac100.kcal"),270,'macros importees');
});
t('*** stock en cours : la date la plus proche reste ***',()=>{
  prepa();X("S.inv.frigo.push({id:'tor',name:'Tortellini Prosciutto',qty:250,unit:'g',dlc:'2026-10-20',mac100:{kcal:280,prot:11,gluc:41,lip:7}})");
  ajout({name:'Tortellini Prosciutto',pkg:250,unit:'g',dlc:'2026-11-11'});
  eq(X("findItem('tor').qty"),500);eq(X("findItem('tor').dlc"),'2026-10-20');eq(X("findItem('tor').mac100.kcal"),280,'macros existantes gardees');
});
t('stock en cours sans nouvelle date : l\'ancienne (meme depassee) reste, l\'alerte aussi',()=>{
  prepa();X("S.inv.frigo.push({id:'tor',name:'Tortellini Prosciutto',qty:250,unit:'g',dlc:'2026-09-20'})");
  ajout({name:'Tortellini Prosciutto',pkg:250,unit:'g'});eq(X("findItem('tor').dlc"),'2026-09-20');
});
t('unites incompatibles sans poids par piece : article a part, avec explication',()=>{
  prepa();X("S.inv.frigo.push({id:'oeuf',name:'Oeufs',qty:6,unit:'pcs'})");const n0=nb();let m='';const va=sb.alert;sb.alert=x=>{m=x;};
  try{ajout({name:'Oeufs',qty:300,unit:'g'});}finally{sb.alert=va;}
  eq(nb(),n0+1);eq(X("findItem('oeuf').qty"),6);if(!/compté en pcs/.test(m))throw new Error(m);
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
