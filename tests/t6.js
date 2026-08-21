const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;const bugs=[];
function t(name,fn){try{fn();console.log('  ok  '+name);pass++;}
  catch(e){console.log('  KO  '+name+' -> '+e.message);fail++;bugs.push(name+' :: '+e.message);}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S;

function freshInv(){
  S.inv={frigo:[
    {id:'p1',name:'Poulet',qty:500,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}},
    {id:'p2',name:'Oeufs',qty:6,unit:'pcs',pieceG:55,macPiece:{kcal:78,prot:6.5,gluc:0.6,lip:5.3}},
    {id:'p3',name:'Sel',qty:null,unit:'g',mac100:{kcal:0,prot:0,gluc:0,lip:0}},
    {id:'p4',name:'Perime',qty:100,unit:'g',dlc:'2020-01-01',mac100:{kcal:50,prot:1,gluc:1,lip:1}},
    {id:'p5',name:'ZeroKcal',qty:100,unit:'g',mac100:{kcal:0,prot:0,gluc:0,lip:0}}
  ],placards:[
    {id:'p6',name:'Riz',qty:1000,unit:'g',mac100:{kcal:350,prot:7,gluc:78,lip:1}}
  ],congelateur:[],epices:[]};
}
freshInv();
S.dayMeals=S.dayMeals||{};

console.log('\n=== A. DATE COURANTE (S.today) ===');
t('*** S.today suit le changement de jour ***',()=>{
  // Simule : l'app est restee ouverte, on est passe au lendemain
  const vrai=sb.getToday();
  if(S.today!==vrai)throw new Error('S.today='+S.today+' alors que getToday()='+vrai);
  // La constante TODAY est figee au chargement du script : verifions
  const fs=require('fs');const src=fs.readFileSync('index.html','utf8');
  if(/const TODAY\s*=\s*getToday\(\);/.test(src) && !/_refreshToday|S\.today\s*=\s*getToday\(\)/.test(src))
    throw new Error('TODAY fige au chargement, jamais rafraichi ensuite');
});

console.log('\n=== B. MACROS ET TOTAUX ===');
t('getDayMacros sur un jour vide',()=>{
  const m=sb.getDayMacros('2026-01-01');
  eq(m.kcal,0,'kcal');
});
t('getDayMacros additionne les repas',()=>{
  S.dayMeals['2026-03-01']=[
    {rid:'x1',name:'A',mult:1,macros:{kcal:500,prot:30,gluc:50,lip:15}},
    {rid:'x2',name:'B',mult:1,macros:{kcal:300,prot:20,gluc:30,lip:8}}];
  const m=sb.getDayMacros('2026-03-01');
  eq(m.kcal,800,'kcal');eq(m.prot,50,'prot');
});
t('getDayMacros gere macros absentes',()=>{
  S.dayMeals['2026-03-02']=[{rid:'zz',name:'Sans macros',mult:1}];
  const m=sb.getDayMacros('2026-03-02');
  if(isNaN(m.kcal))throw new Error('NaN');
});
t('getDayMacros gere mult fractionnaire',()=>{
  S.dayMeals['2026-03-03']=[{rid:'x',name:'A',mult:0.5,macros:{kcal:400,prot:20,gluc:40,lip:10}}];
  const m=sb.getDayMacros('2026-03-03');
  if(isNaN(m.kcal))throw new Error('NaN');
});
t('_reconcileMacros : kcal deduit des macros si absent',()=>{
  const r=sb._reconcileMacros({kcal:0,prot:10,gluc:10,lip:10});
  eq(r.kcal,170,'4*10+4*10+9*10');
});
t('_reconcileMacros : valeurs negatives ramenees a 0',()=>{
  const r=sb._reconcileMacros({kcal:-50,prot:-5,gluc:0,lip:0});
  if(r.kcal<0||r.prot<0)throw new Error(JSON.stringify(r));
});

console.log('\n=== C. INVENTAIRE ===');
t('findItem trouve dans toutes les categories',()=>{
  if(!sb.findItem('p6'))throw new Error('p6 introuvable');
});
t('findItem sur id inexistant ne casse pas',()=>{
  const r=sb.findItem('nexistepas');
  if(r)throw new Error('devrait etre falsy');
});
t('findItemByName insensible a la casse/accents',()=>{
  if(!sb.findItemByName('POULET'))throw new Error('POULET introuvable');
});
t('invIssues detecte les DLC depassees',()=>{
  const i=sb.invIssues();
  const s=JSON.stringify(i);
  if(!s.includes('p4')&&!s.toLowerCase().includes('perime'))throw new Error('DLC non detectee: '+s.slice(0,200));
});
t('invIssues detecte les articles non convertibles',()=>{
  // un article en pieces sans macPiece, sans pkg.size et sans pieceG :
  // ses calories ne peuvent pas etre calculees
  S.inv.frigo.push({id:'p9',name:'Inconvertible',qty:3,unit:'pcs',mac100:{kcal:200,prot:5,gluc:5,lip:5}});
  const s=JSON.stringify(sb.invIssues());
  freshInv();
  if(!s.includes('p9')&&!s.includes('Inconvertible'))throw new Error('non detecte : '+s.slice(0,200));
});
t('countDuplicates sur inventaire propre = 0',()=>{
  eq(sb.countDuplicates(),0);
});
t('countDuplicates detecte un doublon',()=>{
  S.inv.frigo.push({id:'p1b',name:'poulet',qty:200,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}});
  if(sb.countDuplicates()<1)throw new Error('doublon non vu');
  freshInv();
});
t('qty null = stock illimite, jamais decremente en negatif',()=>{
  const sel=sb.findItem('p3');
  eq(sel.qty,null,'sel illimite');
});

