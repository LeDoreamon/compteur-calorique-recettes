const {sb}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;
const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);

console.log('\n=== IIIA. Suppression d\'un repas ===');
let questions=[],reponse=true;
sb.confirm=m=>{questions.push(m);return reponse;};
const clic=(day,idx)=>X('_onActionClick')({target:{closest:()=>({dataset:{action:'delete-meal',day:day,idx:String(idx)}})}});
function prepa(){
  X("_loaded=true;S.mainTab='recipes';S.inv={frigo:[{id:'p',name:'Poulet',qty:200,unit:'g'}],congelateur:[],placards:[],epices:[]};");
  X("S.dayMeals={};S.dayMeals[S.today]=[{name:'Bol poulet riz',macros:{kcal:500,prot:40,gluc:50,lip:10}}];");
  questions=[];
}
t('*** refuser la confirmation garde le repas ***',()=>{
  prepa();reponse=false;clic(X('S.today'),0);
  eq(X('S.dayMeals[S.today].length'),1);
  eq(questions.length,1,'nombre de questions');
});
t('accepter supprime le repas',()=>{
  prepa();reponse=true;clic(X('S.today'),0);
  eq(X('S.dayMeals[S.today].length'),0);
});
t('le message nomme le repas et le jour',()=>{
  prepa();reponse=false;clic(X('S.today'),0);
  if(questions[0].indexOf('« Bol poulet riz »')<0)throw new Error(questions[0]);
  if(questions[0].indexOf("d'aujourd'hui")<0)throw new Error(questions[0]);
});
t('un repas d\'hier est annonce comme tel',()=>{
  const hier=X('shiftDate(S.today,-1)');
  X("S.dayMeals['"+hier+"']=[{name:'Omelette',macros:{kcal:300,prot:20,gluc:2,lip:20}}];");
  questions=[];reponse=false;clic(hier,0);
  if(questions[0].indexOf("d'hier")<0)throw new Error(questions[0]);
});
t('un index perime ne pose pas de question',()=>{
  prepa();clic(X('S.today'),5);
  eq(questions.length,0);
});
t('la croix offre une zone de tap de 40 px',()=>{
  prepa();
  const h=X('renderMacros()');
  const m=h.match(/data-action="delete-meal"[^>]*style="([^"]*)"/);
  if(!m||m[1].indexOf('width:40px')<0||m[1].indexOf('height:40px')<0)throw new Error('style : '+(m&&m[1]));
});

