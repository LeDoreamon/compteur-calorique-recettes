const {sb}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const repas=k=>JSON.stringify([{rid:'x',name:'R',macros:{kcal:k,prot:150,gluc:0,lip:0}}]);
function prepa(obj){X("_loaded=true;S.dayMeals={};S.weights=[];S.weightGoal=null;TARGETS={kcal:2000,prot:150,gluc:200,lip:60};__setBurn({});");
  X("S.profil="+(obj?"{objectif:'"+obj+"'}":"null")+";");}

console.log('\n=== XIA. Objectif ===');
t('*** trois objectifs, le maintien n\'est plus une seche ***',()=>{
  prepa('maintien');eq(X('_objectif()'),'maintien');eq(X('_libObjectif()'),'Maintien');eq(X('_enPriseDeMasse()'),false);
  prepa('prise');eq(X('_libObjectif()'),'Prise de masse');
  prepa('perte');eq(X('_libObjectif()'),'Sèche');
});
t('sans profil : le poids cible tranche, sinon seche',()=>{
  prepa(null);eq(X('_objectif()'),'perte');
  X("S.weights=[{d:'2026-09-01',w:80}];S.weightGoal=85;");eq(X('_objectif()'),'prise');
  X("S.weightGoal=75;");eq(X('_objectif()'),'perte');
});

console.log('\n=== XIB. Point du coach ===');
t('*** au-dessus de la cible : +150 kcal/j = 1050 kcal sur la semaine (pas 1400), sans parler de « surplus » ***',()=>{
  prepa('perte');for(let i=1;i<=7;i++)X("S.dayMeals[shiftDate(S.today,-"+i+")]="+repas(2150)+";");
  const h=X('renderCoachSummary()');
  if(h.indexOf('Sur 7 jours, moyenne de 2150 kcal : 150 au-dessus de ta cible chaque jour (≈ 1050 kcal sur une semaine). Resserre un peu.')<0)throw new Error(h.match(/Sur \d+ jours[^<]*/)+'');
  if(/surplus/.test(h))throw new Error('« surplus » alors que ce n\'en est pas un');
});
t('*** moyenne 7 j : ni aujourd\'hui, ni journees incompletes, comme le pilotage ***',()=>{
  prepa('perte');
  X("S.dayMeals[S.today]="+repas(300)+";");                              // aujourd'hui, pas fini
  X("S.dayMeals[shiftDate(S.today,-1)]="+repas(2000)+";S.dayMeals[shiftDate(S.today,-2)]="+repas(2100)+";");
  X("S.dayMeals[shiftDate(S.today,-3)]="+repas(400)+";");                  // saisie partielle
  const h=X('renderCoachSummary()');
  if(h.indexOf('Sur 2 jours, moyenne de 2050 kcal')<0)throw new Error('coach : '+(h.match(/Sur \d+ jours?, moyenne de \d+/)||[''])[0]);
  eq(Math.round(X('avgMacrosOverDays(7).kcal')),2050,'pilotage');
  if(h.indexOf('sur 2 (7 jours précédents')<0)throw new Error('decompte proteines');
});
t('maintien sous la cible : invite a remonter, pas « le deficit est la »',()=>{
  prepa('maintien');for(let i=1;i<=3;i++)X("S.dayMeals[shiftDate(S.today,-"+i+")]="+repas(1600)+";");
  const h=X('renderCoachSummary()');
  if(/déficit est là/.test(h)||h.indexOf('Pour un maintien, remonte')<0)throw new Error('phrase');
});
t('titre du pilotage selon l\'objectif',()=>{
  prepa('maintien');X("S.dayMeals[shiftDate(S.today,-1)]="+repas(2000)+";");
  if(X('renderCockpit()').indexOf('Pilotage du maintien')<0)throw new Error('maintien');
  prepa('perte');X("S.dayMeals[shiftDate(S.today,-1)]="+repas(2000)+";");
  if(X('renderCockpit()').indexOf('Pilotage de la sèche')<0)throw new Error('seche');
});

