const {sb}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);

console.log('\n=== VIA. Dessert « autre » analyse par Groq ===');
t('*** plus aucun appel a l\'API Anthropic ***',()=>{
  if(/api\.anthropic\.com/.test(fs.readFileSync('index.html','utf8')))throw new Error('appel restant');
});
t('*** la reponse passe par callAI et est neutralisee ***',async()=>{
  const vrai=sb.callAI;let appele=false;
  sb.callAI=async()=>{appele=true;return {content:[{type:'text',text:'{"name":"<img src=x>Fondant","kcal":350.4,"prot":5,"gluc":40,"lip":18}'}],empty:false};};
  try{X('S.customDesserts={};');await X('analyzeCustomDessert')('r1','un fondant');}finally{sb.callAI=vrai;}
  eq(appele,true);
  const d=X('S.customDesserts.r1');
  eq(d.kcal,350);if(/</.test(d.name))throw new Error('nom non neutralise : '+d.name);
});
t('reponse vide : message d\'erreur, pas de plantage',async()=>{
  const vrai=sb.callAI;sb.callAI=async()=>({content:[{type:'text',text:''}],empty:true});
  try{X('S.customDesserts={};');await X('analyzeCustomDessert')('r2','x');}finally{sb.callAI=vrai;}
  eq(X('S.customDesserts.r2.error'),'Erreur — réessaie');
});
t('pas de cle : invitation a la configurer',async()=>{
  const vrai=sb.callAI;sb.callAI=async()=>{throw new Error('NO_KEY');};
  try{X('S.customDesserts={};');await X('analyzeCustomDessert')('r3','x');}finally{sb.callAI=vrai;}
  if(X('S.customDesserts.r3.error').indexOf('clé API')<0)throw new Error('message');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
