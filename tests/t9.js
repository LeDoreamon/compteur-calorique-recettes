// Sandbox dédié : réseau et localStorage simulés, pour tester la synchro
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;
function t(n,f){return f().then(()=>{console.log('  ok  '+n);pass++;})
  .catch(e=>{console.log('  KO  '+n+' -> '+e.message);fail++;});}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}

function build(opts){
  opts=opts||{};
  const net={coupe:!!opts.horsLigne};
  const serveur={state:opts.serveur||null,burn:{},envois:[]};
  const local={};
  const journal=[];
  let js=fs.readFileSync('catalogue.js','utf8')+'\n'+fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
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
     const hd=(init&&init.headers)||{};
     if(u.includes('/state'))serveur.envois.push({m,p:(u.split('?')[0].split('/state')[1]||'').replace('.json',''),body:init&&init.body});
     if(u.includes('/state/rev')){
       const et='E'+(serveur.state?serveur.state.rev:'x');
       if(m==='PUT'&&serveur.intrus){serveur.intrus=false;serveur.state.rev++;}   /* un autre appareil ecrit juste avant */
       if(m==='PUT'){const et2='E'+serveur.state.rev;if(hd['if-match']&&hd['if-match']!==et2)return {ok:false,status:412,json:async()=>null};serveur.state=serveur.state||{};serveur.state.rev=JSON.parse(init.body);return {ok:true,status:200};}
       if(serveur.corsEtag&&hd['X-Firebase-ETag'])throw new TypeError('Failed to fetch');
       return {ok:true,headers:{get:k=>(k==='ETag'&&hd['X-Firebase-ETag']&&!serveur.sansEtag)?et:null},json:async()=>(serveur.state?serveur.state.rev:null)};
     }
     if(u.includes('/state')){
       if(m==='PUT'){serveur.state=JSON.parse(init.body);return {ok:true,status:200};}
       if(m==='PATCH'){   /* comme Firebase : mise a jour multi-chemins, null efface */
         serveur.state=serveur.state||{};const p=JSON.parse(init.body);
         Object.keys(p).forEach(c=>{const s=c.split('/');let o=serveur.state;for(let i=0;i<s.length-1;i++){if(!o[s[i]]||typeof o[s[i]]!=='object')o[s[i]]={};o=o[s[i]];}if(p[c]===null)delete o[s[s.length-1]];else o[s[s.length-1]]=p[c];});
         return {ok:true,status:200};
       }
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
  // Fenetres maison : reponse immediate via sb.confirm / sb.alert (voir sb.js)
  sb._dialogue=function(o){o=o||{};var v=o.annuler?!!sb.confirm(o.message):(sb.alert(o.message),true);return {then:function(f){return f?f(v):v;}};};
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
  // local ancien (rev 2), serveur plus recent (rev 7, ecrit depuis un autre appareil)
  const e=build({serveur:{rev:7,savedAt:'2026-08-20T10:00:00Z',inv:{frigo:[]},
                          dayMeals:{'autre_appareil':[{rid:'m',name:'Sien',mult:1,macros:{kcal:1,prot:1,gluc:1,lip:1}}]}}});
  e.local['liam_st']=JSON.stringify({rev:2,savedAt:'2026-08-01T10:00:00Z',inv:{frigo:[]},
                          dayMeals:{'vieux':[{rid:'v',name:'Vieux',mult:1,macros:{kcal:9,prot:1,gluc:1,lip:1}}]}});
  await e.sb.loadState();
  if(!e.sb.S.dayMeals['autre_appareil'])throw new Error('la version serveur aurait du gagner');
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
  if(!/_confirmer\(/.test(b))throw new Error('aucune confirmation');
  if(!/_reloadFromServer\(false\)/.test(b))throw new Error('pas de rechargement propose');
});
await t('l etat distant est mis de cote si l utilisateur force',async()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  const i=src.indexOf('const _newRev=(_rr===null?_stateRev:_rr)+1;');
  const b=src.slice(i-1600,i);
  if(!/'\/filet'/.test(b))throw new Error('aucune mise de cote avant ecrasement force');
});

