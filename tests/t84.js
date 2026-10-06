const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=require('fs').readFileSync('index.html','utf8');
// Faux Firebase en memoire : chemin -> objet
let DB={},refus={},journal=[];
X("fbUrl=async function(p){return 'FB/'+p}");X("sessionActive=function(){return {uid:'u1'}}");X("ACTIVE_PROFILE='users/u1'");
sb.fetch=async(u,o)=>{const p=String(u).replace(/^FB\//,'');const m=(o&&o.method)||'GET';journal.push(m+' '+p);
  if(refus[p+' '+m])return {ok:false,status:500,statusText:'x',json:async()=>null};
  if(m==='PUT'){DB[p]=JSON.parse(o.body);return {ok:true,status:200,json:async()=>({})};}
  return {ok:true,status:200,json:async()=>(p in DB?JSON.parse(JSON.stringify(DB[p])):null)};};
let saves=0;X("saveState=function(){__saves++}");sb.__saves=0;
function prep(){
  DB={};refus={};journal=[];sb.__saves=0;
  X(`S.today='2026-10-07';S.archives={};S.libresMigres=false;_archJours={};_archCharges={};_nettoyageFait=false;_loaded=true;
    S.customRecipes=[{id:'_free_1',name:'Tartelette',kcal:350,prot:15,gluc:30,lip:25},{id:'_free_2',name:'Pates',kcal:550,prot:35,gluc:40,lip:45},{id:'_free_9',name:'Orpheline',kcal:1,prot:0,gluc:0,lip:0},{id:'cust_a',custom:true,name:'Ma recette',kcal:400,prot:30,gluc:40,lip:10}];
    RCP.push.apply(RCP,S.customRecipes.filter(function(r){return !RCP.some(function(x){return x.id===r.id})}));
    S.dayMeals={'2026-06-09':[{mult:1,rid:'_free_1'},{mult:1,rid:'_free_2',name:'Pates',macros:{kcal:550,prot:35,gluc:40,lip:45}}],
      '2026-06-20':[{rid:'_x',name:'Salade',macros:{kcal:300,prot:20,gluc:10,lip:15}}],
      '2026-07-02':[{rid:'_y',name:'Riz',macros:{kcal:500,prot:30,gluc:60,lip:10}}],
      '2026-10-06':[{rid:'_z',name:'Omelette',macros:{kcal:400,prot:28,gluc:2,lip:30}}]};`);
  DB['users/u1/state']={rev:5,dayMeals:{},note:'etat du cloud'};
}
console.log('\n=== XLVII. Dev : repas libres sans recette cachee ===');
t('*** migration : nom et macros recopies dans les vieux repas, recettes cachees retirees, les autres gardees ***',()=>{
  prep();const n=X('_migrerRepasLibres()');
  const m=X("S.dayMeals['2026-06-09'][0]");eq(m.name,'Tartelette');eq(m.macros.kcal,350);eq(m.macros.lip,25);
  eq(X("S.customRecipes.map(function(r){return r.id}).join(',')"),'cust_a');
  eq(X("RCP.filter(function(r){return /^_free_/.test(r.id)}).length"),0,'RCP');
  eq(X("getDayMacros('2026-06-09').kcal"),900,'macros du jour inchangees');
  if(!(n>0))throw new Error('compte');
});
t('*** un nouveau repas libre ne cree plus de recette cachee ***',()=>{
  if(/S\.customRecipes\.push\(freeRecipe\)/.test(src)||/RCP\.push\(freeRecipe\)/.test(src))throw new Error('encore cree');
  if(src.indexOf("const _meal={rid:id, mult:1, dessert:null, customDessert:null, macros:")<0)throw new Error('le repas ne porte plus ses macros');
});
t('*** volume : la migration et l\'archivage ne declenchent pas le garde-fou d\'ecrasement ***',()=>{
  prep();const avant=X('_volumeEtat(S)');X('_migrerRepasLibres()');eq(X('_volumeEtat(S)'),avant,'apres migration');
  X("delete S.dayMeals['2026-06-09'];delete S.dayMeals['2026-06-20'];S.archives={'2026-06':{n:3,j:2}}");eq(X('_volumeEtat(S)'),avant,'apres archivage');
});
console.log('\n=== XLVIII. Dev : archive des mois de plus de 3 mois ===');
t('mois a archiver : au-dela de 3 mois (le 07/10, juin et avant)',()=>{prep();eq(X('_moisAArchiver().join(",")'),'2026-06');X("S.today='2026-11-01'");eq(X('_moisAArchiver().join(",")'),'2026-06,2026-07');});
t('*** archivage : mois ecrit dans archive/AAAA-MM, retire de l\'etat, index tenu ***',async()=>{
  prep();const ok=await X('_archiverMois')('2026-06');eq(ok,true);
  const a=DB['users/u1/archive/2026-06'];if(!a||!a.jours['2026-06-09']||!a.jours['2026-06-20'])throw new Error('archive : '+JSON.stringify(a));
  eq(a.n,3);eq(X("Object.keys(S.dayMeals).sort().join(',')"),'2026-07-02,2026-10-06');
  eq(JSON.stringify(X('S.archives')),'{"2026-06":{"n":3,"j":2}}');
  eq(X("getDayMacros('2026-06-20').kcal"),300,'jour archive encore lisible');
});
t('*** ecriture refusee : rien n\'est retire ***',async()=>{prep();refus['users/u1/archive/2026-06 PUT']=1;eq(await X('_archiverMois')('2026-06'),false);if(!X("!!S.dayMeals['2026-06-09']"))throw new Error('retire malgre l\'echec');eq(JSON.stringify(X('S.archives')),'{}');});
t('mois deja archive (import, restauration) : complete, le local gagne',async()=>{
  prep();DB['users/u1/archive/2026-06']={mois:'2026-06',n:1,jours:{'2026-06-01':[{rid:'_o',name:'Ancien',macros:{kcal:100,prot:1,gluc:1,lip:1}}],'2026-06-20':[{rid:'_v',name:'Vieux'}]}};
  await X('_archiverMois')('2026-06');const j=DB['users/u1/archive/2026-06'].jours;
  if(!j['2026-06-01'])throw new Error('ancien jour perdu');eq(j['2026-06-20'][0].name,'Salade','local');eq(DB['users/u1/archive/2026-06'].n,4);
});
t('*** calendrier : un mois archive se charge a la demande, donnees neutralisees ***',async()=>{
  prep();X("S.archives={'2026-05':{n:1,j:1}}");DB['users/u1/archive/2026-05']={jours:{'2026-05-03':[{rid:'_q',name:'<b>x</b>',macros:{kcal:700,prot:40,gluc:50,lip:30}}]}};
  await X('_chargerArchive')('2026-05');eq(X("getDayMacros('2026-05-03').kcal"),700);eq(X("_repasDuJour('2026-05-03')[0].name"),'‹b›x‹/b›');eq(X("_etatJour('2026-05-03').etat")==='vide',false);
  journal=[];await X('_chargerArchive')('2026-05');eq(journal.length,0,'charge deux fois');
});
t('*** rangement complet : filet ecrit AVANT, puis migration et archive, puis enregistrement ***',async()=>{
  prep();await X('_nettoyageDonnees')();
  const iF=journal.indexOf('PUT users/u1/filet'),iA=journal.indexOf('PUT users/u1/archive/2026-06');
  if(!(iF>=0&&iA>iF))throw new Error('ordre : '+journal.join(' | '));
  if(JSON.parse(DB['users/u1/filet'].state).note!=='etat du cloud')throw new Error('filet');
  eq(X('S.libresMigres'),true);eq(X("S.customRecipes.length"),1);if(!(sb.__saves>0))throw new Error('non enregistre');
  journal=[];await X('_nettoyageDonnees')();eq(journal.length,0,'une seule fois par session');
});
t('*** filet impossible : on ne touche a rien ***',async()=>{
  prep();refus['users/u1/filet PUT']=1;await X('_nettoyageDonnees')();
  eq(X('S.libresMigres'),false);eq(X("S.customRecipes.length"),4);if(!X("!!S.dayMeals['2026-06-09']"))throw new Error('archive malgre tout');
});
t('hors ligne : rien',async()=>{prep();const nv=sb.navigator;sb.navigator={userAgent:'n',onLine:false};try{await X('_nettoyageDonnees')();}finally{sb.navigator=nv;}eq(journal.length,0);});
t('*** export : les mois archives sont remis dans le fichier ***',async()=>{
  DB['users/u1/archive/2026-06']={jours:{'2026-06-20':[{rid:'_x',name:'Salade'}]}};
  const st={dayMeals:{'2026-07-02':[]},archives:{'2026-06':{n:1,j:1}}};sb.__st=st;await X('_archivesDansExport(__st)');
  if(!st.dayMeals['2026-06-20'])throw new Error('mois archive absent');if(st.archives)throw new Error('index laisse');
});
t('etat : index et drapeau sauvegardes et relus',()=>{
  if(src.indexOf('archives:S.archives||{},libresMigres:!!S.libresMigres,')<0)throw new Error('sauvegarde');
  X("_applyState({_profile:ACTIVE_PROFILE,rev:1,inv:{frigo:[],congelateur:[],placards:[],epices:[]},dayMeals:{},libresMigres:true,archives:{'2026-06':{n:'3',j:2},'pas-un-mois':{n:1}}})");
  eq(X('S.libresMigres'),true);eq(JSON.stringify(X('S.archives')),'{"2026-06":{"n":3,"j":2}}');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
