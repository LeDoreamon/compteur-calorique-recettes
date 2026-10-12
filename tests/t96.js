// Ouverture de l'appli : plus de double chargement, « Quoi de neuf » garde jusqu'a sa fermeture (12/10/2026)
const {sb}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
console.log('\n=== LXVI. Ouverture : un seul chargement, « Quoi de neuf » garde ===');
t('*** « Quoi de neuf » n\'est marque vu qu\'une fois ferme (un rechargement pendant l\'affichage le remontre) ***',async()=>{
  let fermer=null;const vd=sb._dialogue;
  sb._dialogue=function(){return new Promise(r=>{fermer=r;});};
  try{
    LS.dz_nouveautes='2026-01-01-0000';X('sessionActive=function(){return true;};_nvFait=false;_loaded=true;_verifierNouveautes()');
    if(!fermer)throw new Error('fenetre non ouverte');
    eq(LS.dz_nouveautes,'2026-01-01-0000','marque avant fermeture');
    fermer(true);await new Promise(r=>setTimeout(r,10));
    eq(LS.dz_nouveautes,X('BUILD_ID'),'marque apres fermeture');
  }finally{sb._dialogue=vd;}
});
t('rien de neuf a montrer : marque tout de suite, sans fenetre',()=>{
  LS.dz_nouveautes='2099-01-01-0000';let n=0;const va=sb.alert;sb.alert=()=>{n++;};
  try{X('_nvFait=false;_verifierNouveautes()');eq(n,0);}finally{sb.alert=va;}
});
t('*** nouveau service worker : la page ne se recharge plus d\'office ***',()=>{
  const i=src.indexOf("addEventListener('controllerchange'");if(i<0)throw new Error('ecoute absente');
  const l=src.slice(i,src.indexOf('\n',i));
  if(/location\.reload/.test(l))throw new Error('rechargement direct : '+l.slice(0,120));
  if(!/_surNouveauServiceWorker/.test(l))throw new Error('pas de verification de version');
});
t('*** page a jour (meme version ou service worker plus ancien) : rien ; page perimee : bandeau propose ***',async()=>{
  const B='macros-'+X('BUILD_ID');const res=[];
  for(const v of [B,'macros-2026-01-01-0000',null,'macros-2099-01-01-0000']){
    sb.__v=v;X('_versionServiceWorker=function(){return Promise.resolve(__v);}');
    res.push(await X('_surNouveauServiceWorker()'));
  }
  eq(res.join(','),'a-jour,a-jour,a-jour,perimee');
});
t('le bandeau ne recharge qu\'au clic, apres l\'enregistrement en cours',()=>{
  const f=src.slice(src.indexOf('function _bandeauNouvelleVersion'),src.indexOf('function _surNouveauServiceWorker'));
  if(!/bt\.onclick=function\(\)\{.*Promise\.resolve\(saveState\(\)\)\.then\(go,go\)/.test(f))throw new Error('rechargement sans enregistrement');
  if(/^\s*location\.reload\(\)/m.test(f))throw new Error('rechargement direct');
});
t('*** le service worker donne sa version a la page ***',()=>{
  if(!/self\.addEventListener\('message',e=>\{if\(e\.data&&e\.data\.type==='version'&&e\.ports&&e\.ports\[0\]\)e\.ports\[0\]\.postMessage\(\{version:CACHE\}\);\}\);/.test(sw))throw new Error('reponse absente');
  eq(sw.match(/const CACHE='([^']+)'/)[1],'macros-'+X('BUILD_ID'),'version du service worker = build de la page');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