/* phrase du coach et tuile « Calories/j » du pilotage : une seule regle (5 % de la cible, 18/10/2026) */
const coherence=(obj,cible,k)=>{
  prepa(obj);X("TARGETS={kcal:"+cible+",prot:175,gluc:208,lip:80};");
  for(let i=1;i<=7;i++)X("S.dayMeals[shiftDate(S.today,-"+i+")]="+repas(k)+";");
  const coach=X('renderCoachSummary()'),tuile=(X('renderCockpit()').match(/Calories\/j<\/div><div style="[^"]*color:([^;]+);/)||[])[1];
  return {coach,tuile,vert:/border-left:3px solid var\(--green\)/.test(coach)};
};
t('*** cas de Liam : 2430 pour 2310 (+120, palier 116) = au-dessus partout, plus de « pile sur ta cible » en vert au-dessus d\'une tuile orange ***',()=>{
  const r=coherence('perte',2310,2430);
  eq(r.tuile,'var(--orange)','tuile');eq(r.vert,false,'bordure du coach');
  if(r.coach.indexOf('Sur 7 jours, moyenne de 2430 kcal : 120 au-dessus de ta cible chaque jour')<0)throw new Error(r.coach.match(/Sur 7[^<]*/)+'');
  if(/pile sur ta cible|surplus/.test(r.coach))throw new Error('ancien libelle');
});
t('*** 2420 pour 2310 (+110, sous le palier) : dans ta cible partout ***',()=>{
  const r=coherence('perte',2310,2420);eq(r.tuile,'var(--green)');eq(r.vert,true);
  if(r.coach.indexOf('Sur 7 jours, moyenne de 2420 kcal : dans ta cible.')<0)throw new Error(r.coach.match(/Sur 7[^<]*/)+'');
});
t('seche bien en dessous : vert partout (le deficit est la)',()=>{
  const r=coherence('perte',2310,1900);eq(r.tuile,'var(--green)');eq(r.vert,true);
});
t('prise de masse (palier 160 pour 3200) : 3050 tenu, 3000 trop court, au-dessus toujours bon',()=>{
  let r=coherence('prise',3200,3050);eq(r.tuile,'var(--green)','3050');eq(r.vert,true,'3050 coach');
  r=coherence('prise',3200,3000);eq(r.tuile,'var(--orange)','3000');eq(r.vert,false,'3000 coach');
  r=coherence('prise',3200,3600);eq(r.tuile,'var(--green)','3600 : la tuile ne punit plus un surplus voulu');
});
t('maintien (palier 130 pour 2600) : ±130 dans la cible, au-dela de chaque cote = orange',()=>{
  let r=coherence('maintien',2600,2700);eq(r.tuile,'var(--green)');eq(r.vert,true);
  r=coherence('maintien',2600,2750);eq(r.tuile,'var(--orange)');eq(r.vert,false);
  r=coherence('maintien',2600,2450);eq(r.tuile,'var(--orange)');eq(r.vert,false);
});
t('la tuile « Déficit/jour » du coach dit sa periode (7 j), la carte de la semaine dit « cette semaine »',()=>{
  prepa('perte');X("TARGETS={kcal:2310,prot:175,gluc:208,lip:80};");
  for(let i=1;i<=7;i++)X("S.dayMeals[shiftDate(S.today,-"+i+")]="+repas(2430)+";");
  const vrai=X('estimateTDEE');X("estimateTDEE=function(){return {ok:true,tdee:2787};}");
  try{const h=X('renderCoachSummary()');
    if(!/Déficit\/jour<\/div><div[^>]*>357<\/div><div[^>]*>kcal · 7 j</.test(h))throw new Error('tuile : '+(h.match(/Déficit\/jour.{0,200}/)||[''])[0]);
    if(h.indexOf('Ce déficit moyen estimé (357 kcal/j)')<0)throw new Error('phrase');
  }finally{sb.__e=vrai;X('estimateTDEE=__e');}
});

console.log('\n=== XIC. Conseils TDEE selon l\'objectif ===');
const bloc=pw=>X('renderTDEEBlock')({ok:true,tdee:2400,perWeek:pw,days:28,avgCal:2400,logs:20});
t('*** maintien : stable = cible validee, perte = remonter vers le TDEE ***',()=>{
  prepa('maintien');
  if(bloc(0.05).indexOf('Poids stable')<0)throw new Error('stable');
  const h=bloc(0.3);if(h.indexOf('remonte vers ~2400')<0||/sèche/.test(h))throw new Error('perte en maintien');
  if(bloc(-0.3).indexOf('redescends vers ~2400')<0)throw new Error('prise en maintien');
});
t('*** prise : rythme, trop vite, stagnation ***',()=>{
  prepa('prise');
  if(bloc(-0.25).indexOf('Bon rythme de prise')<0)throw new Error('rythme');
  if(bloc(-0.8).indexOf('Tu prends vite')<0)throw new Error('trop vite');
  const h=bloc(0.3);if(h.indexOf('Ta prise stagne')<0||h.indexOf('~2700')<0||/sèche/.test(h))throw new Error('stagne');
});
t('seche inchangee',()=>{prepa('perte');if(bloc(0.3).indexOf('Bon rythme de sèche')<0)throw new Error('seche');});
t('l\'en-tete et les reglages affichent l\'objectif reel',()=>{
  const src=fs.readFileSync('index.html','utf8');
  if(!/\$\{_libObjectif\(\)\} · \$\{TARGETS\.kcal\} kcal/.test(src))throw new Error('entete');
  if(!/var but=_libObjectif\(\);/.test(src))throw new Error('reglages');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
