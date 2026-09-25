const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
function prepa(){X("_loaded=true;S.mainTab='recipes';S.displayDate=S.today;S.dayMeals={};TARGETS={kcal:2000,prot:150,gluc:200,lip:60};");
  X("S.inv={frigo:[],congelateur:[],placards:[{id:'av',name:'Flocons d\\'avoine',qty:500,unit:'g',mac100:{kcal:370,prot:13,gluc:60,lip:7}},{id:'lg',name:'Lentilles vertes',qty:500,unit:'g',mac100:{kcal:330,prot:24,gluc:50,lip:1,fib:11}},{id:'zz',name:'Truc mystere',qty:2,unit:'g',mac100:{kcal:100,prot:1,gluc:1,lip:1}},{id:'wr',name:'Wraps',qty:6,unit:'pcs',pieceG:60,mac100:{kcal:300,prot:9,gluc:50,lip:6}}],epices:[]};");}

console.log('\n=== XA. Sources ===');
t('*** table par familles : valeurs attendues ***',()=>{
  const v=n=>X('_fibParNom('+JSON.stringify(n)+')');
  eq(v("Flocons d'avoine"),10);eq(v('Poulet lamelles'),0);eq(v('Pâtes fourrées pesto'),2.5);eq(v('Bouillon légumes'),0);
  eq(v('Pâtes complètes'),8);eq(v('Yaourt à la myrtille'),0.2);eq(v('Noix de muscade'),20);eq(v('Chose inconnue'),null);
});
t('la valeur saisie l\'emporte sur la table',()=>{prepa();eq(X("_fib100(findItem('lg'))"),11);eq(X("_fib100(findItem('av'))"),10);});
t('*** fibres d\'une quantite d\'article : grammes, pieces, inconnu ***',()=>{
  prepa();
  eq(X("itemMealMacros(findItem('av'),50).fib"),5);
  eq(X("itemMealMacros(findItem('wr'),2).fib").toFixed(1),'4.8','2 wraps de 60 g a 4 g/100 g');
  eq(X("itemMealMacros(findItem('zz'),100).fib"),null);
});
t('OpenFoodFacts : fiber_100g repris',async()=>{
  const vrai=sb.fetch;let pris=null;const vraiA=sb.applyScannedProduct;
  sb.fetch=async()=>({ok:true,status:200,json:async()=>({status:1,product:{product_name:'Muesli',nutriments:{'energy-kcal_100g':380,proteins_100g:9,carbohydrates_100g:60,fat_100g:8,fiber_100g:8.25}}})});
  sb.applyScannedProduct=(n,m)=>{pris=m;};
  try{X("_scanMode='inv';");await X('lookupBarcode')('3017620422003');}finally{sb.fetch=vrai;sb.applyScannedProduct=vraiA;}
  eq(pris&&pris.fib,8.3);
});

console.log('\n=== XB. Recettes et repas ===');
t('*** recette : somme des lignes, inconnue si une ligne manque ***',()=>{
  prepa();
  eq(X("recipeMacros({kcal:1,prot:1,gluc:1,lip:1,used:[{id:'av',qty:80},{id:'lg',qty:100}]}).fib"),19);
  eq(X("recipeMacros({kcal:1,prot:1,gluc:1,lip:1,used:[{id:'av',qty:80},{id:'zz',qty:10}]}).fib"),null);
  eq(X("recipeMacros({kcal:1,prot:1,gluc:1,lip:1}).fib"),null,'sans lignes');
});
t('*** repas : valeur enregistree, puis lignes, puis recette ***',()=>{
  prepa();
  eq(JSON.stringify(X("_fibRepas({macros:{kcal:500,prot:1,gluc:1,lip:1,fib:7}})")),'{"g":7,"complet":true}');
  eq(JSON.stringify(X("_fibRepas({macros:{kcal:500,prot:1,gluc:1,lip:1},ings:[{id:'av',qty:50},{id:null,n:'Pomme',qty:150,unit:'g'}]})")),'{"g":8.6,"complet":true}');
  eq(JSON.stringify(X("_fibRepas({ings:[{id:'av',qty:50},{id:'zz',qty:10}]})")),'{"g":5,"complet":false}');
  eq(X("_fibRepas({rid:'nexistepas'})"),null);
});
t('journee : total et drapeau partiel',()=>{
  prepa();X("S.dayMeals[S.today]=[{macros:{kcal:400,prot:1,gluc:1,lip:1,fib:6}},{ings:[{id:'zz',qty:10}]}];");
  const f=X('getDayFibres(S.today)');eq(f.g,6);eq(f.complet,false);eq(f.connu,true);
});

