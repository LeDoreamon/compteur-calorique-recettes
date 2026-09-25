const {sb}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const repas=(k,p)=>JSON.stringify([{rid:'x',name:'R',macros:{kcal:k,prot:p,gluc:0,lip:0}}]);
const vraiH=sb.heureProfil;
function prepa(heure){X("_loaded=true;S.dayMeals={};S.profil={objectif:'perte'};TARGETS={kcal:2000,prot:150,gluc:200,lip:60};__setBurn({});");sb.heureProfil=()=>heure;}
const cj=()=>X('coachJour(S.today)');

console.log('\n=== XIIIA. Ta journee : le message suit le moment ===');
t('*** matin, rien mange : un cap sur les proteines ***',()=>{
  prepa(8);const c=cj();eq(c.titre,'Nouvelle journée');if(c.corps.indexOf('150 g de protéines')<0||c.corps.indexOf('petit-déj')<0)throw new Error(c.corps);
});
t('apres-midi, rien note : invitation a saisir',()=>{
  prepa(16);if(cj().corps.indexOf('Note ce que tu as déjà mangé')<0)throw new Error(cj().corps);
});
t('*** point d\'etape : pourcentages, proteines en retard ***',()=>{
  prepa(16);X("S.dayMeals[S.today]="+repas(1200,40)+";");
  const c=cj();eq(c.titre,'Point d\'étape');
  if(c.corps.indexOf('27 % de tes protéines et 60 % de tes calories')<0)throw new Error(c.corps);
  if(c.corps.indexOf('en retard')<0)throw new Error('retard non signale');
});
t('point d\'etape equilibre',()=>{prepa(11);X("S.dayMeals[S.today]="+repas(800,60)+";");if(cj().corps.indexOf('Rythme équilibré')<0)throw new Error(cj().corps);});
t('*** soir dans la cible : bravo et serie ***',()=>{
  prepa(21);X("S.dayMeals[S.today]="+repas(1980,150)+";");
  X("S.dayMeals[shiftDate(S.today,-1)]="+repas(2000,150)+";S.dayMeals[shiftDate(S.today,-2)]="+repas(2050,150)+";");
  const c=cj();eq(c.titre,'Journée réussie');if(c.corps.indexOf('3 jours d\'affilée')<0)throw new Error(c.corps);eq(c.ton,'ok');
});
t('*** soir au-dessus : pas de reproche ***',()=>{
  prepa(22);X("S.dayMeals[S.today]="+repas(2400,150)+";");
  const c=cj();eq(c.titre,'Un peu au-dessus aujourd\'hui');
  if(c.corps.indexOf('+400 kcal')<0||/trop|attention|dépassé/i.test(c.corps))throw new Error(c.corps);
});
t('soir incomplet : invite a completer',()=>{prepa(21);X("S.dayMeals[S.today]="+repas(500,30)+";");eq(cj().titre,'Journée pas encore complète');});

console.log('\n=== XIIIB. La carte sur l\'accueil ===');
t('*** la carte remplace « Prochain repas » et porte les chiffres ***',()=>{
  prepa(16);X("S.dayMeals[S.today]="+repas(1200,40)+";");
  const h=X('renderAccueil()');
  if(h.indexOf('Ta journée')<0)throw new Error('carte absente');
  if(h.indexOf('>Prochain repas</div>')>=0)throw new Error('ancienne carte encore la');
  if(h.indexOf('800<span')<0||h.indexOf('110<span')<0)throw new Error('reste kcal/prot');
  if(!/data-action="open-burn"/.test(h))throw new Error('bouton activite');
});
t('activite : detail et ce qu\'elle devient (seche)',()=>{
  prepa(16);X("S.dayMeals[S.today]="+repas(1200,40)+";__setBurn({[S.today]:{steps:0,activities:[{name:'Muscu',min:60,kcal:300}]}});");
  const h=X('renderAccueil()');if(h.indexOf('Muscu')<0||h.indexOf('creusent ton déficit')<0)throw new Error('activite');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
sb.heureProfil=vraiH;console.log('---- '+pass+' ok, '+fail+' KO');})();
