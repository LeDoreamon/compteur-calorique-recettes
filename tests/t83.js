const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=require('fs').readFileSync('index.html','utf8');
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
const jr=()=>JSON.parse(LS.dz_journal||'[]');
console.log('\n=== XLVI. Dev : journal d\'erreurs et rapport ===');
t('*** secrets masques : cles Groq/Gemini, jeton, auth=, e-mail ***',()=>{
  const s=X("_sansSecret('gsk_abcDEF123456 AIzaSyBKAKZ4xxxxxxxx AQ.Ab8RN6abcdefghij https://x.firebaseio.com/u.json?auth=eyJhbGc.eyJzdWI.sig&x=1 liam@mail.fr')");
  ['abcDEF123456','SyBKAKZ4xxxx','Ab8RN6abcdef','eyJhbGc','liam@mail.fr'].forEach(k=>{if(s.indexOf(k)>=0)throw new Error('fuite : '+k+' dans '+s);});
  if(s.indexOf('gsk_…')<0||s.indexOf('(e-mail)')<0||s.indexOf('auth=…')<0)throw new Error('remplacements : '+s);
});
t('*** une erreur repetee en rafale : une seule ligne avec compteur ***',()=>{
  delete LS.dz_journal;X("_noterErreur('synchro','Ecriture — TypeError: Failed to fetch')");X("_noterErreur('synchro','Ecriture — TypeError: Failed to fetch')");
  eq(jr().length,1);eq(jr()[0].n,2);X("_noterErreur('ia','Groq : 429')");eq(jr().length,2);
});
t('au plus 30 erreurs gardees (les plus recentes)',()=>{delete LS.dz_journal;for(let i=0;i<40;i++)X("_noterErreur('js','e"+i+"')");eq(jr().length,30);eq(jr()[29].m,'e39');eq(jr()[0].m,'e10');});
t('*** rapport : build, appareil, IA, erreurs recentes en premier, sans cle ***',()=>{
  delete LS.dz_journal;const g=X('getApiKey');X("getApiKey=function(){return 'gsk_SECRETSECRET'}");
  try{X("_noterErreur('js','premiere')");X("_noterErreur('ia','seconde gsk_SECRETSECRET')");var r=X('_texteRapport()');}finally{sb.getApiKey=g;}
  if(r.indexOf('Build : '+X('BUILD_ID'))<0)throw new Error('build');if(r.indexOf('IA : Groq')<0)throw new Error('IA');
  if(r.indexOf('SECRETSECRET')>=0)throw new Error('cle dans le rapport');
  if(!(r.indexOf('seconde')<r.indexOf('premiere')))throw new Error('ordre');
  if(r.indexOf('Erreurs (2)')<0)throw new Error('compte');
});
t('*** echec d\'ecriture Firebase note dans le journal ***',async()=>{
  delete LS.dz_journal;const vf=sb.fetch;X("_loaded=true");sb.fetch=async(u,o)=>{if(o&&o.method==='PUT')return {ok:false,status:400,statusText:'Bad Request',json:async()=>({})};return {ok:true,status:200,json:async()=>({id_token:'t',expires_in:'3600'})};};
  try{await X('_saveStateNow')();}catch(e){}finally{sb.fetch=vf;}
  if(!jr().some(e=>e.s==='synchro'&&/HTTP 400/.test(e.m)))throw new Error('non note : '+JSON.stringify(jr()));
});
t('*** echec des deux IA note (raison de chacune) ***',()=>{
  delete LS.dz_journal;const e=new Error('x');e.toutes=[{ia:'Gemini',m:'503 high demand'},{ia:'Groq',m:'429 rate limit'}];sb.__e=e;X('_aiFriendlyErr(__e)');
  const l=jr();if(!l.length||l[0].s!=='ia'||l[0].m.indexOf('Gemini : 503')<0||l[0].m.indexOf('Groq : 429')<0)throw new Error(JSON.stringify(l));
});
t('*** Reglages : copier le rapport, effacer, compteur ***',()=>{
  if(src.indexOf('onclick="copierRapport()"')<0||src.indexOf('onclick="effacerJournal()"')<0)throw new Error('boutons');
  X("_noterErreur('js','z')");X('_majJournalSt()');if(!/erreurs? notées? sur cet appareil/.test(docEl('set-journal-st').textContent))throw new Error('compteur');
  X('effacerJournal()');eq(docEl('set-journal-st').textContent,'Aucune erreur notée sur cet appareil.');
});
t('copie impossible : le rapport s\'affiche a l\'ecran',()=>{let msg='';const va=sb._alerte;sb._alerte=m=>{msg=m;return Promise.resolve();};const nv=sb.navigator;sb.navigator={userAgent:'node'};try{X('copierRapport()');}finally{sb._alerte=va;sb.navigator=nv;}if(msg.indexOf('Rapport Dorayaki')<0)throw new Error('pas affiche');});
t('erreurs JavaScript et promesses rejetees captees',()=>{if(src.indexOf("window.addEventListener('error'")<0||src.indexOf("window.addEventListener('unhandledrejection'")<0)throw new Error('ecouteurs');});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
