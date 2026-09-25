const {sb,docEl}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const rep=txt=>async()=>({content:[{type:'text',text:txt}],empty:!txt.trim()});

console.log('\n=== IXA. Reponse IA d\'un repas : neutralisee ===');
t('*** le nom et les lignes proposes par l\'IA sont neutralises ***',async()=>{
  X("_addMealUseStock=false;_pendingMeal=null;");docEl('addmeal-textarea').value='';
  const vrai=sb.callAI;
  sb.callAI=rep('<think>…</think>{"corrected":"<img src=x onerror=alert(1)>Bol","ok":true,"items":[{"n":"<b>riz</b>","q":100,"u":"g","kcal":130,"prot":3,"gluc":28,"lip":0}],"kcal":130,"prot":3,"gluc":28,"lip":0}');
  try{await X('runAddMealAI')([{role:'user',content:'bol'}]);}finally{sb.callAI=vrai;}
  const pm=X('_pendingMeal');if(!pm)throw new Error('repas non prepare');
  if(/</.test(pm.name))throw new Error('nom : '+pm.name);
  if(/</.test(X('_addMealFreeItems[0].n')))throw new Error('ligne non neutralisee');
});
t('reponse vide : message, pas de plantage',async()=>{
  X("_addMealUseStock=false;_pendingMeal=null;");
  const vrai=sb.callAI;sb.callAI=rep('');
  try{await X('runAddMealAI')([{role:'user',content:'bol'}]);}finally{sb.callAI=vrai;}
  eq(X('_pendingMeal'),null);
  if(!/vide/i.test(docEl('addmeal-textarea').placeholder||''))throw new Error('message : '+docEl('addmeal-textarea').placeholder);
});
t('plus aucune reponse IA lue sans extractJSON',()=>{
  const src=fs.readFileSync('index.html','utf8');
  if(/JSON\.parse\(raw\.replace/.test(src))throw new Error('JSON.parse direct restant');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
