const {sb,reg,docEl}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;
const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
let puts=[],reponses=[];
sb.fetch=async(u,o)=>{
  if(o&&o.method==='PUT')puts.push(u.split('?')[0].replace(/.*\.app\//,''));
  const r=reponses.length?reponses.shift():{ok:true,status:200,body:null};
  return {ok:r.ok,status:r.status,json:async()=>r.body};
};
const stock={};
sb.localStorage={getItem:k=>k in stock?stock[k]:null,setItem:(k,v)=>{stock[k]=String(v);},removeItem:k=>{delete stock[k];}};

console.log('\n=== IA. Restauration d\'une sauvegarde d\'un autre profil ===');
t('*** une sauvegarde exportee sous "liam" se restaure dans un compte ***',async()=>{
  X("ACTIVE_PROFILE='users/abc';_loaded=true;S.inv={frigo:[{id:'a',name:'Actuel',qty:1}],congelateur:[],placards:[],epices:[]};S.dayMeals={};");
  const sv={state:{_profile:'liam',rev:5,inv:{frigo:[{id:'p',name:'Poulet sauvegardé',qty:500}]},dayMeals:{'2026-09-01':[{rid:'x'}]}},burn:null,photos:null};
  await X('_restaurerSauvegarde')(sv);
  eq(X("S.inv.frigo.map(x=>x.name).join()"),'Poulet sauvegardé');
  eq(X("Object.keys(S.dayMeals).join()"),'2026-09-01');
});
t('le fichier d\'origine n\'est pas modifie et la cle Groq eventuelle est ignoree',async()=>{
  X("ACTIVE_PROFILE='users/abc';_loaded=true;");
  stock.anthropic_key='ma-cle';
  const st={_profile:'liam',inv:{frigo:[]},dayMeals:{},groqKey:'cle-etrangere'};
  await X('_restaurerSauvegarde')({state:st,burn:null,photos:null});
  eq(st._profile,'liam','objet source modifie');
  eq(stock.anthropic_key,'ma-cle');
});
t('un etat distant d\'un autre profil reste ignore au chargement normal',()=>{
  X("ACTIVE_PROFILE='users/abc';S.inv={frigo:[{id:'a',name:'Actuel',qty:1}],congelateur:[],placards:[],epices:[]};");
  X('_applyState')({_profile:'users/zzz',inv:{frigo:[{id:'b',name:'Autre',qty:1}]}});
  eq(X("S.inv.frigo[0].name"),'Actuel');
});

console.log('\n=== IB. Produits OpenFoodFacts ===');
t('*** un nom de produit piege n\'entre pas tel quel dans la page ***',async()=>{
  X("_loaded=true;S.mainTab='courses';S.shop={list:[],graveyard:[]};_scanMode='shop';");
  reponses=[{ok:true,status:200,body:{status:1,product:{product_name:'<img src=x onerror=alert(1)>',nutriments:{'energy-kcal_100g':100},quantity:'"><b>'}}}];
  await X('lookupBarcode')('3017620422003');
  const h=Object.values(reg).map(e=>e.innerHTML||'').join('');
  if(h.indexOf('<img src=x')>=0)throw new Error('balise injectee');
  const it=X("S.shop.list[S.shop.list.length-1]");
  if(!it||/[<>"]/.test(it.name+it.pkg))throw new Error('nom non neutralise : '+(it&&it.name));
});
t('un produit sans nom garde son nom de repli',async()=>{
  X("S.shop={list:[],graveyard:[]};_scanMode='shop';");
  reponses=[{ok:true,status:200,body:{status:1,product:{nutriments:{}}}}];
  await X('lookupBarcode')('12345678');
  eq(X("S.shop.list[0].name"),'Produit 12345678');
});

console.log('\n=== IC. Deconnexion ===');
t('*** la deconnexion retire la cle Groq de l\'appareil ***',()=>{
  stock.anthropic_key='gsk_x';stock.dz_auth=JSON.stringify({uid:'u',rtok:'r'});
  sb.confirm=()=>true;
  X('deconnexion')();
  if('anthropic_key' in stock)throw new Error('cle restee');
  if('dz_auth' in stock)throw new Error('session restee');
});
t('la cle revient a la reconnexion depuis l\'etat du compte',()=>{
  X("ACTIVE_PROFILE='users/abc';");
  X('_applyState')({_profile:'users/abc',inv:{frigo:[]},dayMeals:{},groqKey:'gsk_x'});
  eq(stock.anthropic_key,'gsk_x');
});

console.log('\n=== ID. Session revoquee ailleurs ===');
t('*** jeton refuse (mot de passe change) : l\'ecran de connexion s\'ouvre, pre-rempli ***',async()=>{
  stock.dz_auth=JSON.stringify({uid:'u',rtok:'vieux',login:'liam@mail.fr'});
  X("_fbTok=null;_fbTokExp=0;_expireeSignalee=false;");
  reponses=[{ok:false,status:400,body:{error:{message:'TOKEN_EXPIRED'}}}];
  const tok=await X('fbAuthToken')();
  eq(tok,null);
  eq(X("_auth.mode"),'connexion');
  if(!/expir/i.test(X("_auth.err")))throw new Error('pas de message');
  const h=docEl('profile-screen').innerHTML;
  if(h.indexOf('value="liam@mail.fr"')<0)throw new Error('identifiant non pre-rempli');
});
t('les donnees locales ne sont pas effacees',()=>{
  if(!('dz_auth' in stock))throw new Error('session supprimee avant reconnexion');
});
t('on ne rouvre pas l\'ecran a chaque appel',async()=>{
  X("_fbTok=null;_fbTokExp=0;_auth.mode='accueil';");
  reponses=[{ok:false,status:400,body:{error:{message:'TOKEN_EXPIRED'}}}];
  await X('fbAuthToken')();
  eq(X("_auth.mode"),'accueil');
});
t('une panne reseau n\'est pas prise pour une session expiree',async()=>{
  X("_fbTok=null;_fbTokExp=0;_expireeSignalee=false;_auth.mode='accueil';");
  reponses=[{ok:false,status:503,body:{}}];
  await X('fbAuthToken')();
  eq(X("_auth.mode"),'accueil');
});

console.log('\n=== IE. Budgets IA ===');
t('*** reponse vide coupee : une seconde tentative, plus large ***',async()=>{
  stock.anthropic_key='gsk_x';
  const vus=[];
  sb.fetch=async(u,o)=>{const b=JSON.parse(o.body);vus.push(b.max_tokens);
    return {ok:true,status:200,json:async()=>(vus.length===1?{choices:[{message:{content:''},finish_reason:'length'}]}:{choices:[{message:{content:'42'},finish_reason:'stop'}]})};};
  const r=await X('callAI')([{role:'user',content:'x'}],20,null,'openai/gpt-oss-20b',0);
  eq(r.content[0].text,'42');eq(vus.length,2);
  if(!(vus[1]>=800))throw new Error('budget de relance '+vus[1]);
});
t('pas de relance en boucle',async()=>{
  let n=0;
  sb.fetch=async()=>{n++;return {ok:true,status:200,json:async()=>({choices:[{message:{content:''},finish_reason:'length'}]})};};
  const r=await X('callAI')([{role:'user',content:'x'}],20,null,'openai/gpt-oss-20b',0);
  eq(n,2);eq(r.empty,true);
});
t('qwen n\'est pas relance (pas de reflexion)',async()=>{
  let n=0;
  sb.fetch=async()=>{n++;return {ok:true,status:200,json:async()=>({choices:[{message:{content:''},finish_reason:'length'}]})};};
  await X('callAI')([{role:'user',content:'x'}],20,null,'qwen/qwen3.8-27b',0);
  eq(n,1);
});
t('budgets releves dans le code',()=>{
  if(/content:prompt\}\],20,/.test(src))throw new Error('budget 20 encore present');
  if(/\],200,sys,null,0,7\)/.test(src))throw new Error('budget 200 encore present');
});
t('*** l\'estimation d\'activite prend la pesee la plus recente en date ***',()=>{
  const i=src.indexOf('async function burnEstimateActivity');
  if(src.slice(i,i+1400).indexOf('_poidsCourant()')<0)throw new Error('pas _poidsCourant');
});

(async()=>{
  for(const [n,f] of tests){
    try{await f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}
    puts=[];reponses=[];
  }
  console.log('\n---- '+pass+' ok, '+fail+' KO');
})();
