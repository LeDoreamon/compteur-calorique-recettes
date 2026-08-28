const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}

// Bac a sable : profil + horloge machine pilotables
function monde(profil,isoUTC){
  let js=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  js+='\n;try{ACTIVE_PROFILE="'+profil+'";}catch(e){}';
  js+='\n;["S","getToday","heureProfil","_phaseJournee","PROFILE_TZ","_empreinteEtat","shiftDate"].forEach(function(n){try{globalThis[n]=eval(n);}catch(e){}});';
  js+='\n;try{globalThis.__setRef=function(v){_empreinteRef=v;};globalThis.__getRef=function(){return _empreinteRef;};}catch(e){}';
  const reg={};
  function mk(){return{value:'',checked:false,textContent:'',innerHTML:'',className:'',style:{},cssText:'',
    dataset:{},offsetWidth:100,placeholder:'',classList:{add(){},remove(){},contains:()=>false,toggle(){}},
    focus(){},click(){},appendChild(){},setAttribute(){},getAttribute(){return null;},
    querySelector(){return null;},querySelectorAll(){return[];},addEventListener(){},files:[]};}
  const de=id=>{if(!reg[id])reg[id]=mk();return reg[id];};
  const RD=Date;
  class FD extends RD{constructor(...a){if(!a.length)super(isoUTC);else super(...a);}
    static now(){return new RD(isoUTC).getTime();}}
  const sb={console:{log(){},warn(){},error(){}},Math,Date:FD,JSON,parseFloat,parseInt,isNaN,isFinite,Intl,
   Array,Object,String,Number,Boolean,RegExp,Promise,Map,Set,encodeURIComponent,decodeURIComponent,
   document:{getElementById:de,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>mk(),
     addEventListener(){},hidden:false,body:{appendChild(e){reg['coach-toast']=e;}},documentElement:mk(),head:mk()},
   localStorage:{getItem:()=>null,setItem(){},removeItem(){}},sessionStorage:{getItem:()=>null,setItem(){}},
   navigator:{userAgent:'node'},alert(){},confirm:()=>true,prompt:()=>'',
   setTimeout(f,d){if(typeof f==='function'&&(!d||d<100))f();return 1;},clearTimeout(){},setInterval(){},
   clearInterval(){},requestAnimationFrame(){},AbortController:class{constructor(){this.signal={};}abort(){}},
   fetch:async()=>({ok:true,json:async()=>({})}),URL:{createObjectURL:()=>''},Blob:function(){},Image:function(){},
   firebase:{initializeApp:()=>({}),database:()=>({ref:()=>({on(){},set:()=>Promise.resolve(),
     once:()=>Promise.resolve({val:()=>null})})})},
   location:{href:''},history:{pushState(){}},addEventListener(){},removeEventListener(){},
   matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})};
  sb.window=sb;sb.globalThis=sb;sb.self=sb;
  vm.createContext(sb);vm.runInContext(js,sb,{filename:'a.js'});
  return sb;
}

console.log('\n=== CG. La date suit le profil, pas l\'appareil ===');
// 28 aout 2026, 03h00 UTC = 05h00 a Paris (28) mais 20h00 a Vancouver le 27
const T='2026-08-28T03:00:00Z';
t('*** Liam : 28 aout ***',()=>eq(monde('liam',T).getToday(),'2026-08-28'));
t('*** Maureen : encore le 27 aout ***',()=>eq(monde('maureen',T).getToday(),'2026-08-27'));
t('les deux profils ont bien un fuseau declare',()=>{
  const p=monde('liam',T).PROFILE_TZ;
  eq(p.liam,'Europe/Paris');eq(p.maureen,'America/Vancouver');
});
// 28 aout 15h00 UTC = 17h Paris (28) et 08h Vancouver (28) : meme jour
t('meme jour quand les fuseaux concordent',()=>{
  const U='2026-08-28T15:00:00Z';
  eq(monde('liam',U).getToday(),'2026-08-28');
  eq(monde('maureen',U).getToday(),'2026-08-28');
});

console.log('\n=== CH. L\'heure aussi ===');
t('*** Maureen : 20 h chez elle quand il est 5 h a Paris ***',()=>{
  eq(monde('maureen',T).heureProfil(),20);
});
t('Liam : 5 h du matin au meme instant',()=>{
  eq(monde('liam',T).heureProfil(),5);
});
t('*** la garde nocturne suit l\'heure de Maureen ***',()=>{
  // 5 h Paris est dans la garde (<4 h ? non, 5 h) — testons 02h Paris
  const N='2026-08-28T00:30:00Z';   // 02h30 Paris, 17h30 Vancouver la veille
  eq(monde('liam',N).heureProfil(),2,'Liam en pleine nuit');
  eq(monde('maureen',N).heureProfil(),17,'Maureen en fin d\'apres-midi');
});
t('*** le coach ne prend pas le diner de Maureen pour un petit-dejeuner ***',()=>{
  const sb=monde('maureen',T);      // 20 h chez elle
  sb.S.today=sb.getToday();
  eq(sb._phaseJournee(),'fin','journee finie chez elle');
});
t('au meme instant, Liam est en toute fin de nuit',()=>{
  const sb=monde('liam',T);         // 5 h chez lui
  sb.S.today=sb.getToday();
  eq(sb._phaseJournee(),'debut');
});

