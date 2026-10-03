const {sb,docEl}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
const GK='AIza'+'SyDummyDummyDummyDummyDummyDumm0';
let appels=[];
function serveur(gem,groq){appels=[];sb.fetch=async(url,opt)=>{appels.push({url,body:opt&&opt.body?JSON.parse(opt.body):null});
  if(/generativelanguage/.test(url))return {ok:true,status:200,json:async()=>typeof gem==='function'?gem(url):gem};
  if(/api\.groq\.com/.test(url))return {ok:true,status:200,json:async()=>groq||{choices:[{message:{content:'{"via":"groq"}'},finish_reason:'stop'}]}};
  return {ok:true,status:200,json:async()=>null};};}
const photo=[{role:'user',content:[{type:'text',text:'Analyse ce repas'},{type:'image',source:{type:'base64',media_type:'image/jpeg',data:'AAAA'}}]}];
const OKG={candidates:[{content:{parts:[{text:'{"via":"gemini"}'}]},finishReason:'STOP'}]};
console.log('\n=== XXII. Photos via Gemini, recettes sur gpt-oss-120b ===');
t('*** photo + cle Gemini : appel Gemini (image en inline_data, consigne systeme) ***',async()=>{
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;serveur(OKG);
  const r=await X('callAI')(photo,1300,'Tu analyses un repas.');
  eq(r.content[0].text,'{"via":"gemini"}');eq(X('_derniereIA'),'gemini');
  const a=appels[0];if(!/models\/gemini-2\.5-flash:generateContent\?key=/.test(a.url))throw new Error(a.url);
  eq(a.body.contents[0].parts[1].inline_data.mime_type,'image/jpeg');eq(a.body.systemInstruction.parts[0].text,'Tu analyses un repas.');
  if(appels.some(x=>/groq/.test(x.url)))throw new Error('Groq appele aussi');
});
t('*** Gemini en erreur (quota) : repli silencieux sur Groq ***',async()=>{
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;serveur({error:{code:429,status:'RESOURCE_EXHAUSTED',message:'quota'}});
  const r=await X('callAI')(photo,1300,'sys');eq(r.content[0].text,'{"via":"groq"}');eq(X('_derniereIA'),'groq');
});
t('modele retire (404) : nouvel essai sur l\'alias du dernier Flash',async()=>{
  LS.gemini_key=GK;serveur(u=>/2\.5-flash/.test(u)?{error:{code:404,status:'NOT_FOUND',message:'not found'}}:OKG);
  const r=await X('callAI')(photo,1300,'sys');eq(r.content[0].text,'{"via":"gemini"}');
  if(!appels.some(x=>/gemini-flash-latest/.test(x.url)))throw new Error('alias non essaye');
});
t('sans cle Gemini : la photo passe par Groq comme avant',async()=>{
  LS.anthropic_key='gsk_x';delete LS.gemini_key;serveur(OKG);
  await X('callAI')(photo,1300,'sys');if(appels.some(x=>/generativelanguage/.test(x.url)))throw new Error('Gemini appele');
});
t('le texte ne passe jamais par Gemini ; Gemini seul suffit pour une photo',async()=>{
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;serveur(OKG);
  await X('callAI')([{role:'user',content:'Macros du riz'}],400,'sys');if(appels.some(x=>/generativelanguage/.test(x.url)))throw new Error('texte vers Gemini');
  delete LS.anthropic_key;serveur(OKG);const r=await X('callAI')(photo,1300,'sys');eq(r.content[0].text,'{"via":"gemini"}');
});
t('*** cle Gemini : jamais exportee, ignoree a l\'import, effacee a la deconnexion ***',()=>{
  if(!/delete st\.groqKey;delete st\.geminiKey;/.test(src))throw new Error('export');
  if(!/delete _st\.groqKey;delete _st\.geminiKey;/.test(src))throw new Error('import');
  LS.gemini_key=GK;LS.dz_auth='{}';X('_deconnecter')();eq(LS.gemini_key,undefined,'deconnexion');
  if(!/localStorage\.removeItem\('anthropic_key'\);localStorage\.removeItem\('gemini_key'\);\}/.test(src))throw new Error('reconnexion autre compte');
});
t('synchronisee dans l\'etat du compte et rechargee sur un autre appareil',()=>{
  if(!/geminiKey:getGeminiKey\(\),/.test(src))throw new Error('sauvegarde');
  delete LS.gemini_key;X('_applyState')({_profile:X('ACTIVE_PROFILE'),inv:X('S.inv'),dayMeals:{},geminiKey:GK});eq(LS.gemini_key,GK);
  delete LS.gemini_key;X('_applyState')({_profile:X('ACTIVE_PROFILE'),inv:X('S.inv'),dayMeals:{},geminiKey:'<script>'});eq(LS.gemini_key,undefined,'cle invalide acceptee');
});
t('Reglages : format verifie, enregistrement et champ masque',()=>{
  const el=docEl('gemini-key-input');el.value='pas-une-cle';delete LS.gemini_key;X('saveGeminiKey()');eq(LS.gemini_key,undefined);
  if(!/AIza/.test(docEl('gemini-key-st').textContent))throw new Error('message');
  el.value=' '+GK+' ';X('saveGeminiKey()');eq(LS.gemini_key,GK);
  const m=src.match(/<input[^>]*id="gemini-key-input"[^>]*>/)[0];if(/type="password"/.test(m)||!/champ-cle/.test(m))throw new Error('champ');
});
t('*** inscription : explication des deux services et champ Gemini visible ***',()=>{
  X("afficherEcranConnexion('accueil');_authMode('inscription');_ins.etape=5;renderAuth();");
  const h=docEl('profile-screen').innerHTML;
  ['Pourquoi deux services','Groq','Gemini','photo','gratuits','aistudio.google.com','au-gemini','au-groq','Passer cette étape'].forEach(x=>{if(h.indexOf(x)<0)throw new Error(x+' absent');});
  if(/<details/.test(h))throw new Error('Gemini encore replie');
});
t('*** inscription : cle Gemini invalide refusee, valide enregistree ***',async()=>{
  let etat=null;sb.fetch=async(url,opt)=>{if(/accounts:signUp/.test(url))return{ok:true,status:200,json:async()=>({localId:'G1',idToken:'t',refreshToken:'r',expiresIn:'3600'})};
    if(/\/state\.json/.test(url)&&opt&&opt.method==='PUT')etat=JSON.parse(opt.body);return{ok:true,status:200,json:async()=>null};};
  const prep=(g)=>{X("_auth.occupe=false;afficherEcranConnexion('accueil');_authMode('inscription')");const I=sb.window._ins;I.login='bea';I.mdp='secret1';
    Object.assign(I.p,{prenom:'Bea',sexe:'F',naissance:'1995-01-01',taille:165,poids:60,objectif:'maintien',activite:'2',cibles:{kcal:2000,prot:110,gluc:230,lip:65}});
    I.etape=5;X('renderAuth()');docEl('au-groq').value='';docEl('au-gemini').value=g;etat=null;};
  prep('nimportequoi');await X('etapeInscription')(1);eq(etat,null,'compte cree malgre la cle invalide');
  prep(GK);delete LS.gemini_key;await X('etapeInscription')(1);eq(etat&&etat.geminiKey,GK);eq(LS.gemini_key,GK);
});
t('*** recettes : gpt-oss-120b, raisonnement moyen ; repli 20b si la requete est trop grosse ***',async()=>{
  eq(X('MODELE_RECETTES'),'openai/gpt-oss-120b');
  X(`_loaded=true;S.favs=[];S.aiRecipes=[];S.inv={frigo:[{id:'po',name:'Poulet',qty:1000,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}}],congelateur:[],placards:[{id:'ri',name:'Riz',qty:1000,unit:'g',mac100:{kcal:350,prot:7,gluc:78,lip:1}},{id:'pa',name:'Pâtes blanches',qty:1000,unit:'g',mac100:{kcal:350,prot:12,gluc:72,lip:1.5}},{id:'th',name:'Thon en conserve',qty:400,unit:'g',mac100:{kcal:116,prot:26,gluc:0,lip:1}},{id:'st',name:'Sauce tomate',qty:500,unit:'g',mac100:{kcal:35,prot:1.5,gluc:6,lip:0.5}}],epices:[]};`);
  LS.anthropic_key='gsk_x';const corps=[];
  const rep=JSON.stringify([{name:'Poulet au riz',slots:['lunch'],kcal:600,prot:50,gluc:70,lip:8,ingredients:[{id:'po',name:'Poulet',qty:150},{id:'ri',name:'Riz',qty:80}],steps:['Cuire le riz.','Saisir le poulet.','Servir le poulet sur le riz.']}]);
  sb.fetch=async(url,opt)=>{const b=JSON.parse(opt.body);corps.push(b);
    if(b.model==='openai/gpt-oss-120b'&&corps.length===1)return{ok:true,status:200,json:async()=>({error:{message:'Request too large for model openai/gpt-oss-120b: Limit 8000, Requested 9000 tokens per minute (TPM)'}})};
    return{ok:true,status:200,json:async()=>({choices:[{message:{content:rep},finish_reason:'stop'}]})};};
  await X('generateStockRecipes')();
  eq(corps[0].model,'openai/gpt-oss-120b');eq(corps[0].reasoning_effort,'medium');eq(corps[1].model,'openai/gpt-oss-20b','repli');
  eq(X('S.aiRecipes.length'),1);
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
