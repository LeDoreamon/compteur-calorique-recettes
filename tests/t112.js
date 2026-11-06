// Retours de Liam du 06/11/2026 : inscription par e-mail, points a corriger moins sensibles, photo plus rapide,
// recalcul d'une ligne mal reconnue, guide d'utilisation dans les reglages
const {sb,docEl}=require('./sb.js');
const vm=require('vm');
const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const S=sb.S;
const src=fs.readFileSync('index.html','utf8');
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
const GK='AIza'+'SyDummyDummyDummyDummyDummyDumm0';
let appels=[];
function serveur(gem,groq){appels=[];let n=0;sb.fetch=async(url,opt)=>{const body=opt&&opt.body?JSON.parse(opt.body):null;appels.push({url,body});
  if(/generativelanguage/.test(url)){const r=Array.isArray(gem)?gem[Math.min(n++,gem.length-1)]:gem;return {ok:true,status:200,json:async()=>r};}
  if(/api\.groq\.com/.test(url))return {ok:true,status:200,json:async()=>groq};
  return {ok:true,status:200,json:async()=>null};};}
const photo=[{role:'user',content:[{type:'text',text:'Analyse ce repas'},{type:'image',source:{type:'base64',media_type:'image/jpeg',data:'AAAA'}}]}];
const OKG={candidates:[{content:{parts:[{text:'{"via":"gemini"}'}]},finishReason:'STOP'}]};
const voisins=inv=>{S.inv={frigo:inv,placards:[],congelateur:[],epices:[]};S.paires0k={};return X('paires0k()').map(x=>x.plein.it.id+'>'+x.vide.it.id).sort().join(' ');};

