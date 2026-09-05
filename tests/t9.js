// Sandbox dédié : réseau et localStorage simulés, pour tester la synchro
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;
function t(n,f){return f().then(()=>{console.log('  ok  '+n);pass++;})
  .catch(e=>{console.log('  KO  '+n+' -> '+e.message);fail++;});}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}

function build(opts){
  opts=opts||{};
  const net={coupe:!!opts.horsLigne};
  const serveur={state:opts.serveur||null,burn:{}};
  const local={};
  const journal=[];
  let js=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  js+='\n;["S","saveState","loadState","_applyState","render","getToday"].forEach(function(n){try{globalThis[n]=eval(n);}catch(e){}});';
  js+='\n;try{globalThis.__rev=function(){return _stateRev;};globalThis.__setLoaded=function(v){_loaded=v;};}catch(e){}';
  const reg={};
  function makeEl(){return{value:'',checked:false,textContent:'',innerHTML:'',className:'',style:{},
    cssText:'',dataset:{},offsetWidth:100,placeholder:'',
    classList:{add(){},remove(){},contains:()=>false,toggle(){}},focus(){},appendChild(){},
    setAttribute(){},getAttribute(){return null;},querySelector(){return null;},
    querySelectorAll(){return[];},addEventListener(){},files:[]};}
  const docEl=id=>{if(!reg[id])reg[id]=makeEl();return reg[id];};
  const RD=Date;class FD extends RD{getHours(){return 12;}}
  const sb={console:{log(){},warn(){},error(){}},Math,Date:FD,JSON,parseFloat,parseInt,isNaN,isFinite,
   Array,Object,String,Number,Boolean,RegExp,Promise,Map,Set,encodeURIComponent,decodeURIComponent,
   document:{getElementById:docEl,querySelector:()=>null,querySelectorAll:()=>[],
     createElement:()=>makeEl(),addEventListener(){},hidden:false,
     body:{appendChild(e){reg['coach-toast']=e;}},documentElement:makeEl(),head:makeEl()},
   localStorage:{getItem:k=>(k in local?local[k]:null),setItem(k,v){local[k]=String(v);},removeItem(k){delete local[k];}},
   sessionStorage:{getItem:()=>null,setItem(){}},
   navigator:{userAgent:'node'},alert(){},confirm:()=>true,prompt:()=>'',
   setTimeout(f,d){return global.setTimeout(f,Math.min(d||0,40));},
   clearTimeout(id){return global.clearTimeout(id);},setInterval(){},clearInterval(){},requestAnimationFrame(){},
   AbortController:class{constructor(){this.signal={};}abort(){}},
   URL:{createObjectURL:()=>''},Blob:function(){},Image:function(){},
   location:{href:''},history:{pushState(){}},addEventListener(){},removeEventListener(){},
   matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),
   fetch:async(url,init)=>{
     const u=String(url);
     journal.push((init&&init.method||'GET')+' '+u.split('?')[0].split('.app/')[1]);
     if(u.includes('identitytoolkit')||u.includes('securetoken'))
       return {ok:true,json:async()=>({idToken:'TOK',expiresIn:'3600',refreshToken:'RT'})};
     if(net.coupe)throw new Error('reseau coupe');
     const m=(init&&init.method)||'GET';
     if(u.includes('/state/rev')) return {ok:true,json:async()=>(serveur.state?serveur.state.rev:null)};
     if(u.includes('/state')){
       if(m==='PUT'){serveur.state=JSON.parse(init.body);return {ok:true,status:200};}
       return {ok:true,json:async()=>serveur.state};
     }
     if(u.includes('/burn')){
       if(m==='PUT')return {ok:true,status:200};
       return {ok:true,json:async()=>({})};
     }
     if(u.includes('/backups')){return {ok:true,json:async()=>({}),status:200};}
     return {ok:true,json:async()=>null};
   }};
  sb.window=sb;sb.globalThis=sb;sb.self=sb;
  vm.createContext(sb);vm.runInContext(js,sb,{filename:'a.js'});
  return {sb,serveur,local,journal,reg,net};
}
const attendre=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
console.log('\n=== Z1. Enregistrement nominal ===');
await t('saveState ecrit sur le serveur et incremente la revision',async()=>{
  const e=build({serveur:{rev:3,savedAt:'2026-08-01T10:00:00Z',inv:{frigo:[]},dayMeals:{}}});
  await e.sb.loadState();
  e.sb.S.dayMeals['2026-08-21']=[{rid:'a',name:'X',mult:1,macros:{kcal:100,prot:1,gluc:1,lip:1}}];
  await e.sb.saveState();
  if(e.serveur.state.rev<=3)throw new Error("revision non incrementee: "+e.serveur.state.rev);
  if(!e.serveur.state.dayMeals['2026-08-21'])throw new Error('repas non envoye');
});

