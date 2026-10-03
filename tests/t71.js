const {sb}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
function prepa(){X(`_loaded=true;ACTIVE_PROFILE='users/U';S.catalogue=null;S.favs=[];S.aiRecipes=[];S.dayMeals={};
  S.inv={frigo:[{id:'fb',name:'Fromage blanc 0% nature',qty:1200,unit:'g',mac100:{kcal:47,prot:7.5,gluc:4,lip:0.1}},{id:'oe',name:'Oeufs',qty:12,unit:'pcs',pieceG:55,macPiece:{kcal:72,prot:6.3,gluc:0.4,lip:4.8}}],
   congelateur:[{id:'oi',name:'Oignons émincés',qty:900,unit:'g',mac100:{kcal:40,prot:1.1,gluc:9,lip:0.1}}],
   placards:[{id:'wh',name:'Clear whey',qty:500,unit:'g',mac100:{kcal:341,prot:78,gluc:6,lip:0.6}},{id:'le',name:'lentilles casse grains',qty:260,unit:'g',mac100:{kcal:116,prot:9,gluc:20,lip:0.4}},
     {id:'ri',name:'Riz Oiseaux Célestes',qty:null,unit:'g',mac100:{kcal:350,prot:7,gluc:78,lip:1}}],epices:[]};`);}
const mk=(name,used,steps)=>({name,used,steps,slots:['lunch']});
console.log('\n=== XXI. Recettes IA incoherentes ===');
t('*** la recette du 03/10 est rejetee (omelette sans oeufs, lentilles absentes des etapes, whey cuite) ***',()=>{
  prepa();
  const r=mk('Omelette aux oignons & whey & fromage blanc',[{id:'oi',qty:50},{id:'wh',qty:30},{id:'le',qty:100}],
    ["Faire revenir 50g d'oignons émincés 2 min.","Ajouter 30g de whey et cuire 1 min.","Verser 100g de fromage blanc, battre jusqu'à consistance lisse.","Servir chaud."]);
  const why=X('_aiRecetteIncoherente')(r);if(!why)throw new Error('acceptee');
});
t('ingredient liste mais jamais utilise',()=>{prepa();const w=X('_aiRecetteIncoherente')(mk('Riz aux oignons',[{id:'ri',qty:80},{id:'le',qty:100},{id:'oi',qty:50}],['Cuire le riz.','Faire revenir les oignons.','Mélanger.']));if(!/non utilisé : lentilles/.test(w||''))throw new Error(w);});
t('aliment cite dans les etapes mais absent de la liste',()=>{prepa();const w=X('_aiRecetteIncoherente')(mk('Riz',[{id:'ri',qty:80}],['Cuire le riz.','Ajouter le fromage blanc.']));if(!/absent des ingrédients : Fromage blanc/.test(w||''))throw new Error(w);});
t('omelette sans oeufs / whey cuite',()=>{prepa();
  if(!/plat sans/.test(X('_aiRecetteIncoherente')(mk('Omelette aux oignons',[{id:'oi',qty:50}],['Faire revenir les oignons.','Servir.']))||''))throw new Error('omelette');
  if(X('_aiRecetteIncoherente')(mk('Omelette aux oignons',[{id:'oi',qty:50},{id:'oe',qty:3}],['Faire revenir les oignons.','Battre les œufs et cuire.'])))throw new Error('omelette valide rejetee');
  if(!/whey cuite/.test(X('_aiRecetteIncoherente')(mk('Bol whey',[{id:'wh',qty:30},{id:'fb',qty:200}],['Faire cuire la whey 2 min à la poêle.','Ajouter le fromage blanc.']))||''))throw new Error('whey');
  if(X('_aiRecetteIncoherente')(mk('Fromage blanc protéiné',[{id:'wh',qty:30},{id:'fb',qty:200}],['Mélanger la whey au fromage blanc à froid.','Servir.'])))throw new Error('whey froide rejetee');
});
t('*** identifiant contredit par le nom : le nom gagne ***',()=>{prepa();eq(X("_nomsCompatibles('Fromage blanc','lentilles casse grains')"),false);eq(X("_nomsCompatibles('œufs','Oeufs')"),true);eq(X("_nomsCompatibles('riz','Riz Oiseaux Célestes')"),true);});
t('*** generation de bout en bout : la mauvaise recette est ecartee, la bonne gardee, id corrige ***',async()=>{
  prepa();const vrai=sb.callAI;let alerte='';const va=sb.alert;sb.alert=m=>{alerte=m;};
  sb.callAI=async()=>({content:[{type:'text',text:JSON.stringify([
    {name:'Omelette aux oignons & whey & fromage blanc',slots:['breakfast'],kcal:238,prot:33,gluc:26,lip:1,ingredients:[{id:'oi',name:'Oignons émincés',qty:50},{id:'wh',name:'Clear whey',qty:30},{id:'le',name:'Fromage blanc',qty:100}],steps:["Faire revenir 50g d'oignons émincés 2 min.","Ajouter 30g de whey et cuire 1 min.","Verser 100g de fromage blanc, battre.","Servir chaud."]},
    {name:'Fromage blanc protéiné',slots:['snack'],kcal:200,prot:35,gluc:10,lip:1,ingredients:[{id:'le',name:'Fromage blanc',qty:200},{id:'wh',name:'Clear whey',qty:20}],steps:['Verser 200g de fromage blanc dans un bol.','Mélanger la whey à froid.','Servir frais.']}])}],empty:false,truncated:false});
  X("getApiKey=function(){return 'k';}");
  try{await X('generateStockRecipes')();}finally{sb.callAI=vrai;sb.alert=va;X("getApiKey=function(){return localStorage.getItem('anthropic_key')||'';}");}
  const ai=X('S.aiRecipes');eq(ai.length,1,'nombre de recettes gardees ('+alerte+')');eq(ai[0].name,'Fromage blanc protéiné');
  eq(ai[0].used.map(u=>u.id).join(),'fb,wh','identifiant des lentilles remplace par le fromage blanc');
});
t('aucun faux positif sur le catalogue',()=>{
  X('_loaded=true;');const recs=X('RCP').filter(r=>Array.isArray(r.used)&&r.used.length&&r.steps&&r.steps.length&&r.profile==='liam');
  if(recs.length<20)throw new Error('catalogue introuvable');
  const ko=recs.map(r=>[r.name,X('_aiRecetteIncoherente')(r)]).filter(x=>x[1]);
  if(ko.length)throw new Error(ko.length+' rejetee(s), ex. '+ko[0].join(' -> '));
});
t('la regle whey / omelette est dans l\'invite',()=>{if(!/ne se CUISENT PAS/.test(src)||!/exige des œufs/.test(src))throw new Error('invite');});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