console.log('\n=== CI. Robustesse du fuseau ===');
t('profil inconnu : repli sur l\'appareil sans planter',()=>{
  const sb=monde('inconnu',T);
  const d=sb.getToday();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d))throw new Error(d);
  if(isNaN(sb.heureProfil()))throw new Error('heure invalide');
});
t('un fuseau pose dans l\'etat prime sur le defaut',()=>{
  const sb=monde('liam',T);
  sb.S.tz='America/Vancouver';
  eq(sb.getToday(),'2026-08-27','doit suivre Vancouver');
});
t('changement d\'heure d\'ete gere par Intl',()=>{
  // 1er janvier : Vancouver est a UTC-8, Paris a UTC+1
  const H='2026-01-01T05:00:00Z';   // 06h Paris (1er), 21h Vancouver (31 dec)
  eq(monde('liam',H).getToday(),'2026-01-01');
  eq(monde('maureen',H).getToday(),'2025-12-31');
});

console.log('\n=== CJ. Conflit : ne deranger que si necessaire ===');
t('l\'empreinte est stable si rien ne change',()=>{
  const sb=monde('liam',T);
  const a=sb._empreinteEtat();
  eq(sb._empreinteEtat(),a);
});
t('*** l\'empreinte change des qu\'un repas est ajoute ***',()=>{
  const sb=monde('liam',T);
  const a=sb._empreinteEtat();
  sb.S.dayMeals['2026-08-28']=[{rid:'x',name:'X',mult:1,macros:{kcal:1,prot:1,gluc:1,lip:1}}];
  if(sb._empreinteEtat()===a)throw new Error('empreinte insensible aux modifications');
});
t('elle change aussi sur l\'inventaire',()=>{
  const sb=monde('liam',T);
  const a=sb._empreinteEtat();
  sb.S.inv.frigo.push({id:'zz',name:'Test',qty:1,unit:'g',mac100:{kcal:1,prot:0,gluc:0,lip:0}});
  if(sb._empreinteEtat()===a)throw new Error('insensible a l\'inventaire');
});
t('*** rien de modifie : rechargement silencieux, pas de question ***',()=>{
  const src=fs.readFileSync('index.html','utf8');
  const i=src.indexOf('if(_rr!==null&&_rr>_stateRev){');
  const bloc=src.slice(i,i+520);
  if(!/_emp===_empreinteRef/.test(bloc))throw new Error('comparaison absente');
  if(!/_reloadFromServer\(true\)/.test(bloc))throw new Error('rechargement non silencieux');
  const iSil=bloc.indexOf('_reloadFromServer(true)'), iPop=bloc.indexOf('_onSaveConflict()');
  if(iSil>iPop)throw new Error('la question est posee avant la verification');
});
t('vrai conflit : la question est toujours posee',()=>{
  const src=fs.readFileSync('index.html','utf8');
  const i=src.indexOf('if(_rr!==null&&_rr>_stateRev){');
  if(!/await _onSaveConflict\(\);return;/.test(src.slice(i,i+520)))
    throw new Error('conflit reel non signale');
});
t('la reference est posee au chargement et a l\'enregistrement',()=>{
  const src=fs.readFileSync('index.html','utf8');
  const n=(src.match(/_empreinteRef=_empreinteEtat\(\)/g)||[]).length;
  if(n<3)throw new Error('seulement '+n+' points de reference');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');

console.log('\n=== CK. Garde-fou : appels sans definition ===');
t('*** toute fonction interne appelee est bien definie ***',()=>{
  const src=fs.readFileSync('index.html','utf8');
  const js=src.match(/<script>([\s\S]*?)<\/script>/)[1];
  const def=new Set([...js.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)/g)].map(m=>m[1]));
  [...js.matchAll(/\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=/g)].forEach(m=>def.add(m[1]));
  const BUILT=new Set(['if','for','while','switch','catch','return','typeof','function','new',
    'Math','JSON','Date','Number','String','Object','Array','Boolean','RegExp','Promise','Map','Set',
    'parseInt','parseFloat','isNaN','isFinite','encodeURIComponent','decodeURIComponent','fetch',
    'setTimeout','clearTimeout','setInterval','clearInterval','alert','confirm','prompt','Intl',
    'requestAnimationFrame','AbortController','Blob','Image','URL','console','document','window']);
  // On ne verifie que les fonctions "maison" : prefixe _ ou nom en minuscule camelCase
  const manquants=new Set();
  [...js.matchAll(/(?:^|[^.\w$])(_[A-Za-z][\w$]*)\s*\(/g)].forEach(m=>{
    const n=m[1];
    if(!def.has(n)&&!BUILT.has(n))manquants.add(n);
  });
  if(manquants.size)throw new Error([...manquants].join(', ')+' appelée(s) sans définition');
});
console.log('\n---- total '+pass+' ok, '+fail+' KO ----');
