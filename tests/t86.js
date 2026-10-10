const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=require('fs').readFileSync('index.html','utf8');
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
let DB={},journal=[];
X("fbUrl=async function(p){return 'FB/'+p}");X("sessionActive=function(){return {uid:'u1'}}");X("ACTIVE_PROFILE='users/u1'");
sb.fetch=async(u,o)=>{let p=String(u).replace(/^FB\//,'');const m=(o&&o.method)||'GET';journal.push(m+' '+p);
  const sh=/shallow=true/.test(p);p=p.replace(/[?&]shallow=true/,'');
  if(m==='PUT'){DB[p]=JSON.parse(o.body);return {ok:true,status:200,json:async()=>({})};}
  if(sh){const k={};Object.keys(DB).forEach(x=>{if(x.indexOf(p+'/')===0)k[x.slice(p.length+1)]=true;});return {ok:true,status:200,json:async()=>k};}
  return {ok:true,status:200,json:async()=>(p in DB?JSON.parse(JSON.stringify(DB[p])):null)};};
X("saveState=function(){__saves++}");
const G='gsk_'+'A1b2C3d4E5f6G7h8I9j0K1l2M3n4',GM='AIza'+'SyDummyDummyDummyDummyDummyDumm0';
function prep(){DB={};journal=[];sb.__saves=0;Object.keys(LS).forEach(k=>delete LS[k]);X('S.clesSorties=false');}
console.log('\n=== L. Dev : cles IA hors de l\'etat ===');
t('*** l\'etat enregistre ne contient plus les cles ***',()=>{if(/groqKey:localStorage|geminiKey:getGeminiKey/.test(src))throw new Error('encore dans le payload');});
t('*** migration : cles de l\'ancien etat recopiees dans cles, retirees des sauvegardes et du filet ***',async()=>{
  prep();LS.anthropic_key=G;LS.gemini_key=GM;   /* rechargees depuis l'ancien etat par _applyState */
  DB['users/u1/backups/2026-10-01']={date:'2026-10-01',state:JSON.stringify({dayMeals:{},groqKey:G,geminiKey:GM})};
  DB['users/u1/backups/2026-10-02']={date:'2026-10-02',state:JSON.stringify({dayMeals:{a:1}})};
  DB['users/u1/filet']={at:'x',state:JSON.stringify({groqKey:G})};
  await X('_synchroCles')();await new Promise(r=>setTimeout(r,20));
  eq(DB['users/u1/cles'].groq,G);eq(DB['users/u1/cles'].gemini,GM);if(!DB['users/u1/cles'].maj)throw new Error('maj');
  eq(X('S.clesSorties'),true);if(!(sb.__saves>0))throw new Error('etat non reenregistre');
  if(/gsk_|AIza/.test(DB['users/u1/backups/2026-10-01'].state))throw new Error('cle restee dans une sauvegarde');
  if(/gsk_/.test(DB['users/u1/filet'].state))throw new Error('cle restee dans le filet');
  eq(JSON.parse(DB['users/u1/backups/2026-10-01'].state).dayMeals?'ok':'perdu','ok','contenu de la sauvegarde');
  if(journal.indexOf('PUT users/u1/backups/2026-10-02')>=0)throw new Error('sauvegarde sans cle reecrite pour rien');
});
t('*** le noeud cles fait foi : une cle supprimee ailleurs disparait de cet appareil ***',async()=>{
  prep();LS.anthropic_key=G;LS.gemini_key=GM;X('S.clesSorties=true');DB['users/u1/cles']={maj:'2026-10-10',gemini:GM};
  await X('_synchroCles')();eq(LS.anthropic_key,undefined,'groq');eq(LS.gemini_key,GM);
});
t('nouvel appareil : les cles arrivent du noeud',async()=>{prep();X('S.clesSorties=true');DB['users/u1/cles']={maj:'x',groq:'gsk_courte'};await X('_synchroCles')();eq(LS.anthropic_key,'gsk_courte','une cle non standard reste acceptee');});
t('*** Reglages : enregistrer ou supprimer une cle ecrit le noeud cles ***',async()=>{
  prep();docEl('api-key-input').value=G;X('saveApiKey()');await new Promise(r=>setTimeout(r,10));eq(DB['users/u1/cles']&&DB['users/u1/cles'].groq,G);
  docEl('gemini-key-input').value=GM;X('saveGeminiKey()');await new Promise(r=>setTimeout(r,10));eq(DB['users/u1/cles'].gemini,GM);
  X('clearApiKey()');await new Promise(r=>setTimeout(r,10));eq(DB['users/u1/cles'].groq,undefined,'suppression');eq(DB['users/u1/cles'].gemini,GM);
});
t('hors session : rien',async()=>{prep();X("sessionActive=function(){return null}");try{await X('_synchroCles')();}finally{X("sessionActive=function(){return {uid:'u1'}}");}eq(journal.length,0);});
t('lancee au chargement du compte',()=>{if(src.indexOf('_tutoSiNouveau();_synchroCles();')<0)throw new Error('non lancee');});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