console.log('\n=== Z9. Enregistrement partiel et revision reservee (07/10/2026) ===');
const base=()=>({rev:5,savedAt:'2026-08-01T10:00:00Z',inv:{frigo:[{id:'a',name:'Yaourt',qty:2,unit:'pots'}],placards:[{id:'b',name:'Riz',qty:500,unit:'g'}]},dayMeals:{'2026-08-01':[{rid:'r1',name:'A',mult:1,macros:{kcal:100,prot:1,gluc:1,lip:1}}]},weights:[{d:'2026-08-01',w:80}]});
const repas=n=>[{rid:'r'+n,name:'M'+n,mult:1,macros:{kcal:200,prot:10,gluc:10,lip:5}}];
await t('*** premier envoi complet (PUT), suivants partiels (PATCH) : seulement le jour modifie et les meta ***',async()=>{
  const e=build({serveur:base()});await e.sb.loadState();await attendre(200);
  e.serveur.envois=[];e.sb.S.dayMeals['2026-08-02']=repas(2);await e.sb.saveState();
  const w1=e.serveur.envois.filter(x=>x.p===''&&x.m!=='GET');if(!w1.length)throw new Error('rien envoye');
  e.serveur.envois=[];e.sb.S.dayMeals['2026-08-03']=repas(3);await e.sb.saveState();
  const w2=e.serveur.envois.filter(x=>x.p===''&&x.m!=='GET');eq(w2.length,1);eq(w2[0].m,'PATCH');
  const cles=Object.keys(JSON.parse(w2[0].body)).filter(k=>!/^(rev|vol|savedAt|savedBy|todaySummary|_profile)$/.test(k));
  eq(cles.join(','),'dayMeals/2026-08-03');
  const plein=e.local[Object.keys(e.local).find(k=>/_st$/.test(k))].length;
  if(w2[0].body.length>plein/4)throw new Error('envoi pas plus leger : '+w2[0].body.length+' vs etat complet '+plein);
});
await t('*** apres une serie de PATCH, le serveur a exactement l\'etat local (ajout, modif, suppression de jour, categorie) ***',async()=>{
  const e=build({serveur:base()});await e.sb.loadState();await e.sb.saveState();
  e.sb.S.dayMeals['2026-08-02']=repas(2);await e.sb.saveState();
  delete e.sb.S.dayMeals['2026-08-01'];e.sb.S.inv.placards[0].qty=300;e.sb.S.weights.push({d:'2026-08-02',w:79.5});await e.sb.saveState();
  const loc=JSON.parse(e.local[Object.keys(e.local).find(k=>/_st$/.test(k))]),srv=e.serveur.state;
  ['dayMeals','inv','weights','shop','customRecipes'].forEach(k=>{if(JSON.stringify(srv[k])!==JSON.stringify(loc[k]))throw new Error(k+' differe : '+JSON.stringify(srv[k]).slice(0,120)+' / '+JSON.stringify(loc[k]).slice(0,120));});
  const dernier=e.serveur.envois.filter(x=>x.m==='PATCH').pop();const p=JSON.parse(dernier.body);
  if(!('dayMeals/2026-08-01' in p)||p['dayMeals/2026-08-01']!==null)throw new Error('jour supprime non efface');
  if(!('inv/placards' in p)||('inv/frigo' in p))throw new Error('categorie : '+Object.keys(p).join(','));
});
await t('*** envoi refuse : le suivant renvoie aussi les changements perdus ***',async()=>{
  const e=build({serveur:base()});await e.sb.loadState();await e.sb.saveState();
  const vf=e.sb.fetch;e.sb.fetch=async(u,o)=>{if(o&&o.method==='PATCH')return {ok:false,status:500,statusText:'x'};return vf(u,o);};
  e.sb.S.dayMeals['2026-08-02']=repas(2);await e.sb.saveState();e.sb.fetch=vf;
  e.serveur.envois=[];e.sb.S.dayMeals['2026-08-03']=repas(3);await e.sb.saveState();
  const p=JSON.parse(e.serveur.envois.filter(x=>x.m==='PATCH').pop().body);
  if(!('dayMeals/2026-08-02' in p)||!('dayMeals/2026-08-03' in p))throw new Error('perdu : '+Object.keys(p).join(','));
});
await t('*** revision reservee par ETag : un appareil qui ecrit entre la lecture et l\'envoi n\'est pas ecrase ***',async()=>{
  const e=build({serveur:base()});await e.sb.loadState();
  const avant=JSON.stringify(e.serveur.state.dayMeals);let conflit=0;
  e.sb._onSaveConflict=async()=>{conflit++;};
  e.serveur.intrus=true;e.sb.S.dayMeals['2026-08-02']=repas(2);await e.sb.saveState();
  if(JSON.stringify(e.serveur.state.dayMeals)!==avant)throw new Error('ecrase malgre le conflit');
  if(!conflit)throw new Error('conflit non signale');
  if(!e.serveur.envois.some(x=>x.p==='/rev'&&x.m==='PUT'))throw new Error('pas de reservation');
});
await t('navigateur sans ETag (en-tete absent) : on enregistre quand meme, sans reservation',async()=>{
  const e=build({serveur:base()});e.serveur.sansEtag=true;await e.sb.loadState();
  e.sb.S.dayMeals['2026-08-02']=repas(2);await e.sb.saveState();
  if(!e.serveur.state.dayMeals['2026-08-02'])throw new Error('non enregistre');
  if(e.serveur.envois.some(x=>x.p==='/rev'&&x.m==='PUT'))throw new Error('reservation sans ETag');
});
await t('en-tete ETag refuse par le navigateur (CORS) : repli sans ETag',async()=>{
  const e=build({serveur:base()});e.serveur.corsEtag=true;await e.sb.loadState();
  e.sb.S.dayMeals['2026-08-02']=repas(2);await e.sb.saveState();
  if(!e.serveur.state.dayMeals['2026-08-02'])throw new Error('non enregistre');
  eq(vm.runInContext('_ETAG_OK',e.sb),false);
});

console.log('\n---- '+pass+' ok, '+fail+' KO ----');
process.exit(fail?1:0);
})();
