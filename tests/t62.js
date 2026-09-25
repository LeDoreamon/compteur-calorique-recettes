const {sb}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const repas=(k,p,fib)=>JSON.stringify([{rid:'x',name:'R',macros:Object.assign({kcal:k,prot:p,gluc:0,lip:0},fib!=null?{fib:fib}:{})}]);
function prepa(obj,today){X("_loaded=true;S.dayMeals={};S.weights=[];S.mesures=[];S.weightGoal=null;S.bilanVu=null;TARGETS={kcal:2000,prot:150,gluc:200,lip:60};__setBurn({});");
  X("S.profil="+(obj?"{objectif:'"+obj+"'}":"null")+";");if(today)X("S.today='"+today+"';");}
const aujOrig=X('S.today');

console.log('\n=== XIIA. Activite selon l\'objectif ===');
t('*** seche : la cible du jour ne bouge pas ; maintien et prise : activite comptee ***',()=>{
  prepa('perte');X("__setBurn({[S.today]:{steps:0,activities:[{name:'Muscu',min:60,kcal:400}]}});");
  const dep=X('_depenseDuJour(S.today)');if(!(dep>0))throw new Error('depense');
  eq(X('_cibleDuJour(S.today)'),2000,'seche');
  X("S.profil={objectif:'maintien'};");eq(X('_cibleDuJour(S.today)'),2000+dep,'maintien');
  X("S.profil={objectif:'prise'};");eq(X('_cibleDuJour(S.today)'),2000+dep,'prise');
});
t('reste du jour et coach suivent la cible du jour',()=>{
  prepa('maintien');X("__setBurn({[S.today]:{steps:0,activities:[{name:'Velo',min:60,kcal:500}]}});S.dayMeals[S.today]="+repas(2200,150)+";");
  const dep=X('_depenseDuJour(S.today)');
  eq(X('resteDuJour(S.today).kcal'),2000+dep-2200);
  const a=X('coachAdvice(S.today)');if(/au-dessus de la cible/.test(a.titre+a.corps))throw new Error('depassement annonce a tort : '+a.titre);
});

console.log('\n=== XIIB. Proteines : un seul seuil ===');
t('*** 95 % de la cible comptent partout ***',()=>{
  prepa('perte');X("S.dayMeals[S.today]="+repas(2000,143)+";");
  eq(X('_protOk(143)'),true);eq(X('_protOk(142)'),false);
  eq(X("_etatJour(S.today).protOk"),true,'calendrier');
  eq(X("protStreak().cur"),1,'serie');
});

console.log('\n=== XIIC. Point du coach ===');
t('*** la tuile « Balance » a disparu ; sans TDEE, « Reste » ***',()=>{
  prepa('perte');X("S.dayMeals[S.today]="+repas(800,50)+";S.dayMeals[shiftDate(S.today,-1)]="+repas(2000,150)+";");
  const h=X('renderCoachSummary()');
  if(/Balance|balance/.test(h))throw new Error('balance');
  if(h.indexOf('>Reste<')<0||h.indexOf('>1200<')<0)throw new Error('tuile Reste');
});
t('*** avec un TDEE : deficit moyen estime et perte hebdomadaire ***',()=>{
  prepa('perte');
  for(let i=1;i<=30;i++)X("S.dayMeals[shiftDate(S.today,-"+i+")]="+repas(2000,150)+";");
  X("S.weights=[];for(var i=30;i>=0;i-=2)S.weights.push({d:shiftDate(S.today,-i),w:+(85-(30-i)*0.05).toFixed(2)});");
  const td=X('estimateTDEE()');if(!td.ok)throw new Error('TDEE indisponible : '+td.reason);
  const h=X('renderCoachSummary()');
  if(h.indexOf('Déficit/j')<0)throw new Error('tuile deficit');
  if(!/déficit d'environ \d+ kcal\/j, soit ~0,\d+ kg par semaine/.test(h))throw new Error((h.match(/Par rapport[^<]*/)||['phrase absente'])[0]);
});
t('fibres : moyenne dans le point du coach, remarque en fin de journee',()=>{
  prepa('perte');for(let i=1;i<=4;i++)X("S.dayMeals[shiftDate(S.today,-"+i+")]="+repas(2000,150,14)+";");
  if(X('renderCoachSummary()').indexOf('Fibres : ~14 g/jour (repère 30 g)')<0)throw new Error('moyenne');
  const hier=X('shiftDate(S.today,-1)');
  if(X("coachAdvice('"+hier+"').corps").indexOf('Fibres : 14 g')<0)throw new Error('remarque');
  X("S.dayMeals[S.today]="+repas(500,40,3)+";");
  if(X('coachAdvice(S.today).corps').indexOf('Fibres')>=0)throw new Error('remarque en pleine journee');
});

console.log('\n=== XIID. Bilan de la semaine ===');
t('*** lundi : bilan de la semaine precedente ***',()=>{
  prepa('perte','2026-08-31');   // lundi
  for(let i=1;i<=7;i++)X("S.dayMeals[shiftDate(S.today,-"+i+")]="+repas(i<=5?2000:2600,i<=4?150:100,20)+";");
  X("S.weights=[{d:'2026-08-18',w:85},{d:'2026-08-20',w:85},{d:'2026-08-25',w:84.4},{d:'2026-08-28',w:84.4}];");
  const h=X('renderBilanSemaine()');
  if(h.indexOf('24/08 au 30/08')<0)throw new Error('periode');
  if(h.indexOf('Semaine solide')<0)throw new Error('titre : '+(h.match(/font-weight:600;color:var\(--text\);margin-bottom:4px;">([^<]*)/)||[])[1]);
  if(h.indexOf('>5 / 7<')<0)throw new Error('jours dans la cible');
  if(h.indexOf('atteintes 4 j')<0)throw new Error('proteines');
  if(h.indexOf('−0,6 kg')<0)throw new Error('poids');
  if(h.indexOf('20 g/j')<0)throw new Error('fibres');
});
t('masque jusqu\'a la semaine suivante, absent le mercredi',()=>{
  prepa('perte','2026-08-31');X("S.dayMeals[shiftDate(S.today,-2)]="+repas(2000,150)+";");
  if(!X('renderBilanSemaine()'))throw new Error('absent lundi');
  X('masquerBilanSemaine()');eq(X('S.bilanVu'),'2026-08-31');eq(X('renderBilanSemaine()'),'','toujours visible');
  X("S.today='2026-09-01';");eq(X('renderBilanSemaine()'),'','revient le mardi');
  X("S.bilanVu=null;S.today='2026-09-02';");eq(X('renderBilanSemaine()'),'','present le mercredi');
});
t('le bilan est en tete du Bilan et « bilanVu » est synchronise',()=>{
  const src=fs.readFileSync('index.html','utf8');
  if(!/var html=renderBilanSemaine\(\)\+renderCoachSummary\(\)/.test(src))throw new Error('placement');
  if(src.indexOf('bilanVu:S.bilanVu||null')<0)throw new Error('payload');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
X("S.today='"+aujOrig+"';");
console.log('---- '+pass+' ok, '+fail+' KO');})();
