// Revoir le point du coach depuis le suivi ; duree d'affichage selon la longueur (15/10/2026, demande de Liam)
const {sb,reg}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const S=sb.S;
X('heureProfil=function(){return 15;}');
function jour(d,kcal,act){
  X("TARGETS={kcal:2300,prot:170,gluc:230,lip:70};S.profil={prenom:'T',objectif:'perte'};");
  S.inv={frigo:[],placards:[],congelateur:[],epices:[]};
  S.dayMeals={};if(kcal)S.dayMeals[d]=[{rid:'x',name:'Repas',mult:1,slot:'lunch',macros:{kcal:kcal,prot:60,gluc:100,lip:30}}];
  X('__setBurn')(act?{[d]:{steps:0,activities:[{name:'Muscu',min:60,kcal:act}]}}:{});
}
const toast=()=>{const el=reg['coach-toast'];return el?String(el.innerHTML).replace(/<[^>]+>/g,' ').replace(/\s+/g,' '):'';};

console.log('\n=== LXVIII. Revoir le point du coach ===');
t('*** le dernier point est retenu (jour et source) ***',()=>{
  jour(S.today,1500,400);
  X("showCoachToast(S.today,'activite')");eq(X('_dernierCoach.day'),S.today);eq(X('_dernierCoach.source'),'activite');
  X('showCoachToast(S.today)');eq(X('_dernierCoach.source'),undefined,'repas');
});
t('*** « Revoir » rejoue le message d\'activite si c\'etait le dernier ***',()=>{
  jour(S.today,1500,400);X("showCoachToast(S.today,'activite')");
  if(reg['coach-toast'])reg['coach-toast'].innerHTML='';
  X('revoirCoach(S.today)');
  if(!/Activité enregistrée/.test(toast()))throw new Error(toast().slice(0,120));
});
t('*** « Revoir » rejoue le point repas, recalcule avec les donnees du moment ***',()=>{
  jour(S.today,1500,0);X('showCoachToast(S.today)');const avant=toast();
  S.dayMeals[S.today].push({rid:'y',name:'Encas',mult:1,slot:'snack',macros:{kcal:200,prot:20,gluc:10,lip:5}});
  X('revoirCoach(S.today)');
  if(!toast()||/Activité enregistrée/.test(toast()))throw new Error('pas le point repas : '+toast().slice(0,120));
  if(avant===toast())throw new Error('non recalcule');
});
t('un autre jour que le dernier : point repas de ce jour-la',()=>{
  const hier=X('shiftDate(S.today,-1)');jour(hier,2100,0);X("_dernierCoach={day:S.today,source:'activite'}");
  X("revoirCoach('"+hier+"')");
  if(/Activité enregistrée/.test(toast()))throw new Error('rejoue l\'activite d\'un autre jour');
  eq(X('_dernierCoach.day'),hier);
});
t('*** bouton en bas du suivi, pour le jour affiche, des qu\'il y a un repas ou une activite ***',()=>{
  jour(S.today,1500,0);X("S.mainTab='recipes';S.displayDate=S.today;");
  let h=X('renderMacros()');const b=h.indexOf('data-action="revoir-coach"'),s=h.indexOf('id="sync-badge"'),c=h.indexOf('copy-day-target');
  if(b<0)throw new Error('bouton absent');if(!(c<b&&b<s))throw new Error('mal place');
  if(h.indexOf('>💬 Point du coach</button>')<0||h.indexOf('aria-label="Revoir le point du coach"')<0)throw new Error('libelle');
  /* 28/10/2026, demande de Liam : petit bouton a gauche, sur la ligne du sync */
  const pied=(h.match(/<div class="suivi-pied"[^]*?Modifiable de J−7 à J\+1<\/span><\/span><\/div>/)||[''])[0];
  if(pied.indexOf('revoir-coach')<0||pied.indexOf('id="sync-badge"')<pied.indexOf('revoir-coach'))throw new Error('pas sur la ligne du sync, a gauche');
  if(/width:100%|display:block/.test(pied.split('</button>')[0]))throw new Error('encore en pleine largeur');
  jour(S.today,0,300);if(X('renderMacros()').indexOf('revoir-coach')<0)throw new Error('activite seule');
  jour(S.today,0,0);if(X('renderMacros()').indexOf('revoir-coach')>=0)throw new Error('journee vide : rien a revoir');
});
t('*** le clic passe par le jour affiche ***',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!/action==='revoir-coach'\)\{revoirCoach\(S\.displayDate\|\|S\.today\);\}/.test(src))throw new Error('traitement du clic');
});
t('*** duree selon la longueur : 7 s au moins, 20 s au plus ***',()=>{
  eq(X("_dureeToast('Ok','Court.')"),7000);
  eq(X("_dureeToast('T','"+'x'.repeat(149)+"')"),12000,'150 caracteres');
  eq(X("_dureeToast('T','"+'x'.repeat(900)+"')"),20000);
  if(!/_coachTid=setTimeout\(hideCoachToast,_dureeToast\(a\.titre,a\.corps\)\);/.test(require('fs').readFileSync('index.html','utf8')))throw new Error('non branche');
});
console.log('---- '+pass+' ok, '+fail+' KO');
