// Marge du jour : reste + activite enregistree, en couleur, partout (12/10/2026, demande de Liam)
const {sb}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
const S=sb.S;
const vraiH=X('heureProfil');X('heureProfil=function(){return 12;}');
/* cible 2300 ; une activite de 400 kcal (sans pas : total exact) */
function jour(kcal,act,obj,d){
  d=d||S.today;
  X("TARGETS={kcal:2300,prot:170,gluc:230,lip:70};S.profil={prenom:'T',objectif:'"+(obj||'perte')+"'};");
  S.inv={frigo:[],placards:[],congelateur:[],epices:[]};
  S.dayMeals={};S.dayMeals[d]=kcal?[{rid:'x',name:'Repas',mult:1,slot:'lunch',macros:{kcal:kcal,prot:60,gluc:100,lip:30}}]:[];
  X('__setBurn')(act?{[d]:{steps:0,activities:[{name:'Muscu',min:60,kcal:act}]}}:{});
}
const M=d=>X('_margeJour')(d||S.today);
const vis=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');

console.log('\n=== LXVII. Marge du jour : reste + activite ===');
t('*** seche, sous la cible : marge = reste + activite, en vert ***',()=>{
  jour(1880,400);const g=M();
  eq(g.reste,420);eq(g.act,400);eq(g.marge,820);eq(g.etat,'ok');eq(g.couleur,'var(--green)');
  const h=vis(X('_htmlMarge')(S.today));
  if(!/Marge du jour 820 kcal/.test(h))throw new Error(h);
  if(!/420 restantes \+ 400 d'activité/.test(h))throw new Error('calcul : '+h);
  if(!/Tout bon : sous ta cible, ton activité creuse ton déficit/.test(h))throw new Error('etat : '+h);
});
t('*** seche, cible depassee mais largement couverte : vert-jaune, « ton deficit tient » (exemple de Liam, 11/10) ***',()=>{
  X("TARGETS={kcal:2310,prot:175,gluc:208,lip:80};");S.profil={prenom:'T',objectif:'perte'};
  S.dayMeals={};S.dayMeals[S.today]=[{rid:'x',name:'R',mult:1,macros:{kcal:2418,prot:145,gluc:261,lip:82}}];
  X('__setBurn')({[S.today]:{steps:0,activities:[{name:'Muscu',kcal:714}]}});
  const g=M();eq(g.reste,-108);eq(g.marge,606);eq(g.etat,'couvert');eq(g.couleur,'var(--lime)');
  const h=vis(X('_htmlMarge')(S.today));
  if(!/Marge du jour 606 kcal/.test(h))throw new Error(h);
  if(!/714 d'activité − 108 au-dessus de ta cible/.test(h))throw new Error('calcul : '+h);
  if(!/Cible dépassée, mais ton activité couvre largement : ton déficit tient\./.test(h))throw new Error('etat : '+h);
  if(/serré/.test(h))throw new Error('dit serre');
});
t('*** seche, couverte de justesse (moins de la moitie de l\'activite restante) : orange, « deficit serre » ***',()=>{
  jour(2550,400);const g=M();
  eq(g.reste,-250);eq(g.marge,150);eq(g.etat,'serre');eq(g.couleur,'var(--orange)');
  const h=vis(X('_htmlMarge')(S.today));
  if(!/Marge du jour 150 kcal/.test(h))throw new Error(h);
  if(!/400 d'activité − 250 au-dessus de ta cible/.test(h))throw new Error('calcul : '+h);
  if(!/Déficit serré : ton activité couvre encore le dépassement, de justesse\./.test(h))throw new Error('etat : '+h);
});
t('la couleur vert-jaune existe et se distingue du vert et de l\'orange',()=>{
  const m=src.match(/--lime: (#[0-9A-Fa-f]{6})/);if(!m)throw new Error('--lime absent');
  if(['#6FBF73','#E9A13B'].indexOf(m[1].toUpperCase())>=0)throw new Error('meme couleur');
});
t('*** seche, au-dela de la cible et de l\'activite : rouge, et de combien ***',()=>{
  jour(2800,400);const g=M();
  eq(g.marge,-100);eq(g.etat,'depasse');eq(g.couleur,'var(--red)');
  const h=vis(X('_htmlMarge')(S.today));
  if(!/Marge du jour dépassée de 100 kcal/.test(h))throw new Error(h);
  if(!/400 d'activité − 500 au-dessus de ta cible/.test(h))throw new Error('calcul : '+h);
  if(!/Au-delà de ta cible et de ton activité\./.test(h)||/Dépassé :/.test(h))throw new Error('etat : '+h);
});
t('bornes : pile la cible = vert ; moitie de l\'activite restante = vert-jaune ; pile cible + activite = orange a 0 kcal',()=>{
  jour(2300,400);eq(M().etat,'ok');eq(M().marge,400);
  jour(2301,400);eq(M().etat,'couvert');
  jour(2500,400);eq(M().etat,'couvert');eq(M().marge,200);
  jour(2501,400);eq(M().etat,'serre');
  jour(2700,400);eq(M().etat,'serre');eq(M().marge,0);
  jour(2701,400);eq(M().etat,'depasse');
});
t('*** la cible du jour ne bouge pas en seche (decision du 25/09/2026) ***',()=>{
  jour(1880,400);eq(X('_cibleDuJour(S.today)'),2300);
  const r=X('calorieRing(1880,TARGETS.kcal,400)');if(vis(r).indexOf(' 420 kcal restantes')<0)throw new Error('anneau : '+vis(r));
});
t('*** maintien et prise : activite a compenser, vert puis rouge (jamais orange ni vert-jaune) ***',()=>{
  jour(2500,400,'maintien');eq(M().etat,'ok');eq(M().marge,200);jour(2650,400,'maintien');eq(M().etat,'ok');jour(2500,400,'maintien');
  if(!/Activité à compenser pour tenir ton maintien/.test(vis(X('_htmlMarge')(S.today))))throw new Error('maintien');
  eq(X('_cibleDuJour(S.today)')-2500,200,'meme valeur que la cible du jour');
  jour(1880,400,'prise');if(!/ta prise de masse en a besoin/.test(vis(X('_htmlMarge')(S.today))))throw new Error('prise');
  jour(2800,400,'prise');eq(M().etat,'depasse');
});
t('*** rien sans activite enregistree (ni encadre, ni marge dans la barre) ***',()=>{
  jour(1880,0);eq(M(),null);eq(X('_htmlMarge')(S.today),'');
  X("S.mainTab='recipes';S.displayDate=S.today;");
  if(/marge/.test(X('_htmlBarreReste()')))throw new Error('barre');
});
t('les pas seuls comptent comme activite (au-dessus de la routine)',()=>{
  jour(1880,0);X('__setBurn')({[S.today]:{steps:20000,activities:[]}});
  const g=M(),b=X('getBurn(S.today)');
  if(!g||!(b.total>0))throw new Error('pas ignores');eq(g.marge,420+b.total);
});
t('*** Repas : l\'encadre est en bas du bloc, sous « Copier vers », pour le jour affiche (demande du 12/10/2026) ***',()=>{
  const hier=X('shiftDate(S.today,-1)');jour(2500,400,'perte',hier);
  X("S.mainTab='recipes';S.displayDate='"+hier+"';");
  const h=X('renderMacros()');const a=h.indexOf('ring-arc'),c=h.indexOf('copy-day-target'),m=h.indexOf('marge-jour'),s=h.indexOf('id="sync-badge"');
  if(m<0)throw new Error('encadre absent pour le jour affiche');
  if(!(a<c&&c<m&&m<s))throw new Error('mal place');
  if(vis(h).indexOf('Marge du jour 200 kcal')<0)throw new Error(vis(h));   /* 2500 mangees, 400 d'activite */
  X("S.displayDate=S.today;");
});
t('*** Repas : l\'ancienne ligne en bas du tracker a disparu (pas de doublon) ***',()=>{
  jour(1880,400);X("S.displayDate=S.today;");
  const h=vis(X('renderMacros()'));
  eq((h.match(/Marge du jour/g)||[]).length,1);
  if(/en plus de ton déficit|Avec l'activité/.test(h))throw new Error('ancienne ligne');
});
t('*** accueil : tuile « Reste » = cible seule, encadre juste dessous, puis le detail ***',()=>{
  jour(1880,400,'maintien');
  const h=X('renderAccueil()');const v=vis(h);
  if(!/420 kcal Reste/.test(v))throw new Error('tuile reste : '+v.slice(v.indexOf('Ta journée'),v.indexOf('Ta journée')+300));
  const m=h.indexOf('marge-jour'),d=h.indexOf('Activité du jour');
  if(m<0||d<0||m>d)throw new Error('ordre');
  if(v.indexOf('Marge du jour 820 kcal')<0)throw new Error('valeur');
});
t('*** « Ça rentre dans ce qu\'il te reste » reste sur la cible de base, jamais sur la marge (sèche) ***',()=>{
  jour(1880,400);const s=X('suggestionsAccueil(S.today,3)');
  if(s.reste)eq(s.reste.kcal,420,'reste sans l\'activite');
  eq(X('resteDuJour(S.today)').kcal,420);
});
t('*** « Ça rentre » : plus aucune recette au-dessus du reste (5 % de tolerance), quitte a en montrer moins ***',()=>{
  X("TARGETS={kcal:2300,prot:170,gluc:230,lip:70};");S.profil={prenom:'T',objectif:'perte'};X('__setBurn')({});
  S.inv={frigo:[{id:'pz_a',name:'Poulet test',qty:5000,unit:'g',mac100:{kcal:100,prot:20,gluc:0,lip:2}}],placards:[],congelateur:[],epices:[]};
  const R=X('RCP');const mk=(id,g)=>({id:id,name:id,slots:['breakfast','lunch','dinner','snack'],time:10,used:[{id:'pz_a',qty:g}]});
  const ids=['rt_440','rt_470','rt_475','rt_560'];[440,470,475,560].forEach((k,i)=>R.push(mk(ids[i],k*1)));
  const vraiVis=X('recetteVisible');X("recetteVisible=function(x){return /^rt_/.test(x.id);}");
  try{
    S.dayMeals={};S.dayMeals[S.today]=[{rid:'x',name:'R',mult:1,slot:'breakfast',macros:{kcal:1850,prot:80,gluc:100,lip:30}}];   /* reste 450 ; 5 % -> 472,5 */
    const s=X('suggestionsAccueil(S.today,3)');eq(s.reste.kcal,450);
    eq(s.recettes.map(x=>x.m.kcal).sort().join(','),'440,470','au plus 472 kcal');
    S.dayMeals[S.today][0].macros.kcal=2280;   /* reste 20 : rien ne rentre */
    eq(X('suggestionsAccueil(S.today,3)').recettes.length,0,'reste 20');
    if(X('renderAccueil()').indexOf('Ça rentre dans ce qu')>=0)throw new Error('titre affiche sans recette');
    S.dayMeals[S.today][0].macros.kcal=1850;X('__setBurn')({[S.today]:{steps:0,activities:[{name:'M',kcal:400}]}});
    eq(X('suggestionsAccueil(S.today,3)').recettes.map(x=>x.m.kcal).sort().join(','),'440,470','seche : l\'activite n\'elargit pas la liste');
  }finally{X('__vv=null');sb.__vv=vraiVis;X('recetteVisible=__vv');for(let i=R.length-1;i>=0;i--)if(/^rt_/.test(R[i].id))R.splice(i,1);X('__setBurn')({});}
});
t('*** barre « Reste » collante : la marge, en couleur ***',()=>{
  jour(2550,400);X("S.mainTab='recipes';S.displayDate=S.today;");
  const b=X('_htmlBarreReste()');
  if(!/marge <strong style="color:var\(--orange\);">150<\/strong>/.test(b))throw new Error(b);
  jour(2400,400);if(!/marge <strong style="color:var\(--lime\);">300<\/strong>/.test(X('_htmlBarreReste()')))throw new Error('couvert');
  jour(2800,400);if(!/marge <strong style="color:var\(--red\);">−100<\/strong>/.test(X('_htmlBarreReste()')))throw new Error('depasse');
});
t('*** message apres une activite : la marge, sans reproche ***',()=>{
  jour(1880,400);let c=X('coachActivite(S.today)');
  if(c.corps.indexOf('Marge du jour : 820 kcal, soit 420 restantes + 400 d\'activité. Tout bon')<0)throw new Error(c.corps);
  jour(2800,400);c=X('coachActivite(S.today)');
  if(!/Ton activité ramène ton dépassement à 100 kcal\.$/.test(c.corps))throw new Error(c.corps);
  eq(c.ton,'ok');if(/attention|trop/i.test(c.corps))throw new Error('reproche');
});
t('jamais de NaN ni undefined',()=>{
  [[0,1],[1880,400],[2400,400],[2550,400],[5000,50]].forEach(function(p){['perte','maintien','prise'].forEach(function(o){
    jour(p[0],p[1],o);const h=X('_htmlMarge')(S.today)+X('coachActivite(S.today)').corps+X('renderAccueil()');
    if(/NaN|undefined/.test(h))throw new Error(o+' '+p);});});
});
X('heureProfil')!==vraiH&&(sb.__h=vraiH,X('heureProfil=__h'));
S.profil=null;
console.log('---- '+pass+' ok, '+fail+' KO');