console.log('\n=== Z2. Serialisation (point 2) ===');
await t('*** trois saveState simultanes ne s\'ecrasent pas ***',async()=>{
  const e=build({serveur:{rev:1,savedAt:'2026-08-01T10:00:00Z',inv:{frigo:[]},dayMeals:{}}});
  await e.sb.loadState();
  e.sb.S.dayMeals['j1']=[{rid:'a',name:'A',mult:1,macros:{kcal:100,prot:1,gluc:1,lip:1}}];
  const p1=e.sb.saveState();
  e.sb.S.dayMeals['j2']=[{rid:'b',name:'B',mult:1,macros:{kcal:200,prot:2,gluc:2,lip:2}}];
  const p2=e.sb.saveState();
  e.sb.S.dayMeals['j3']=[{rid:'c',name:'C',mult:1,macros:{kcal:300,prot:3,gluc:3,lip:3}}];
  const p3=e.sb.saveState();
  await Promise.all([p1,p2,p3]);
  await attendre(30);
  const st=e.serveur.state;
  if(!st.dayMeals.j1||!st.dayMeals.j2||!st.dayMeals.j3)
    throw new Error('donnees perdues : '+Object.keys(st.dayMeals).join(','));
});
await t('la revision ne recule jamais',async()=>{
  const e=build({serveur:{rev:5,savedAt:'2026-08-01T10:00:00Z',inv:{frigo:[]},dayMeals:{}}});
  await e.sb.loadState();
  const revs=[];
  for(let i=0;i<4;i++){
    e.sb.S.dayMeals['x'+i]=[{rid:'a',name:'X',mult:1,macros:{kcal:10,prot:1,gluc:1,lip:1}}];
    await e.sb.saveState();
    revs.push(e.serveur.state.rev);
  }
  for(let i=1;i<revs.length;i++)if(revs[i]<=revs[i-1])throw new Error('revisions: '+revs.join(','));
});

