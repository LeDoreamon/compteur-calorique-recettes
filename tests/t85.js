const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=require('fs').readFileSync('index.html','utf8');
const etat=o=>Object.assign({_profile:X('ACTIVE_PROFILE'),rev:1,inv:{frigo:[],congelateur:[],placards:[],epices:[]},dayMeals:{}},o||{});
let alertes=[];sb._alerte=m=>{alertes.push(m);return Promise.resolve();};
console.log('\n=== XLIX. Dev : version du format et migrations ===');
t('*** etat sans version : format 1, sans blocage ; la version part avec l\'etat ***',()=>{
  X('_schemaTropRecent=false');sb.__d=etat();X('_applyState(__d)');eq(X('S.schema'),X('SCHEMA'));eq(X('_schemaTropRecent'),false);
  if(src.indexOf('schema:S.schema||SCHEMA,')<0)throw new Error('version non sauvegardee');
});
t('*** migrations jouees une fois, dans l\'ordre, a partir de la version de l\'etat ***',()=>{
  X("__ordre=[];MIGRATIONS.push({v:2,nom:'a',fn:function(S){__ordre.push(2);return true}},{v:3,nom:'b',fn:function(S){__ordre.push(3);return false}})");
  X("S.schema=1");eq(X('_migrerSchema(1)'),true);eq(X('__ordre.join(",")'),'2,3');eq(X('S.schema'),3);
  X('__ordre=[]');X('_migrerSchema(2)');eq(X('__ordre.join(",")'),'3','reprise a la bonne version');
  X('__ordre=[]');X('_migrerSchema(3)');eq(X('__ordre.length'),0,'rejouee');
});
t('*** une migration qui plante arrete la suite et garde la derniere version reussie ***',()=>{
  X("MIGRATIONS.length=0;__ordre=[];MIGRATIONS.push({v:2,nom:'ok',fn:function(){__ordre.push(2)}},{v:3,nom:'ko',fn:function(){throw new Error('boum')}},{v:4,nom:'apres',fn:function(){__ordre.push(4)}})");
  X('_migrerSchema(1)');eq(X('S.schema'),2);eq(X('__ordre.join(",")'),'2','la suivante a tourne');
  X('MIGRATIONS.length=0');
});
t('*** etat ecrit par une version plus recente : prevenu, plus aucun enregistrement ni rangement ***',async()=>{
  alertes=[];X('_schemaTropRecent=false');sb.__d=etat({schema:99});X('_applyState(__d)');
  eq(X('_schemaTropRecent'),true);if(!alertes.some(a=>a.indexOf('Mise à jour nécessaire')===0))throw new Error('pas prevenu');
  let ecrit=0;const vf=sb.fetch;sb.fetch=async(u,o)=>{if(o&&/PUT|PATCH/.test(o.method||''))ecrit++;return {ok:true,status:200,json:async()=>5};};
  try{X('_loaded=true');await X('_saveStateNow')();X('_nettoyageFait=false');await X('_nettoyageDonnees')();}finally{sb.fetch=vf;}
  eq(ecrit,0,'ecriture');
  X("_schemaTropRecent=false");
});
t('changement de compte : le blocage est leve',()=>{if(!/_archJours=\{\};_archCharges=\{\};_nettoyageFait=false;S\.archives=\{\};_schemaTropRecent=false;/.test(src))throw new Error('non leve');});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