console.log('\n=== IIIB. Service worker : reseau, delai, cache ===');
function monteSW(){
  const ecouteurs={},cache=new Map(),minuteries=[];
  const ctx={
    self:{addEventListener:(t,f)=>{ecouteurs[t]=f;},skipWaiting(){},clients:{claim:()=>Promise.resolve()}},
    caches:{
      open:async()=>({put:async(req,r)=>{cache.set(req.url,r);}}),
      match:async req=>cache.get(req.url),
      keys:async()=>[],delete:async()=>true},
    fetch:null,
    setTimeout:(f,d)=>{minuteries.push({f,d});return minuteries.length;},
    clearTimeout:id=>{if(minuteries[id-1])minuteries[id-1].f=null;},
    Response:{error:()=>({type:'error'})},Promise,
  };
  vm.createContext(ctx);vm.runInContext(fs.readFileSync('sw.js','utf8'),ctx);
  const requete=(url,method)=>{
    let promesse=null;
    ecouteurs.fetch({request:{url,method:method||'GET'},respondWith:p=>{promesse=p;}});
    return promesse;
  };
  const avance=ms=>{minuteries.forEach(m=>{if(m.f&&m.d<=ms){const f=m.f;m.f=null;f();}});};
  return {ctx,cache,requete,avance};
}
const rep=(status,corps,type)=>({ok:status>=200&&status<300,status,type:type||'basic',corps,clone(){return this;}});
const tick=()=>new Promise(r=>setImmediate(r));
t('*** reseau rapide : reponse du reseau, mise en cache ***',async()=>{
  const w=monteSW();w.ctx.fetch=async()=>rep(200,'neuf');
  const r=await w.requete('https://x/index.html');
  eq(r.corps,'neuf');await tick();eq(w.cache.get('https://x/index.html').corps,'neuf');
});
t('*** reseau lent : la copie en cache est servie a 6 s ***',async()=>{
  const w=monteSW();w.cache.set('https://x/index.html',rep(200,'ancien'));
  let finir;w.ctx.fetch=()=>new Promise(r=>{finir=r;});
  let servie=null;w.requete('https://x/index.html').then(r=>{servie=r;});
  await tick();w.avance(5999);await tick();eq(servie,null,'servie trop tot');
  w.avance(6000);await tick();await tick();eq(servie&&servie.corps,'ancien');
  finir(rep(200,'neuf'));await tick();await tick();
  eq(w.cache.get('https://x/index.html').corps,'neuf','cache pas mis a jour');
});
t('le delai est bien de 6 s',()=>{
  if(!/DELAI_RESEAU=6000/.test(fs.readFileSync('sw.js','utf8')))throw new Error('delai');
});
t('reseau lent sans copie en cache : on attend le reseau',async()=>{
  const w=monteSW();let finir;w.ctx.fetch=()=>new Promise(r=>{finir=r;});
  let servie=null;w.requete('https://x/a.png').then(r=>{servie=r;});
  w.avance(6000);await tick();await tick();eq(servie,null);
  finir(rep(200,'img'));await tick();await tick();eq(servie&&servie.corps,'img');
});
t('*** une erreur 404 n\'ecrase pas la copie en cache ***',async()=>{
  const w=monteSW();w.cache.set('https://x/index.html',rep(200,'bon'));
  w.ctx.fetch=async()=>rep(404,'introuvable');
  const r=await w.requete('https://x/index.html');await tick();
  eq(r.corps,'bon');eq(w.cache.get('https://x/index.html').corps,'bon');
});
t('erreur serveur sans copie : la reponse du serveur passe',async()=>{
  const w=monteSW();w.ctx.fetch=async()=>rep(500,'panne');
  eq((await w.requete('https://x/b.js')).status,500);
  eq(w.cache.has('https://x/b.js'),false);
});
t('hors ligne : copie en cache, sinon erreur reseau',async()=>{
  const w=monteSW();w.cache.set('https://x/index.html',rep(200,'bon'));
  w.ctx.fetch=async()=>{throw new Error('offline');};
  eq((await w.requete('https://x/index.html')).corps,'bon');
  eq((await w.requete('https://x/autre')).type,'error');
});
t('image d\'un autre site (opaque) : toujours mise en cache',async()=>{
  const w=monteSW();w.ctx.fetch=async()=>({ok:false,status:0,type:'opaque',clone(){return this;}});
  await w.requete('https://upload.wikimedia.org/i.jpg');await tick();
  eq(w.cache.has('https://upload.wikimedia.org/i.jpg'),true);
});
t('POST, Groq, Firebase et Google ne passent pas par le service worker',()=>{
  const w=monteSW();w.ctx.fetch=async()=>rep(200,'x');
  eq(w.requete('https://x/index.html','POST'),null,'POST');
  ['https://api.groq.com/v1','https://bouffe-frigo-default-rtdb.europe-west1.firebasedatabase.app/a.json',
   'https://securetoken.googleapis.com/v1/token','https://world.openfoodfacts.org/api']
    .forEach(u=>eq(w.requete(u),null,u));
});
t('build identique dans sw.js et index.html',()=>{
  const b=fs.readFileSync('sw.js','utf8').match(/build (\d{4}-\d\d-\d\d \d\dh\d\d)/)[1];
  if(fs.readFileSync('index.html','utf8').indexOf('build '+b)<0)throw new Error('index.html pas au build '+b);
  const c=fs.readFileSync('sw.js','utf8').match(/CACHE='macros-([\d-]+)'/)[1];
  eq(c,b.replace(' ','-').replace('h',''),'nom du cache');
});

(async()=>{
  for(const [n,f] of tests){
    try{await f();pass++;console.log('  ok  '+n);}
    catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}
  }
  console.log('---- '+pass+' ok, '+fail+' KO');
})();