console.log('\n=== Z3. Recuperation hors ligne (point 1) ===');
await t('*** une saisie faite hors ligne survit au redemarrage ***',async()=>{
  const e=build({serveur:{rev:2,savedAt:'2026-08-01T10:00:00Z',inv:{frigo:[]},dayMeals:{}}});
  await e.sb.loadState();
  await attendre(30);
  const revAvant=e.serveur.state.rev;
  e.net.coupe=true;                       // le reseau tombe
  e.sb.S.dayMeals['2026-08-21']=[{rid:'z',name:'Repas hors ligne',mult:1,macros:{kcal:777,prot:7,gluc:7,lip:7}}];
  await e.sb.saveState();                 // echoue cote reseau, reussit en local
  await attendre(30);
  eq(e.serveur.state.rev,revAvant,'le serveur ne doit pas avoir bouge');
  // l'app est fermee puis relancee, reseau revenu
  const e2=build({serveur:e.serveur.state});
  Object.assign(e2.local,e.local);
  await e2.sb.loadState();
  const j=e2.sb.S.dayMeals['2026-08-21'];
  if(!j||!j.length)throw new Error('repas hors ligne PERDU');
  eq(j[0].macros.kcal,777,'kcal');
});
await t('la saisie recuperee est renvoyee au serveur',async()=>{
  const e=build({serveur:{rev:2,savedAt:'2026-08-01T10:00:00Z',inv:{frigo:[]},dayMeals:{}}});
  await e.sb.loadState();
  await attendre(30);
  e.net.coupe=true;
  e.sb.S.dayMeals['jx']=[{rid:'z',name:'R',mult:1,macros:{kcal:500,prot:5,gluc:5,lip:5}}];
  await e.sb.saveState();
  await attendre(30);
  const e2=build({serveur:e.serveur.state});
  Object.assign(e2.local,e.local);
  await e2.sb.loadState();
  await attendre(400);
  if(!e2.serveur.state.dayMeals['jx'])throw new Error('non renvoye au serveur');
});
await t('*** un autre appareil plus recent gagne (pas de retour en arriere) ***',async()=>{
  // local ancien (rev 2), serveur plus recent (rev 7, ecrit par Maureen)
  const e=build({serveur:{rev:7,savedAt:'2026-08-20T10:00:00Z',inv:{frigo:[]},
                          dayMeals:{'maureen':[{rid:'m',name:'Sien',mult:1,macros:{kcal:1,prot:1,gluc:1,lip:1}}]}}});
  e.local['liam_st']=JSON.stringify({rev:2,savedAt:'2026-08-01T10:00:00Z',inv:{frigo:[]},
                          dayMeals:{'vieux':[{rid:'v',name:'Vieux',mult:1,macros:{kcal:9,prot:1,gluc:1,lip:1}}]}});
  await e.sb.loadState();
  if(!e.sb.S.dayMeals['maureen'])throw new Error('la version serveur aurait du gagner');
  if(e.sb.S.dayMeals['vieux'])throw new Error('vieille version locale appliquee a tort');
});
await t('local et serveur a egalite : le serveur fait foi',async()=>{
  const st={rev:4,savedAt:'2026-08-10T10:00:00Z',inv:{frigo:[]},dayMeals:{'s':[{rid:'s',name:'S',mult:1,macros:{kcal:1,prot:1,gluc:1,lip:1}}]}};
  const e=build({serveur:st});
  e.local['liam_st']=JSON.stringify({rev:4,savedAt:'2026-08-10T10:00:00Z',inv:{frigo:[]},dayMeals:{'l':[]}});
  await e.sb.loadState();
  if(!e.sb.S.dayMeals['s'])throw new Error('serveur non applique');
});
await t('localStorage corrompu : on retombe sur le serveur',async()=>{
  const e=build({serveur:{rev:3,savedAt:'2026-08-10T10:00:00Z',inv:{frigo:[]},dayMeals:{'ok':[]}}});
  e.local['liam_st']='{ ceci n est pas du json';
  await e.sb.loadState();
  if(!('ok' in e.sb.S.dayMeals))throw new Error('serveur non applique');
});
await t('serveur vide, local present : le local est utilise',async()=>{
  const e=build({serveur:null});
  e.local['liam_st']=JSON.stringify({rev:9,savedAt:'2026-08-19T10:00:00Z',
    inv:{frigo:[]},dayMeals:{'seul':[{rid:'x',name:'X',mult:1,macros:{kcal:42,prot:1,gluc:1,lip:1}}]}});
  await e.sb.loadState();
  if(!e.sb.S.dayMeals['seul'])throw new Error('local non applique');
});

console.log('\n=== Z4. Conflit entre appareils ===');
await t('saveState detecte une revision distante superieure',async()=>{
  const e=build({serveur:{rev:1,savedAt:'2026-08-01T10:00:00Z',inv:{frigo:[]},dayMeals:{}}});
  await e.sb.loadState();
  e.serveur.state={rev:9,savedAt:'2026-08-21T12:00:00Z',inv:{frigo:[]},dayMeals:{'autre':[]}};
  e.sb.S.dayMeals['moi']=[{rid:'a',name:'A',mult:1,macros:{kcal:1,prot:1,gluc:1,lip:1}}];
  await e.sb.saveState();
  await attendre(30);
  // confirm() renvoie true dans le bac a sable -> rechargement, pas d'ecrasement
  if(e.serveur.state.dayMeals['moi'])throw new Error('la version distante a ete ecrasee');
});


