const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');

console.log('\n=== FT. Seuil de pas habituels ===');
t('*** la routine par defaut de Liam est posee ***',()=>{
  delete S.pasBase;
  eq(G('pasBase')(),9679);
});
t('*** seuls les pas au-dessus comptent ***',()=>{
  delete S.pasBase;
  eq(G('burnStepKcal')(12400),Math.round((12400-9679)*0.04),'2721 pas x 0,04');
  eq(G('burnStepKcal')(12400),109);
});
t('*** une journee sous la routine ne rapporte rien ***',()=>{
  delete S.pasBase;
  eq(G('burnStepKcal')(5000),0);
  eq(G('burnStepKcal')(9679),0,'pile a la routine');
});
t('juste au-dessus : quelques calories',()=>{
  delete S.pasBase;
  eq(G('burnStepKcal')(9779),4,'100 pas de plus');
});
t('un seuil a zero compte tous les pas',()=>{
  S.pasBase=0;
  eq(G('burnStepKcal')(10000),400,'comportement d\'origine');
});
t('le seuil est modifiable',()=>{
  S.pasBase=6000;
  eq(G('burnStepKcal')(10000),160,'4000 pas x 0,04');
});
t('*** une valeur negative compte tous les pas ***',()=>{
  S.pasBase=-500;
  eq(G('burnStepKcal')(10000),400,'un seuil negatif n\'a pas de sens : on ne retranche rien');
  delete S.pasBase;
});
t('*** une valeur non numerique retombe sur le defaut ***',()=>{
  S.pasBase='texte';
  eq(G('pasBase')(),9679,'mieux vaut le defaut qu\'un seuil nul');
  delete S.pasBase;
});
t('zero pas ne plante pas',()=>{
  delete S.pasBase;
  eq(G('burnStepKcal')(0),0);
  eq(G('burnStepKcal')(null),0);
});

console.log('\n=== FU. Repercussion sur le total ===');
t('*** le total de la journee suit le seuil ***',()=>{
  delete S.pasBase;
  G('__setBurn')({[S.today]:{steps:12400,activities:[{kcal:300,n:'Muscu'}]}});
  const b=sb.getBurn(S.today);
  eq(b.stepKcal,109);
  eq(b.total,409,'109 + 300');
});
t('une journee calme ne compte que les seances',()=>{
  G('__setBurn')({[S.today]:{steps:6000,activities:[{kcal:300,n:'Muscu'}]}});
  eq(sb.getBurn(S.today).total,300);
});
t('*** une journee a 5000 pas n\'est plus ignoree ***',()=>{
  G('__setBurn')({[S.today]:{steps:5000,activities:[]}});
  const b=sb.getBurn(S.today);
  if(!b)throw new Error('journee effacee alors qu\'on a marche');
  eq(b.brut,200,'compte dans le bilan');
  eq(b.total,0,'mais ne donne aucune marge');
});
t('journee vraiment vide : rien a afficher',()=>{
  G('__setBurn')({[S.today]:{steps:0,activities:[]}});
  eq(sb.getBurn(S.today),null);
});

console.log('\n=== FV. Explication a l\'ecran ===');
t('*** l\'accueil precise ce qui est compte ***',()=>{
  delete S.pasBase;
  S.inv={frigo:[],placards:[],congelateur:[],epices:[]};
  S.dayMeals[S.today]=[{rid:'x',name:'R',mult:1,macros:{kcal:2000,prot:60,gluc:100,lip:30}}];
  G('__setBurn')({[S.today]:{steps:12400,activities:[]}});
  const h=G('renderAccueil')();
  if(!/au-dessus de ta routine/.test(h))throw new Error('explication absente');
  if(!/12\s?400 pas/.test(h.replace(/\u202f|\u00a0/g,' ')))throw new Error('total des pas absent');
});
t('une journee sous la routine le dit',()=>{
  G('__setBurn')({[S.today]:{steps:5000,activities:[{kcal:200,n:'Muscu'}]}});
  const h=G('renderAccueil')();
  if(!/déjà comptée dans ta cible/.test(h))throw new Error('mention absente');
});
t('aucune mention si le seuil est a zero',()=>{
  S.pasBase=0;
  G('__setBurn')({[S.today]:{steps:12400,activities:[]}});
  const h=G('renderAccueil')();
  if(/au-dessus de ta routine/.test(h))throw new Error('mention affichee a tort');
  delete S.pasBase;
});