console.log('\n=== LXXXV. Retours du 06/11/2026 ===');
t('*** points a corriger : « fromage blanc » et « fromage râpé » ne sont plus rapproches ***',()=>{
  eq(voisins([{id:'fb',name:'Fromage blanc',qty:0,unit:'g'},{id:'fr',name:'Fromage râpé',qty:200,unit:'g'}]),'');
  eq(voisins([{id:'ss',name:'Sauce soja sucrée',qty:0,unit:'ml'},{id:'st',name:'Sauce tomate',qty:400,unit:'g'}]),'','sauces');
});
t('*** mais un vrai remplacant reste signale : tous les mots du nom court, ou deux mots en commun ***',()=>{
  eq(voisins([{id:'l',name:'Lait',qty:0,unit:'ml'},{id:'ls',name:'Lait sans lactose',qty:1000,unit:'ml'}]),'ls>l');
  eq(voisins([{id:'c1',name:'Crème fraîche légère',qty:0,unit:'g'},{id:'c2',name:'Crème fraîche épaisse',qty:200,unit:'g'}]),'c2>c1');
  eq(X("_nomsVoisins(['fromage','fromage'],['fromage','rape'])"),false,'mot repete compte une fois');
});
t('*** inscription : adresse e-mail obligatoire, exemple generique ***',async()=>{
  X("afficherEcranConnexion('accueil');_authMode('inscription')");
  let h=docEl('profile-screen').innerHTML;
  if(/liam/i.test(h))throw new Error('exemple au prenom de Liam');
  if(h.indexOf('ex. prenom@exemple.fr')<0||h.indexOf('Adresse e-mail')<0)throw new Error('champ e-mail');
  docEl('au-login').value='alex';docEl('au-mdp').value='secret1';docEl('au-mdp2').value='secret1';
  await X('etapeInscription')(1);eq(sb.window._ins.etape,0,'simple identifiant accepte');
  if(docEl('profile-screen').innerHTML.indexOf('récupérer ton compte')<0)throw new Error('message');
  docEl('au-login').value='alex@exemple.fr';docEl('au-mdp').value='secret1';docEl('au-mdp2').value='secret1';
  await X('etapeInscription')(1);eq(sb.window._ins.etape,1,'e-mail refuse');
});
t('connexion : un ancien compte a identifiant se connecte toujours avec lui',()=>{
  X("_authMode('connexion')");const h=docEl('profile-screen').innerHTML;
  if(h.indexOf('E-mail ou identifiant')<0)throw new Error('libelle');if(/liam/i.test(h))throw new Error('exemple');
  eq(X("_emailDe('alex')"),'alex@dorayaki.invalid');eq(X("_emailDe('Alex@Exemple.fr')"),'alex@exemple.fr');
});
t('*** photo via Gemini : reflexion bornee ; texte : rien de change ***',async()=>{
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;serveur(OKG);
  await X('callAI')(photo,1300,'sys');
  eq(appels[0].body.generationConfig.thinkingConfig.thinkingBudget,512);
  serveur(OKG);await X('_callGemini')([{role:'user',content:'Bonjour'}],400,'sys');
  eq(appels[0].body.generationConfig.thinkingConfig,undefined,'texte');
});
t('*** modele qui refuse la borne : relance une fois sans elle ***',async()=>{
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;
  serveur([{error:{code:400,status:'INVALID_ARGUMENT',message:'thinking_budget is not supported by this model'}},OKG]);
  const r=await X('_callGemini')(photo,1300,'sys');eq(r.content[0].text,'{"via":"gemini"}');
  eq(appels.length,2);eq(appels[1].body.generationConfig.thinkingConfig,undefined,'relance');
});
t('*** ligne mal reconnue : mode d\'emploi visible, bouton ↻, recalcul de cette ligne seule (fibres gardees) ***',async()=>{
  LS.anthropic_key='gsk_x';delete LS.gemini_key;
  serveur(null,{choices:[{message:{content:'{"n":"Paris-brest","q":90,"u":"g","kcal":370,"prot":7,"gluc":33,"lip":24,"fib":1.2}'},finish_reason:'stop'}]});
  X(`_addMealInvSuggestions=[];_addMealFreeItems=[{n:'Croissant',qty:1,baseQty:1,unit:'pc',m:{kcal:230,prot:5,gluc:26,lip:12},pu:{kcal:230,prot:5,gluc:26,lip:12}},
     {n:'Café',qty:1,baseQty:1,unit:'pc',m:{kcal:2,prot:0,gluc:0,lip:0},pu:{kcal:2,prot:0,gluc:0,lip:0}}];renderInvSuggestions([])`);
  const h=docEl('inv-items-section').innerHTML;
  if(h.indexOf('aide-recalcul')<0||h.indexOf('Corrige son nom')<0)throw new Error('mode d\'emploi');
  if(h.indexOf('✦')>=0||h.indexOf('↻')<0)throw new Error('bouton');
  docEl('free-nom-0').value='Paris-brest';await X('reestimerLigne')(0);
  const L=X('_addMealFreeItems');eq(L[0].n,'Paris-brest');eq(L[0].m.kcal,370);eq(L[0].m.fib,1.2);eq(L[1].n,'Café','autre ligne touchee');
  if(!/Paris-brest/.test(appels[0].body.messages.map(m=>typeof m.content==='string'?m.content:'').join(' ')))throw new Error('nom corrige non envoye');
});
t('*** « Effacer les recettes IA » garde les favorites ***',()=>{
  X(`S.favs=['ia1'];S.aiRecipes=[{id:'ia1',name:'A',ai:true},{id:'ia2',name:'B',ai:true}];RCP.push({id:'ia1',name:'A',ai:true},{id:'ia2',name:'B',ai:true});clearAIRecipes()`);
  eq(X('S.aiRecipes.map(r=>r.id).join()'),'ia1');eq(X("RCP.some(r=>r.id==='ia1')"),true);eq(X("RCP.some(r=>r.id==='ia2')"),false);
});
t('*** reglages : le guide d\'utilisation en PDF, fichier present ***',()=>{
  if(!/<a id="set-guide" href="guide\.pdf"[^>]*>📖 Guide d'utilisation \(PDF\)<\/a>/.test(src))throw new Error('lien');
  const b=fs.readFileSync('guide.pdf');eq(b.slice(0,5).toString(),'%PDF-');
  if(b.length>8e6)throw new Error('guide trop lourd : '+b.length);
});
const INV_REC=`_loaded=true;S.favs=[];S.aiRecipes=[];S.inv={frigo:[{id:'po',name:'Poulet',qty:1000,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}}],congelateur:[],placards:[{id:'ri',name:'Riz',qty:1000,unit:'g',mac100:{kcal:350,prot:7,gluc:78,lip:1}},{id:'pa',name:'Pâtes blanches',qty:1000,unit:'g',mac100:{kcal:350,prot:12,gluc:72,lip:1.5}},{id:'th',name:'Thon en conserve',qty:400,unit:'g',mac100:{kcal:116,prot:26,gluc:0,lip:1}},{id:'st',name:'Sauce tomate',qty:500,unit:'g',mac100:{kcal:35,prot:1.5,gluc:6,lip:0.5}}],epices:[]};`;
const REP_REC=JSON.stringify([{name:'Poulet au riz',slots:['lunch'],kcal:600,prot:50,gluc:70,lip:8,ingredients:[{id:'po',name:'Poulet',qty:150},{id:'ri',name:'Riz',qty:80}],steps:['Cuire le riz.','Saisir le poulet.','Servir le poulet sur le riz.']}]);
const TPM={error:{message:'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_x` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 6851, Requested 5485. Please try again in 32.52s.'}};
t('*** recettes avec les deux cles : quota du 120b atteint → Groq 20b AVANT Gemini (rapport de Liam du 06/11) ***',async()=>{
  X(INV_REC);LS.anthropic_key='gsk_x';LS.gemini_key=GK;const vus=[],attentes=[];
  const st=sb.setTimeout;sb.setTimeout=(f,ms)=>{attentes.push(ms);return st(f,ms>1000?0:ms);};   /* pas de vraie attente */
  try{
    sb.fetch=async(url,opt)=>{const b=JSON.parse(opt.body);
      if(/generativelanguage/.test(url)){vus.push('gemini');return{ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:REP_REC}]},finishReason:'STOP'}]})};}
      vus.push(b.model);
      if(b.model==='openai/gpt-oss-120b')return{ok:true,status:200,json:async()=>TPM};
      return{ok:true,status:200,json:async()=>({choices:[{message:{content:REP_REC},finish_reason:'stop'}]})};};
    await X('generateStockRecipes')();
  }finally{sb.setTimeout=st;}
  eq(vus[0],'openai/gpt-oss-120b');eq(vus.indexOf('gemini'),-1,'Gemini appele avant le 20b : '+vus.join(' > '));
  eq(vus[vus.length-1],'openai/gpt-oss-20b');eq(X('S.aiRecipes.length'),1);
  eq(vus.filter(m=>m==='openai/gpt-oss-120b').length,1,'120b retente');eq(attentes.indexOf(34020),-1,'attente de 34 s avant le 20b');
});
t('*** ... et si le 20b echoue aussi, Gemini prend le relais ***',async()=>{
  X(INV_REC);LS.anthropic_key='gsk_x';LS.gemini_key=GK;const vus=[];
  const st=sb.setTimeout;sb.setTimeout=(f,ms)=>st(f,ms>1000?0:ms);
  try{
    sb.fetch=async(url,opt)=>{const b=JSON.parse(opt.body);
      if(/generativelanguage/.test(url)){vus.push('gemini');return{ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:REP_REC}]},finishReason:'STOP'}]})};}
      vus.push(b.model);return{ok:true,status:200,json:async()=>TPM};};
    await X('generateStockRecipes')();
  }finally{sb.setTimeout=st;}
  eq(vus[vus.length-1],'gemini',vus.join(' > '));eq(X('S.aiRecipes.length'),1);
});
t('Gemini : 90 s pour une longue reponse (recettes), 45 s sinon',()=>{
  eq(X('GEMINI_DELAI_LONG'),90000);
  if(!/\(maxTokens\|\|0\)>=2000\?GEMINI_DELAI_LONG:45000/.test(src))throw new Error('delai');
});
t('« Quoi de neuf » : plus de message aux collegues dans la derniere version',()=>{
  const n=X('NOUVEAUTES[0]');if(JSON.stringify(n.points).indexOf('Coucou')>=0)throw new Error('message encore la');
});

(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' -> '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
