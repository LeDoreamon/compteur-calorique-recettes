// Garde nocturne des repas libres (16/11/2026, rapport de Liam : une part de plat notee entre minuit et 4 h a disparu,
// stock retire) : le repas est range tout de suite dans la journee, la question ne fait que le deplacer
const {sb,docEl}=require('./sb.js');
const vm=require('vm');
const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
const HIER=()=>X('shiftDate(S.today,-1)');
const nuit=(f)=>{const vrai=sb.heureProfil;sb.heureProfil=()=>1;X('var __hp=heureProfil;heureProfil=function(){return 1;}');try{return f();}finally{X('heureProfil=__hp');sb.heureProfil=vrai;}};
const prepa=()=>X(`_loaded=true;S.mainTab='accueil';S.displayDate=S.today;S.dayMeals={};
  S.inv={frigo:[{id:'pn',name:'Pseudo Nuggets',qty:3,unit:'parts',pieceG:99,macPiece:{kcal:323,prot:40,gluc:1,lip:14},plat:{creeLe:S.today,parts:3,poidsEstime:99,ings:[]}}],congelateur:[],placards:[],epices:[]};`);
const ajouterPart=()=>nuit(()=>{X("openAddMeal('text');setMealStock(true);_invPick={pn:1};applyInvPick();setInvMode(true);setAmSlot('lunch')");docEl('inv-cb-0').checked=true;docEl('inv-qty-0').value='1';docEl('addmeal-name').value='Pseudo Nuggets';X('confirmAddMealFinal()');});

console.log('\n=== XCIII. Repas note entre minuit et 4 h : jamais perdu ===');
t('*** part de plat notee a 1 h : rangee tout de suite dans aujourd\'hui (stock retire ET repas present) ***',()=>{
  prepa();ajouterPart();
  eq(X("findItem('pn').qty"),2,'stock');
  eq(X('(S.dayMeals[S.today]||[]).length'),1,'repas absent de la journee :');
  eq(X('S.dayMeals[S.today][0].nuit'),1);eq(X('S.mainTab'),'recipes');eq(X('S.displayDate'),X('S.today'));
});
t('*** le repas en attente fait partie de l\'etat enregistre : un rechargement ne le perd plus ***',()=>{
  prepa();ajouterPart();
  const e=JSON.parse(JSON.stringify(X('_etatPourEnvoi()')));
  eq(e.dayMeals[X('S.today')].length,1);eq(e.dayMeals[X('S.today')][0].nuit,1);
  if(/S\.pendingFreeMeal\s*=/.test(src))throw new Error('repas encore garde hors de l\'etat');
});
t('la question s\'affiche avec le nom du repas, et revient tant qu\'on n\'a pas repondu',()=>{
  prepa();ajouterPart();
  const h=X('renderFreeMealNightModal()');
  if(h.indexOf('Pseudo Nuggets')<0||h.indexOf('est noté pour aujourd')<0)throw new Error(h.replace(/<[^>]+>/g,' '));
  if(h.indexOf('data-day="'+HIER()+'"')<0||h.indexOf('data-day="'+X('S.today')+'"')<0)throw new Error('boutons');
  X('render()');if(X('renderFreeMealNightModal()')==='')throw new Error('question perdue apres un rendu');
});
t('*** « Hier » : le repas passe a hier, sans toucher une seconde fois au stock ***',()=>{
  prepa();ajouterPart();X("confirmFreeMealDay('"+HIER()+"')");
  eq(X('(S.dayMeals[S.today]||[]).length'),0);eq(X("S.dayMeals['"+HIER()+"'].length"),1);
  eq(X("S.dayMeals['"+HIER()+"'][0].nuit"),undefined);eq(X("findItem('pn').qty"),2);eq(X('renderFreeMealNightModal()'),'');
});
t('« Aujourd\'hui » : le repas reste, la question disparait',()=>{
  prepa();ajouterPart();X("confirmFreeMealDay(S.today)");
  eq(X('S.dayMeals[S.today].length'),1);eq(X('S.dayMeals[S.today][0].nuit'),undefined);eq(X('renderFreeMealNightModal()'),'');
  X("confirmFreeMealDay(S.today)");eq(X('S.dayMeals[S.today].length'),1,'second appel');
});
t('*** deux repas notes de nuit sans repondre : aucun n\'ecrase l\'autre, la question est posee pour chacun ***',()=>{
  prepa();ajouterPart();ajouterPart();
  eq(X('S.dayMeals[S.today].length'),2);eq(X("findItem('pn').qty"),1);
  X("confirmFreeMealDay('"+HIER()+"')");if(X('renderFreeMealNightModal()')==='')throw new Error('seconde question absente');
  X("confirmFreeMealDay(S.today)");eq(X('renderFreeMealNightModal()'),'');
  eq(X("S.dayMeals['"+HIER()+"'].length"),1);eq(X('S.dayMeals[S.today].length'),1);
});
t('jour choisi a la main (demain) ou apres 4 h : aucune question, aucune marque',()=>{
  prepa();X("S.mainTab='recipes';S.displayDate=shiftDate(S.today,1)");
  nuit(()=>{X("openAddMeal('text');setMealStock(true);_invPick={pn:1};applyInvPick();setInvMode(true);setAmSlot('lunch')");docEl('inv-cb-0').checked=true;docEl('inv-qty-0').value='1';docEl('addmeal-name').value='P';X('confirmAddMealFinal()');});
  eq(X("S.dayMeals[shiftDate(S.today,1)].length"),1);eq(X("S.dayMeals[shiftDate(S.today,1)][0].nuit"),undefined);
  prepa();X("openAddMeal('text');setMealStock(true);_invPick={pn:1};applyInvPick();setInvMode(true);setAmSlot('lunch')");docEl('inv-cb-0').checked=true;docEl('inv-qty-0').value='1';docEl('addmeal-name').value='P';X('confirmAddMealFinal()');
  eq(X('S.dayMeals[S.today][0].nuit'),undefined);
});
t('copier ou refaire un repas encore marque : la copie ne porte pas la marque',()=>{
  if(src.indexOf('const copy=JSON.parse(JSON.stringify(meal));delete copy.nuit;')<0)throw new Error('copie');
  if(src.indexOf('var copie=JSON.parse(JSON.stringify(src));delete copie.nuit;')<0)throw new Error('refaire');
});

(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' -> '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