console.log('\n=== FW. Reglage ===');
t('*** le seuil se regle a la saisie d\'activite ***',()=>{
  if(!/id="burn-base"/.test(src))throw new Error('champ absent');
  if(!/Pas d'une journée ordinaire/.test(src))throw new Error('libelle absent');
});
t('*** modifier le champ change le seuil ***',()=>{
  G('openBurnLog')(S.today);
  docEl('burn-base').value=7500;
  G('majPasBase')();
  eq(S.pasBase,7500);
  eq(G('burnStepKcal')(10000),100,'2500 pas x 0,04');
});
t('le champ affiche le seuil courant a l\'ouverture',()=>{
  S.pasBase=8200;
  G('openBurnLog')(S.today);
  eq(docEl('burn-base').value,8200);
});
t('vider le champ compte tous les pas',()=>{
  G('openBurnLog')(S.today);
  docEl('burn-base').value='';
  G('majPasBase')();
  eq(S.pasBase,0);
  eq(G('burnStepKcal')(10000),400);
});
t('*** le reglage est persiste ***',()=>{
  if(!/pasBase:\(typeof S\.pasBase==='number'\)/.test(src))throw new Error('absent du payload');
  sb._applyState({inv:{frigo:[]},dayMeals:{},pasBase:9679});
  eq(S.pasBase,9679);
});
t('une valeur invalide n\'ecrase pas le seuil',()=>{
  S.pasBase=9679;
  sb._applyState({inv:{frigo:[]},dayMeals:{},pasBase:'nimporte quoi'});
  eq(S.pasBase,9679);
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');

console.log('\n=== FX. Depense reelle dans le bilan ===');
t('*** le total brut compte tous les pas ***',()=>{
  delete S.pasBase;
  G('__setBurn')({[S.today]:{steps:12400,activities:[{kcal:300,n:'Muscu'}]}});
  const b=sb.getBurn(S.today);
  eq(b.brut,796,'496 + 300');
  eq(b.total,409,'109 + 300 pour la marge');
});
t('*** une journee sous la routine n\'est plus vide ***',()=>{
  G('__setBurn')({[S.today]:{steps:8000,activities:[]}});
  const b=sb.getBurn(S.today);
  if(!b)throw new Error('journee effacee alors qu\'on a marche');
  eq(b.brut,320,'8000 pas comptent dans le bilan');
  eq(b.total,0,'mais rien pour la marge');
});
t('le detail des pas donne les deux chiffres',()=>{
  G('__setBurn')({[S.today]:{steps:12400,activities:[]}});
  const b=sb.getBurn(S.today);
  eq(b.stepKcalBrut,496);
  eq(b.stepKcal,109);
});
t('aucune donnee du tout : toujours rien',()=>{
  G('__setBurn')({[S.today]:{steps:0,activities:[]}});
  eq(sb.getBurn(S.today),null);
});
t('*** le bilan affiche le brut, pas le net ***',()=>{
  if(!/\(on\?\(bb\.brut\|\|bb\.total\):'\\u2014'\)/.test(src))
    throw new Error('les pastilles affichent encore le net');
});
t('la moyenne porte sur la depense reelle',()=>{
  if(!/tot\+=\(b\.brut\|\|b\.total\)/.test(src))throw new Error('moyenne sur le net');
});
t('le detail precise la part au-dessus de la routine',()=>{
  if(!/au-dessus de ta routine/.test(src))throw new Error('precision absente');
});

console.log('\n=== FY. Marge sur tous les jours ===');
t('*** la synthese ne depend plus du jour courant ***',()=>{
  if(/const rem=isToday&&meals\.length>0/.test(src))
    throw new Error('encore limitee a aujourd\'hui');
  if(!/const rem=meals\.length>0/.test(src))throw new Error('condition inattendue');
});
t('*** la marge lit le jour affiche ***',()=>{
  if(/const b=getBurn\(S\.today\);if\(!b\|\|!b\.total\)/.test(src))
    throw new Error('lit toujours aujourd\'hui');
  if(!/const b=getBurn\(dd\);if\(!b\|\|!b\.total\)/.test(src))throw new Error('jour affiche non utilise');
});
t('le vocabulaire s\'adapte au jour passe',()=>{
  if(!/\$\{isToday\?'Reste':'Écart'\}/.test(src))throw new Error('libelle fige');
  if(!/isToday\?"Avec l'activité":"Marge"/.test(src))throw new Error('libelle de marge fige');
});
t('un jour passe montre l\'ecart a la cible',()=>{
  const i=src.indexOf("${isToday?'Reste':'Écart'}");
  const b=src.slice(i,i+340);
  if(!/m\.kcal-TARGETS\.kcal/.test(b))throw new Error('ecart non calcule');
});
console.log('\n---- total '+pass+' ok, '+fail+' KO ----');
