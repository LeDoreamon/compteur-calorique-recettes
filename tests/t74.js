const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
const GK='AQ.'+'FauxFauxFauxFauxFauxFaux';
const photo=[{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:'GRANDE'}},{type:'text',text:'Analyse ce repas.'}]}];
const TROP={error:{message:'Request too large for model `qwen/qwen3.8-27b` in organization `org_abc123` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Requested 12000, please reduce your message size and try again.',type:'tokens'}};
const REFUS={error:{code:401,message:'Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential.',status:'UNAUTHENTICATED',details:[{reason:'ACCESS_TOKEN_TYPE_UNSUPPORTED'}]}};
let appels=[];
function serveur(gem,groqSeq){appels=[];let k=0;sb.fetch=async(url,opt)=>{const body=opt&&opt.body?JSON.parse(opt.body):null;appels.push({url,body});
  if(/generativelanguage/.test(url))return {ok:true,status:200,json:async()=>gem};
  if(/api\.groq\.com/.test(url)){const r=groqSeq[Math.min(k,groqSeq.length-1)];k++;return {ok:true,status:200,json:async()=>r};}
  return {ok:true,status:200,json:async()=>null};};}
const OK={choices:[{message:{content:'{"ok":true}'},finish_reason:'stop'}]};
let echelles=[];X("_reduireImageB64=function(b,m,e){globalThis.__ech.push(e);return Promise.resolve('PETITE');}");sb.__ech=echelles;

console.log('\n=== XXV. Photo : Gemini refuse, Groq trop lourd ===');
t('*** Groq « Request too large » sur une photo : image reduite puis renvoyee une fois ***',async()=>{
  LS.anthropic_key='gsk_x';delete LS.gemini_key;echelles.length=0;serveur(null,[TROP,OK]);
  const r=await X('callAI')(photo,1300,'Tu analyses un repas.');
  eq(r.content[0].text,'{"ok":true}');const g=appels.filter(a=>/groq/.test(a.url));eq(g.length,2,'appels Groq');
  const img=JSON.stringify(g[1].body.messages);if(img.indexOf('PETITE')<0||img.indexOf('GRANDE')>=0)throw new Error('image non reduite');
  if(!(echelles[0]>0.2&&echelles[0]<0.9))throw new Error('echelle '+echelles[0]);
  if(!(g[1].body.max_tokens<=900))throw new Error('max_tokens '+g[1].body.max_tokens);
});
t('une seule nouvelle tentative : toujours trop lourd -> erreur, sans boucle',async()=>{
  LS.anthropic_key='gsk_x';delete LS.gemini_key;serveur(null,[TROP,TROP,OK]);
  let m='';try{await X('callAI')(photo,1300,'s');}catch(e){m=e.message;}
  if(!/Request too large/.test(m))throw new Error(m);eq(appels.length,2);
});
t('texte (pas d\'image) : pas de reduction',async()=>{
  LS.anthropic_key='gsk_x';delete LS.gemini_key;serveur(null,[TROP,OK]);
  let m='';try{await X('callAI')([{role:'user',content:'x'}],400,'s');}catch(e){m=e.message;}eq(appels.length,1);
});
t('*** les deux IA echouent : la raison de chacune, en clair, sans identifiant d\'organisation ***',async()=>{
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;serveur(REFUS,[TROP,TROP]);
  let err=null;try{await X('callAI')(photo,1300,'s');}catch(e){err=e;}
  if(!err)throw new Error('pas d\'erreur');eq(err.toutes.length,2);eq(err.toutes[0].ia,'Gemini');
  if(!/ACCESS_TOKEN_TYPE_UNSUPPORTED/.test(err.toutes[0].m))throw new Error('raison Gemini perdue : '+err.toutes[0].m);
  const txt=X('_aiFriendlyErr')(err);
  if(!/Gemini : clé Gemini refusée par Google/.test(txt))throw new Error(txt);
  if(!/Groq : photo trop lourde pour le quota gratuit de Groq/.test(txt))throw new Error(txt);
  if(/org_|on_demand|Request/.test(txt))throw new Error('detail technique : '+txt);
});
t('message brut inconnu : identifiant d\'organisation retire',()=>{
  const s=X('_aiFriendly')('API:Something odd for model `m` in organization `org_zz` service tier `on_demand`');
  if(/org_zz|on_demand/.test(s))throw new Error(s);
});
t('*** ecran d\'ajout de repas : le message des deux IA s\'affiche ***',async()=>{
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;serveur(REFUS,[TROP,TROP]);
  X("_addMealUseStock=false");await X('runAddMealAI')(photo);
  const e=docEl('addmeal-err'),ph=e.textContent;eq(e.style.display,'block','encadre visible');
  if(!/Aucune IA n’a pu répondre/.test(ph)||!/• Gemini :/.test(ph)||!/• Groq :/.test(ph)||!/décris le repas/.test(ph))throw new Error(ph);
  if(/^⚠/.test(docEl('addmeal-textarea').placeholder||''))throw new Error('erreur encore dans le champ');
  X("openAddMeal('photo')");eq(e.style.display,'none','encadre efface a la reouverture');
});
const SATURE={error:{code:503,message:'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.',status:'UNAVAILABLE'}};
const OKG={candidates:[{content:{parts:[{text:'{"via":"lite"}'}]},finishReason:'STOP'}]};
function serveurGem(parModele){appels=[];sb.fetch=async(url,opt)=>{appels.push({url});
  if(/generativelanguage/.test(url)){const m=(url.match(/models\/([^:]+):/)||[])[1];return {ok:true,status:200,json:async()=>parModele[m]};}
  return {ok:true,status:200,json:async()=>OK};};}
t('*** Gemini sature (503) : Flash-Lite prend le relais avant Groq ***',async()=>{
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;serveurGem({'gemini-2.5-flash':SATURE,'gemini-flash-lite-latest':OKG});
  const r=await X('callAI')(photo,1300,'s');eq(r.content[0].text,'{"via":"lite"}');eq(X('_derniereIA'),'gemini');
  if(appels.some(a=>/groq/.test(a.url)))throw new Error('Groq appele');
});
t('Flash-Lite echoue aussi : erreur de saturation d\'origine, puis Groq en secours',async()=>{
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;serveurGem({'gemini-2.5-flash':SATURE,'gemini-flash-lite-latest':SATURE});
  const r=await X('callAI')(photo,1300,'s');eq(X('_derniereIA'),'groq');
  eq(appels.filter(a=>/generativelanguage/.test(a.url)).length,2,'pas de boucle');
});
t('message de saturation traduit',()=>{
  const s=X('_aiFriendly')('GEMINI:This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later. [UNAVAILABLE]');
  if(!/Gemini est saturé/.test(s))throw new Error(s);
});
t('repli recettes 120b -> 20b toujours declenche (message de la derniere IA conserve)',async()=>{
  LS.anthropic_key='gsk_x';delete LS.gemini_key;serveur(null,[{error:{message:'Request too large for model `openai/gpt-oss-120b` on tokens per minute (TPM): Limit 8000, Requested 9000'}}]);
  let m='';try{await X('callAI')([{role:'user',content:'x'}],400,'s','openai/gpt-oss-120b');}catch(e){m=e.message;}
  if(!/^API:Request too large/.test(m))throw new Error(m);
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