console.log('\n=== D. RECETTES <-> INVENTAIRE ===');
t('resolveInv retombe sur le nom quand l\'identifiant a change',()=>{
  // la fusion de doublons change les id : le repli par nom est le filet
  const it=sb.findItem('p1');
  const r=sb.resolveInv('id_qui_nexiste_plus',it.name);
  if(!r)throw new Error('repli par nom inoperant');
  eq(r.id,'p1','article retrouve');
});
t('recipeMacros ne renvoie pas NaN',()=>{
  const mauvais=[];
  (sb.RCP||[]).slice(0,40).forEach(r=>{
    try{const m=sb.recipeMacros(r);
      if(m&&(isNaN(m.kcal)||isNaN(m.prot)))mauvais.push(r.name);
    }catch(e){mauvais.push(r.name+' (throw: '+e.message+')');}
  });
  if(mauvais.length)throw new Error(mauvais.slice(0,3).join(', '));
});
t('canCook ne jette pas sur toutes les recettes',()=>{
  const ko=[];
  (sb.RCP||[]).slice(0,40).forEach(r=>{try{sb.canCook(r);}catch(e){ko.push(r.name+': '+e.message);}});
  if(ko.length)throw new Error(ko.slice(0,3).join(' | '));
});
t('findRecipe sur id inexistant ne casse pas',()=>{
  sb.findRecipe('nope');
});

console.log('\n=== E. TRACKER : ajout / suppression / copie ===');
t('copyMealTo copie sans muter la source',()=>{
  S.dayMeals['2026-04-01']=[{rid:'c1',name:'Repas',mult:1,macros:{kcal:400,prot:20,gluc:40,lip:10}}];
  S.dayMeals['2026-04-02']=[];
  const avant=JSON.stringify(S.dayMeals['2026-04-01']);
  try{sb.copyMealTo('2026-04-01',0,'2026-04-02');}catch(e){throw new Error('throw: '+e.message);}
  eq(JSON.stringify(S.dayMeals['2026-04-01']),avant,'source mutee');
});
t('*** copie profonde : modifier la copie n\'altere pas l\'original ***',()=>{
  const src=S.dayMeals['2026-04-01'][0];
  const cp=(S.dayMeals['2026-04-02']||[])[0];
  if(!cp)throw new Error('copie absente');
  if(cp.macros===src.macros)throw new Error('macros partagees par reference (copie superficielle)');
});
t('getDayMacros apres copie',()=>{
  const m=sb.getDayMacros('2026-04-02');
  eq(m.kcal,400,'kcal copie');
});

console.log('\n=== F. DEPENSE ===');
t('burnStepKcal sur valeurs limites',()=>{
  eq(sb.burnStepKcal(0),0);eq(sb.burnStepKcal(10000),400);
  if(isNaN(sb.burnStepKcal(null))||isNaN(sb.burnStepKcal(undefined)))throw new Error('NaN');
});
t('burnDayTotal sur jour sans donnee',()=>{
  const r=sb.burnDayTotal('2026-01-01');
  if(r!==null&&isNaN(r))throw new Error('NaN');
});

console.log('\n=== G. PARSING ===');
t('extractJSON tolere les balises markdown',()=>{
  const o=sb.extractJSON('```json\n{"a":1}\n```');
  eq(o.a,1);
});
t('extractJSON tolere du texte autour',()=>{
  const o=sb.extractJSON('Voici : {"a":2} voila');
  eq(o.a,2);
});
t('extractJSON tolere les balises <think>',()=>{
  const o=sb.extractJSON('<think>bla</think>{"a":3}');
  eq(o.a,3);
});
t('extractJSONArray recupere un tableau tronque',()=>{
  const a=sb.extractJSONArray('[{"n":1},{"n":2},{"n":3');
  if(!Array.isArray(a)||a.length<2)throw new Error(JSON.stringify(a));
});
t('_parseQty renvoie size/unit/count',()=>{
  const cas={'500g':[500,'g',1],'2x250g':[250,'g',2],'1.5kg':[1500,'g',1],'33cl':[330,'ml',1]};
  const ko=[];
  Object.keys(cas).forEach(k=>{
    const r=sb._parseQty(k);
    if(!r){ko.push(k+' -> null');return;}
    const[si,u,c]=cas[k];
    if(r.size!==si||r.unit!==u||r.count!==c)ko.push(k+' -> '+JSON.stringify(r));
  });
  if(ko.length)throw new Error(ko.join(' | '));
});
t('_normNom neutralise casse et accents',()=>{
  eq(sb._normNom('Crème Fraîche'),sb._normNom('creme fraiche'));
});

console.log('\n=== H. ETAT / MIGRATION ===');
t('_applyState convertit qty -1 en null',()=>{
  sb._applyState({inv:{frigo:[{id:'z1',name:'Test',qty:-1,unit:'g'}]},dayMeals:{}});
  const it=sb.findItem('z1');
  if(!it)throw new Error('article perdu');
  eq(it.qty,null,'qty -1 doit devenir null');
});
t('_applyState sur donnees vides ne casse pas',()=>{
  sb._applyState(null);sb._applyState({});sb._applyState({inv:null,dayMeals:null});
});
t('_applyState conserve les repas',()=>{
  sb._applyState({inv:{frigo:[]},dayMeals:{'2026-05-01':[{rid:'a',name:'X',mult:1,macros:{kcal:100,prot:1,gluc:1,lip:1}}]}});
  if(!S.dayMeals['2026-05-01'])throw new Error('repas perdus');
});

console.log('\n---- '+pass+' ok, '+fail+' KO ----');
if(bugs.length){console.log('\nECHECS :');bugs.forEach(b=>console.log('  - '+b));}
