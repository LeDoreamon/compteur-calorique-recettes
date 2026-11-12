// Poids suppose par l'IA (12/11/2026, rapport de Liam : « 2 Twix » compte 500 kcal, soit 2 sachets)
const {sb,docEl}=require('./sb.js');
const vm=require('vm');
const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
let envoye='';
const ia=(txt)=>{sb.fetch=async(url,o)=>{if(/groq/.test(url)){envoye=String(o&&o.body||'');return {ok:true,status:200,headers:{get:()=>null},json:async()=>({choices:[{message:{content:txt},finish_reason:'stop'}]}),text:async()=>''};}
  return {ok:true,status:200,json:async()=>null};};};
const analyser=async(txt,saisie)=>{LS.anthropic_key='gsk_x';delete LS.gemini_key;X("S.dayMeals={};openAddMeal('text');setMealStock(false)");ia(txt);
  docEl('addmeal-textarea').value=saisie||'2 Twix';await X('runAddMealAI')([{role:'user',content:'2 Twix'}]);};
const TWIX='{"corrected":"2 Twix","ok":true,"items":[{"n":"Twix","q":2,"u":"pc","g":50,"kcal":248,"prot":2,"gluc":32,"lip":12,"fib":1},{"n":"Riz cuit","q":200,"u":"g","g":200,"kcal":260,"prot":5,"gluc":56,"lip":1,"fib":1}],"kcal":508,"prot":7,"gluc":88,"lip":13,"fib":2}';

console.log('\n=== XC. Poids suppose par l\'IA pour les aliments a la piece ===');
t('*** la consigne donne les poids des pieces et dit qu\'un nombre compte des pieces, pas des paquets ***',async()=>{
  await analyser(TWIX);
  const sys=JSON.parse(envoye).messages[0].content;
  if(sys.indexOf('1 Twix = 1 bâtonnet ≈ 25 g')<0||sys.indexOf('1 œuf ≈ 55 g')<0)throw new Error('table des poids absente');
  if(sys.indexOf('JAMAIS des paquets')<0||sys.indexOf('« 2 Twix » = 2 bâtonnets = 50 g')<0)throw new Error('regle des pieces');
  if(sys.indexOf('"u":string,"g":number')<0||sys.indexOf('poids TOTAL de la ligne')<0)throw new Error('champ g');
});
t('*** ligne a la piece : le poids suppose s\'affiche (« ≈ 50 g ») ; rien sur une ligne en grammes ***',async()=>{
  await analyser(TWIX);
  eq(X('_addMealFreeItems[0].gPc'),25);eq(X('_addMealFreeItems[1].gPc'),null);
  const h=docEl('inv-items-section').innerHTML;
  if(!/<span id="free-g-0"[^>]*>≈ 50 g<\/span>/.test(h))throw new Error('poids absent : '+(h.match(/<span id="free-g-0"[^>]*>[^<]*/)||[''])[0]);
  if(!/<span id="free-g-1"[^>]*><\/span>/.test(h))throw new Error('poids sur une ligne en grammes');
  if(h.indexOf('le poids que l\'IA a supposé')<0)throw new Error('explication absente');
});
t('*** la quantite change : le poids suit (4 pieces = ≈ 100 g), les kcal aussi ***',async()=>{
  await analyser(TWIX);
  X("_addMealFreeItems[0].qty=4");eq(X('_libPoidsSuppose(_addMealFreeItems[0])'),'≈ 100 g');
  eq(Math.round(X('_addMealFreeItems[0].pu.kcal*_addMealFreeItems[0].qty')),496);
  if(src.indexOf("var ge=document.getElementById('free-g-'+i);if(ge)ge.textContent=_libPoidsSuppose(f);")<0)throw new Error('pas de mise a jour a la saisie');
});
t('poids absent, nul ou invraisemblable : rien d\'affiche, la ligne reste',()=>{
  eq(X("_poidsPiece({g:50},2,'pc')"),25);eq(X("_poidsPiece({},2,'pc')"),null);eq(X("_poidsPiece({g:0},2,'pc')"),null);
  eq(X("_poidsPiece({g:'abc'},2,'pc')"),null);eq(X("_poidsPiece({g:90000},2,'pc')"),null);eq(X("_poidsPiece({g:50},0,'pc')"),null);eq(X("_poidsPiece({g:50},50,'g')"),null);
  eq(X("_libPoidsSuppose({gPc:null,qty:2})"),'');eq(X("_libPoidsSuppose({gPc:2.5,qty:3})"),'≈ 7,5 g');eq(X("_libPoidsSuppose(null)"),'');
});
t('sans aucune ligne a la piece : pas d\'explication en plus',async()=>{
  await analyser('{"corrected":"Riz","ok":true,"items":[{"n":"Riz cuit","q":200,"u":"g","g":200,"kcal":260,"prot":5,"gluc":56,"lip":1,"fib":1}],"kcal":260,"prot":5,"gluc":56,"lip":1,"fib":1}','Riz');
  if(docEl('inv-items-section').innerHTML.indexOf('free-nom-0')<0)throw new Error('ligne absente');
  if(docEl('inv-items-section').innerHTML.indexOf('a supposé')>=0)throw new Error('explication inutile');
});
t('*** ↻ sur une ligne : la consigne porte les poids, le nouveau poids suppose est repris ***',async()=>{
  await analyser(TWIX);
  ia('{"n":"Kinder Bueno","q":2,"u":"pc","g":43,"kcal":245,"prot":4,"gluc":21,"lip":16,"fib":1}');
  await X('reestimerLigne(0)');
  if(JSON.parse(envoye).messages[0].content.indexOf('1 Kinder Bueno = 1 barre ≈ 21 g')<0)throw new Error('table absente du recalcul');
  eq(X('_addMealFreeItems[0].n'),'Kinder Bueno');eq(X('_libPoidsSuppose(_addMealFreeItems[0])'),'≈ 43 g');
});

(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' -> '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
