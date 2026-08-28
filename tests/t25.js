const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const coachAct=G('coachActivite');
const src=require('fs').readFileSync('index.html','utf8');

function jour(kcal,prot){
  S.dayMeals[S.today]=kcal?[{rid:'x',name:'J',mult:1,macros:{kcal:kcal,prot:prot||0,gluc:50,lip:20}}]:[];
}
function depense(day,steps,acts){
  G('__setBurn')({[day]:{steps:steps||0,activities:acts||[]}});
}

console.log('\n=== CL. Le message suit ce qu\'on vient de saisir ===');
t('coachActivite existe',()=>{if(typeof coachAct!=='function')throw new Error('non definie');});
t('*** apres une activite, le message parle de depense ***',()=>{
  jour(3900,180);                       // journee au-dessus de la cible
  depense(S.today,12400,[{kcal:300,n:'Muscu'}]);
  const a=coachAct(S.today);
  if(/au-dessus de la cible|écart/i.test(a.titre+a.corps))
    throw new Error('parle encore de l\'apport : '+a.titre+' / '+a.corps);
  if(!/Activité enregistrée/.test(a.titre))throw new Error(a.titre);
  if(!/kcal dépensés/.test(a.corps))throw new Error(a.corps);
});
t('le detail des pas et des activites est repris',()=>{
  jour(2000,100);
  depense(S.today,12400,[{kcal:300,n:'Muscu'}]);
  const a=coachAct(S.today);
  if(!/12\s?400 pas/.test(a.corps.replace(/\u202f|\u00a0/g,' ')))throw new Error(a.corps);
  if(!/1 activité/.test(a.corps))throw new Error(a.corps);
});
t('*** la balance du jour est annoncee ***',()=>{
  jour(2000,100);
  depense(S.today,12400,[{kcal:300,n:'Muscu'}]);
  const a=coachAct(S.today);
  if(!/Balance du jour/.test(a.corps))throw new Error(a.corps);
});
t('*** en seche, une balance negative est saluee ***',()=>{
  jour(1800,120);
  // journee complete : metabolisme de repos + pas + seance
  G('__setBurn')({[S.today]:{rest:1900,steps:12000,activities:[{kcal:400,n:'Muscu'}]}});
  const a=coachAct(S.today);
  eq(a.ton,'ok','deficit reel');
  if(!/bon sens/.test(a.corps))throw new Error(a.corps);
});
t('en seche, une balance positive reste neutre',()=>{
  jour(3900,180);
  G('__setBurn')({[S.today]:{rest:1900,steps:3000,activities:[]}});
  eq(coachAct(S.today).ton,'mixte');
});
t('balance positive : ton neutre, pas de reproche',()=>{
  jour(3900,180);
  depense(S.today,3000,[]);
  const a=coachAct(S.today);
  eq(a.ton,'mixte');
  if(/écart|dépassé|attention|trop/i.test(a.corps))throw new Error(a.corps);
});

console.log('\n=== CM. Saisie retroactive ===');
t('*** une activite saisie pour hier parle bien d\'hier ***',()=>{
  const hier=sb.shiftDate(S.today,-1);
  S.dayMeals[hier]=[{rid:'y',name:'H',mult:1,macros:{kcal:2000,prot:100,gluc:50,lip:20}}];
  depense(hier,9000,[]);
  const a=coachAct(hier);
  if(/aujourd/.test(a.corps))throw new Error('annonce aujourd\'hui : '+a.corps);
  const p=hier.split('-');
  if(!a.corps.includes(p[2]+'/'+p[1]))throw new Error(a.corps);
});
t('pour aujourd\'hui, le mot « aujourd\'hui » est utilise',()=>{
  jour(2000,100);depense(S.today,9000,[]);
  if(!/aujourd/.test(coachAct(S.today).corps))throw new Error(coachAct(S.today).corps);
});

console.log('\n=== CN. Cas limites ===');
t('aucune depense enregistree',()=>{
  G('__setBurn')({});
  const a=coachAct(S.today);
  if(!a.titre||!a.corps)throw new Error('reponse incomplete');
  if(/undefined|NaN/.test(a.titre+a.corps))throw new Error(a.corps);
});
t('depense sans aucun repas sur la journee',()=>{
  S.dayMeals={};depense(S.today,15000,[]);
  const a=coachAct(S.today);
  if(!/Aucun repas/.test(a.corps))throw new Error(a.corps);
  if(/Balance/.test(a.corps))throw new Error('balance annoncee sans repas');
});
t('pas seuls, sans activite',()=>{
  jour(2000,100);depense(S.today,8000,[]);
  const a=coachAct(S.today);
  if(/activité\)/.test(a.corps))throw new Error('mentionne une activite inexistante');
  if(!/pas/.test(a.corps))throw new Error(a.corps);
});
t('jamais de NaN ni undefined',()=>{
  [[0,0],[2600,175],[4000,200]].forEach(function(p){
    [[0,[]],[12000,[{kcal:300}]],[30000,[{kcal:900},{kcal:200}]]].forEach(function(b){
      jour(p[0],p[1]);depense(S.today,b[0],b[1]);
      const a=coachAct(S.today);
      if(/undefined|NaN/.test(a.titre+a.corps))throw new Error(JSON.stringify(p)+JSON.stringify(b)+' : '+a.corps);
    });
  });
});

console.log('\n=== CO. Cablage ===');
t('*** la saisie d\'activite passe la source « activite » ***',()=>{
  if(!/closeBurnLog\(\);render\(\);\s*showCoachToast\(day,'activite'\)/.test(src))
    throw new Error('cablage absent');
});
t('les repas gardent le message habituel',()=>{
  if(!/showCoachToast\(_jour\);/.test(src))throw new Error('appel repas modifie');
  if(/showCoachToast\(_jour,'activite'\)/.test(src))throw new Error('les repas utilisent le message activite');
});
t('showCoachToast choisit selon la source',()=>{
  if(!/source==='activite'\)\?coachActivite\(day\):coachAdvice\(day\)/.test(src))
    throw new Error('aiguillage absent');
});
t('la cuisson garde aussi le message repas',()=>{
  if(!/showCoachToast\(_cc&&_cc\.day\?_cc\.day:S\.today\)/.test(src))throw new Error('cuisson modifiee');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