console.log('\n=== XC. Affichage ===');
t('*** barre Fibres : jamais rouge au-dela du repere, « ≥ » si partiel ***',()=>{
  const h=X("macroBar('Fibres',42,30,'g','--fib','fib',{bonAuDela:true})");if(/--red/.test(h))throw new Error('rouge');
  if(X("macroBar('Fibres',12,30,'g','--fib','fib',{bonAuDela:true,partiel:true})").indexOf('≥ 12/30')<0)throw new Error('pas de ≥');
  if(X("macroBar('Fibres',0,30,'g','--fib','fib',{inconnu:true})").indexOf('>?/30')<0)throw new Error('pas de ?');
});
t('*** la barre est dans le tracker et sur l\'accueil ***',()=>{
  prepa();X("S.dayMeals[S.today]=[{macros:{kcal:400,prot:1,gluc:1,lip:1,fib:6}}];");
  if(X('renderMacros()').indexOf('data-val="fib"')<0)throw new Error('tracker');
  if(X('renderAccueil()').indexOf('data-val="fib"')<0)throw new Error('accueil');
});
t('l\'explication liste les repas sans valeur',()=>{
  prepa();X("S.dayMeals[S.today]=[{name:'Bol',macros:{kcal:400,prot:1,gluc:1,lip:1,fib:6}},{name:'Mystere',ings:[{id:'zz',qty:10}]}];");
  X("ouvrirInfoMacro('fib')");const h=docEl('macroinfo-body').innerHTML;
  if(h.indexOf('Fibres inconnues pour : Mystere')<0||h.indexOf('30 g par jour')<0)throw new Error(h.slice(0,300));
});
t('fiche recette : pastille fibres quand elles sont connues',()=>{
  prepa();if(X("renderCard({id:'rtest',name:'T',slots:['lunch'],kcal:1,prot:1,gluc:1,lip:1,used:[{id:'av',qty:80}],steps:[]})").indexOf('8g fib.')<0)throw new Error('pastille absente');
});

console.log('\n=== XD. Saisie ===');
t('*** fiche article : fibres ramenees a 100 g, champ vide = retour a la table ***',()=>{
  prepa();X("_itemDetailRef={cat:'placards',id:'av'};_itemMacMode='100';");
  ['item-kcal','item-prot','item-gluc','item-lip'].forEach((k,i)=>{docEl(k).value=[370,13,60,7][i];});
  docEl('item-name').value="Flocons d'avoine";docEl('item-mac-base').value='50';docEl('item-fib').value='5';docEl('item-unit').value='g';
  X('saveItemDetail()');eq(X("findItem('av').mac100.fib"),10,'50 g -> 100 g');
  docEl('item-mac-base').value='100';docEl('item-fib').value='';X("_itemDetailRef={cat:'placards',id:'av'};saveItemDetail()");
  eq(X("findItem('av').mac100.fib"),undefined);
});
t('*** repas enregistre avec ses fibres, et le drapeau partiel ***',()=>{
  prepa();X("_addMealInvMode=false;_addMealFreeItems=[];_addMealDay=S.today;");
  docEl('addmeal-name').value='Bol';['addmeal-kcal','addmeal-prot','addmeal-gluc','addmeal-lip'].forEach(k=>{docEl(k).value='100';});
  X('_majFibAjout(4.5,true)');X('confirmAddMealFinal()');
  const m=X('S.dayMeals[S.today][0]');eq(m.macros.fib,4.5);eq(m.fibPartiel,true);
});
t('calcul dans la fenetre d\'ajout : lignes IA avec fibres',()=>{
  prepa();X("_addMealInvSuggestions=[];_addMealBase={kcal:0,prot:0,gluc:0,lip:0};_addMealFreeItems=[{n:'Riz',qty:100,unit:'g',m:{kcal:350,prot:7,gluc:78,lip:1,fib:1.2}},{n:'Sauce x',qty:50,unit:'g',m:{kcal:60,prot:0,gluc:5,lip:4}}];");
  X('recalcAddMealMacros()');eq(docEl('addmeal-fib').value,'1.5');eq(X('_fibAjoutPartiel'),false,'sauce reconnue par la table');
});
t('reponse IA d\'un repas : fibres des lignes additionnees',async()=>{
  X("_addMealUseStock=false;_pendingMeal=null;");const vrai=sb.callAI;
  sb.callAI=async()=>({content:[{type:'text',text:'{"corrected":"Bol","ok":true,"items":[{"n":"lentilles","q":100,"u":"g","kcal":330,"prot":24,"gluc":50,"lip":1,"fib":11},{"n":"riz","q":80,"u":"g","kcal":280,"prot":6,"gluc":62,"lip":1,"fib":1}],"kcal":610,"prot":30,"gluc":112,"lip":2}'}],empty:false});
  try{docEl('addmeal-textarea').value='Bol';await X('runAddMealAI')([{role:'user',content:'Bol'}]);}finally{sb.callAI=vrai;}
  eq(X('_pendingMeal.fib'),12);
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
