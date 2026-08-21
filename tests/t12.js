const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const apprendre=G('apprendNomsIngredients'),resolveInv=G('resolveInv');

function inv(items){S.inv={frigo:items,placards:[],congelateur:[],epices:[]};}

console.log('\n=== AI. Apprentissage des noms ===');
t('apprendNomsIngredients existe',()=>{if(typeof apprendre!=='function')throw new Error('non definie');});
t('la table se remplit depuis les ingredients valides',()=>{
  S.ingNames={};
  inv([{id:'cx_abc',name:'Aiguillettes de poulet',qty:500,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}}]);
  S.customRecipes=[{id:'r1',slots:['lunch'],name:'Test',kcal:300,prot:1,gluc:1,lip:1,
                    used:[{id:'cx_abc',qty:150}],extras:[]}];
  S.aiRecipes=[];
  apprendre();
  eq(S.ingNames['cx_abc'],'Aiguillettes de poulet','nom appris');
});
t('un ingredient dont l\'id est deja mort n\'ecrase rien',()=>{
  S.ingNames={'cx_mort':'Ancien nom'};
  inv([]);
  S.customRecipes=[{id:'r1',slots:['lunch'],name:'T',kcal:1,prot:1,gluc:1,lip:1,used:[{id:'cx_mort',qty:10}],extras:[]}];
  apprendre();
  eq(S.ingNames['cx_mort'],'Ancien nom','conserve');
});
t('la table ne grossit pas sans fin',()=>{
  S.ingNames={};
  for(let i=0;i<600;i++)S.ingNames['x'+i]='n'+i;
  inv([{id:'cx_new',name:'Nouveau',qty:10,unit:'g',mac100:{kcal:1,prot:0,gluc:0,lip:0}}]);
  S.customRecipes=[{id:'r',slots:['lunch'],name:'T',kcal:1,prot:1,gluc:1,lip:1,used:[{id:'cx_new',qty:1}],extras:[]}];
  apprendre();
  if(Object.keys(S.ingNames).length>600)throw new Error('plafond depasse : '+Object.keys(S.ingNames).length);
});

console.log('\n=== AJ. resolveInv : les trois niveaux de repli ===');
t('1. par identifiant',()=>{
  S.ingNames={};
  inv([{id:'cx_1',name:'Poulet',qty:500,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}}]);
  eq(resolveInv('cx_1','Poulet').id,'cx_1');
});
t('2. par nom quand l\'identifiant a change',()=>{
  S.ingNames={};
  inv([{id:'cx_NOUVEAU',name:'Poulet',qty:500,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}}]);
  eq(resolveInv('cx_ANCIEN','Poulet').id,'cx_NOUVEAU');
});
t('*** 3. par nom appris quand la recette n\'a pas de nom ***',()=>{
  S.ingNames={'cx_ANCIEN':'Poulet'};
  inv([{id:'cx_NOUVEAU',name:'Poulet',qty:500,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}}]);
  const r=resolveInv('cx_ANCIEN',undefined);   // aucun nom dans la recette
  if(!r)throw new Error('introuvable malgre le nom appris');
  eq(r.id,'cx_NOUVEAU');
});
t('rien nulle part : renvoie null sans planter',()=>{
  S.ingNames={};
  inv([]);
  if(resolveInv('inconnu',undefined))throw new Error('devrait etre null');
});
t('table absente : pas de plantage',()=>{
  delete S.ingNames;
  inv([{id:'a',name:'X',qty:1,unit:'g',mac100:{kcal:1,prot:0,gluc:0,lip:0}}]);
  resolveInv('zzz',undefined);
  eq(resolveInv('a','X').id,'a');
});

console.log('\n=== AK. Scenario complet : fusion de doublons ===');
t('*** une recette sans nom d\'ingredient survit a une fusion ***',()=>{
  // avant : deux articles "Poulet" en doublon, la recette vise le premier
  S.ingNames={};
  inv([
    {id:'cx_A',name:'Poulet',qty:300,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}},
    {id:'cx_B',name:'poulet',qty:200,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}}
  ]);
  const rec={id:'rr',slots:['lunch'],name:'Poulet riz',kcal:300,prot:30,gluc:10,lip:5,
             used:[{id:'cx_A',qty:150}],extras:[]};   // pas de champ n
  S.customRecipes=[rec];S.aiRecipes=[];
  apprendre();                                   // capte "cx_A -> Poulet"
  // la fusion supprime cx_A et garde un seul article
  S.inv.frigo=[{id:'cx_FUSION',name:'Poulet',qty:500,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}}];
  const it=resolveInv('cx_A',rec.used[0].n);
  if(!it)throw new Error('ingredient perdu apres fusion');
  eq(it.id,'cx_FUSION','article retrouve');
});
t('canCook fonctionne encore apres la fusion',()=>{
  const rec={id:'rr2',slots:['lunch'],name:'R',kcal:1,prot:1,gluc:1,lip:1,used:[{id:'cx_A',qty:150}],extras:[]};
  eq(sb.canCook(rec),true,'cuisinable');
});
t('canCook reste faux si le stock est insuffisant',()=>{
  S.inv.frigo=[{id:'cx_FUSION',name:'Poulet',qty:50,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}}];
  const rec={id:'rr3',slots:['lunch'],name:'R',kcal:1,prot:1,gluc:1,lip:1,used:[{id:'cx_A',qty:150}],extras:[]};
  eq(sb.canCook(rec),false,'stock insuffisant');
});

console.log('\n=== AL. Persistance ===');
t('ingNames est envoye dans l\'etat sauvegarde',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!/ingNames:S\.ingNames\|\|\{\}/.test(src))throw new Error('absent du payload');
});
t('ingNames est relu au chargement',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!src.includes('S.ingNames=(d.ingNames'))throw new Error('non restaure');
});
t('*** l\'apprentissage precede la fusion dans _applyState ***',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  const a=src.indexOf('apprendNomsIngredients();}catch(e){}');
  const b=src.indexOf('if(!d.dupMerged){if(_mergeDuplicates())');
  if(a<0||b<0)throw new Error('reperes introuvables');
  if(a>b)throw new Error('apprentissage APRES la fusion : trop tard');
});
t('_applyState reste tolerant aux donnees vides',()=>{
  sb._applyState({});sb._applyState({inv:null,dayMeals:null});
  sb._applyState({ingNames:'pas un objet',inv:{frigo:[]},dayMeals:{}});
  if(typeof S.ingNames!=='object')throw new Error('table cassee');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