console.log('\n=== Z5. Un appareil en retard n ecrase plus le cloud ===');
await t('*** revision locale plus haute mais contenu perime : le cloud gagne ***',async()=>{
  // Le poste a accumule des revisions hors ligne il y a 5 jours ; le cloud a
  // avance depuis, avec beaucoup plus de contenu.
  const cloud={rev:40,savedAt:'2026-09-05T10:00:00Z',inv:{frigo:[{id:'a'},{id:'b'},{id:'c'}]},
    dayMeals:{j1:[{rid:1},{rid:2}],j2:[{rid:3}],j3:[{rid:4}],j4:[{rid:5}],j5:[{rid:6}]},weights:[1,2,3,4,5]};
  const e=build({serveur:cloud});
  e.local['liam_st']=JSON.stringify({rev:95,savedAt:'2026-08-31T09:00:00Z',
    inv:{frigo:[{id:'a'}]},dayMeals:{j1:[{rid:1}]},weights:[1]});
  await e.sb.loadState();
  if(!e.sb.S.dayMeals.j5)throw new Error('les donnees recentes du cloud ont ete perdues');
});
await t('*** une vraie saisie hors ligne est toujours recuperee ***',async()=>{
  const cloud={rev:10,savedAt:'2026-09-05T08:00:00Z',inv:{frigo:[{id:'a'},{id:'b'}]},
    dayMeals:{j1:[{rid:1}],j2:[{rid:2}]},weights:[1,2]};
  const e=build({serveur:cloud});
  // meme contenu, plus un repas, et plus recent
  e.local['liam_st']=JSON.stringify({rev:11,savedAt:'2026-09-05T12:00:00Z',
    inv:{frigo:[{id:'a'},{id:'b'}]},dayMeals:{j1:[{rid:1}],j2:[{rid:2}],j3:[{rid:9}]},weights:[1,2]});
  await e.sb.loadState();
  if(!e.sb.S.dayMeals.j3)throw new Error('la saisie hors ligne a ete perdue');
});
await t('local plus recent mais nettement appauvri : le cloud gagne',async()=>{
  const cloud={rev:10,savedAt:'2026-09-05T08:00:00Z',inv:{frigo:[{id:'a'},{id:'b'},{id:'c'},{id:'d'}]},
    dayMeals:{j1:[{rid:1}],j2:[{rid:2}],j3:[{rid:3}],j4:[{rid:4}]},weights:[1,2,3]};
  const e=build({serveur:cloud});
  e.local['liam_st']=JSON.stringify({rev:11,savedAt:'2026-09-05T12:00:00Z',
    inv:{frigo:[{id:'a'}]},dayMeals:{j1:[{rid:1}]},weights:[]});
  await e.sb.loadState();
  if(!e.sb.S.dayMeals.j4)throw new Error('un etat appauvri a ete applique');
});
await t('le volume part avec l etat enregistre',async()=>{
  const e=build({serveur:{rev:1,savedAt:'2026-09-05T08:00:00Z',inv:{frigo:[]},dayMeals:{}}});
  await e.sb.loadState();
  e.sb.S.dayMeals['2026-09-05']=[{rid:'a',name:'X',mult:1,macros:{kcal:1,prot:1,gluc:1,lip:1}}];
  await e.sb.saveState();
  await attendre(30);
  if(typeof e.serveur.state.vol!=='number')throw new Error('champ vol absent de l etat');
});
await t('*** un ecrasement appauvrissant demande confirmation ***',async()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  const i=src.indexOf('const _newRev=(_rr===null?_stateRev:_rr)+1;');
  const b=src.slice(i-1600,i);
  if(!/_volLocal<_volDist\*0\.6/.test(b))throw new Error('aucun seuil de garde');
  if(!/confirm\(/.test(b))throw new Error('aucune confirmation');
  if(!/_reloadFromServer\(false\)/.test(b))throw new Error('pas de rechargement propose');
});
await t('l etat distant est mis de cote si l utilisateur force',async()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  const i=src.indexOf('const _newRev=(_rr===null?_stateRev:_rr)+1;');
  const b=src.slice(i-1600,i);
  if(!/'\/filet'/.test(b))throw new Error('aucune mise de cote avant ecrasement force');
});

console.log('\n---- '+pass+' ok, '+fail+' KO ----');
process.exit(fail?1:0);
})();
