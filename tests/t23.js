const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const hier=sb.shiftDate(S.today,-1), avant=sb.shiftDate(S.today,-3), demain=sb.shiftDate(S.today,1);

function ajoute(jourAffiche,nom){
  S.displayDate=jourAffiche;
  sb.openAddMeal('text');
  G('manualAddMeal')();
  docEl('addmeal-name').value=nom||'Test';
  docEl('addmeal-kcal').value=2355;docEl('addmeal-prot').value=72;
  docEl('addmeal-gluc').value=183;docEl('addmeal-lip').value=133;
  sb.confirmAddMealFinal();
}
function jours(){return Object.keys(S.dayMeals||{}).filter(k=>(S.dayMeals[k]||[]).length);}

console.log('\n=== CC. Le repas suit le jour affiche ===');
t('*** un repas saisi en consultant hier va sur hier ***',()=>{
  S.dayMeals={};S.inv={frigo:[],placards:[],congelateur:[],epices:[]};
  ajoute(hier,'Five Guys');
  const h=(S.dayMeals[hier]||[]);
  if(!h.length)throw new Error('rien sur hier, jours remplis : '+jours().join(','));
  eq(h[0].name,'Five Guys');
  eq((S.dayMeals[S.today]||[]).length,0,'rien ne doit atterrir sur aujourd\'hui');
});
t('les macros sont bien celles saisies',()=>{
  const m=S.dayMeals[hier][0].macros;
  eq(m.kcal,2355);eq(m.prot,72);eq(m.gluc,183);eq(m.lip,133);
});
t('un repas saisi sur aujourd\'hui reste sur aujourd\'hui',()=>{
  S.dayMeals={};
  ajoute(S.today,'Normal');
  eq((S.dayMeals[S.today]||[]).length,1);
  eq((S.dayMeals[hier]||[]).length,0);
});
t('un jour plus ancien fonctionne aussi',()=>{
  S.dayMeals={};
  ajoute(avant,'Vieux');
  eq((S.dayMeals[avant]||[]).length,1);
});
t('displayDate absent : repli sur aujourd\'hui',()=>{
  S.dayMeals={};S.displayDate=null;
  sb.openAddMeal('text');G('manualAddMeal')();
  docEl('addmeal-name').value='Repli';
  docEl('addmeal-kcal').value=500;docEl('addmeal-prot').value=10;
  docEl('addmeal-gluc').value=50;docEl('addmeal-lip').value=10;
  sb.confirmAddMealFinal();
  eq((S.dayMeals[S.today]||[]).length,1);
  S.displayDate=S.today;
});

console.log('\n=== CD. Le jour est fige a l\'ouverture ===');
t('*** changer de jour pendant la saisie ne deplace pas le repas ***',()=>{
  S.dayMeals={};
  S.displayDate=hier;
  sb.openAddMeal('text');G('manualAddMeal')();
  S.displayDate=S.today;            // l'utilisateur navigue ailleurs entre-temps
  docEl('addmeal-name').value='Fige';
  docEl('addmeal-kcal').value=400;docEl('addmeal-prot').value=10;
  docEl('addmeal-gluc').value=40;docEl('addmeal-lip').value=10;
  sb.confirmAddMealFinal();
  eq((S.dayMeals[hier]||[]).length,1,'doit rester sur le jour d\'ouverture');
  eq((S.dayMeals[S.today]||[]).length,0);
});

console.log('\n=== CE. Bandeau d\'avertissement ===');
t('aucun bandeau quand c\'est aujourd\'hui',()=>{
  S.displayDate=S.today;
  sb.openAddMeal('text');
  eq(docEl('addmeal-daynote').style.display,'none');
});
t('*** bandeau affiche quand ce n\'est pas aujourd\'hui ***',()=>{
  S.displayDate=hier;
  sb.openAddMeal('text');
  const el=docEl('addmeal-daynote');
  eq(el.style.display,'block','affiche');
  if(!/hier/.test(el.textContent))throw new Error(el.textContent);
  if(!/pas aujourd/.test(el.textContent))throw new Error(el.textContent);
});
t('le bandeau nomme « demain » pour un jour futur',()=>{
  S.displayDate=demain;
  sb.openAddMeal('text');
  if(!/demain/.test(docEl('addmeal-daynote').textContent))
    throw new Error(docEl('addmeal-daynote').textContent);
});
t('le bandeau donne la date pour un jour plus lointain',()=>{
  S.displayDate=avant;
  sb.openAddMeal('text');
  const p=avant.split('-');
  if(!docEl('addmeal-daynote').textContent.includes(p[2]+'/'+p[1]))
    throw new Error(docEl('addmeal-daynote').textContent);
});
t('le bandeau est hors de l\'ecran d\'entree (visible aussi en confirmation)',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  const iNote=src.indexOf('id="addmeal-daynote"');
  const iInput=src.indexOf('id="addmeal-input"');
  if(iNote>iInput)throw new Error('le bandeau est enferme dans l\'ecran d\'entree');
});
t('pas de undefined dans le libelle',()=>{
  [hier,avant,demain,S.today].forEach(function(d){
    S.displayDate=d;sb.openAddMeal('text');
    if(/undefined|NaN/.test(docEl('addmeal-daynote').textContent||''))
      throw new Error(d+' : '+docEl('addmeal-daynote').textContent);
  });
});

console.log('\n=== CF. Garde nocturne ===');
t('*** la question hier/aujourd\'hui ne se pose plus si le jour est choisi ***',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!/_jour===S\.today&&new Date\(\)\.getHours\(\)<4/.test(src))
    throw new Error('la garde nocturne s\'applique encore a un jour choisi');
});
t('elle reste active quand on loggue aujourd\'hui',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!/S\.pendingFreeMeal=_meal/.test(src))throw new Error('garde nocturne supprimee');
});
t('le coach commente le bon jour',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!/showCoachToast\(_jour\)/.test(src))throw new Error('coach sur le mauvais jour');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
