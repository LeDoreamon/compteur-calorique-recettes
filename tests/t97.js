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
t('*** seche : la couleur ne depend que de la marge, sans activite (jour passe, cible 2300, palier 115 kcal) ***',()=>{
  const hier=X('shiftDate(S.today,-1)');
  const cas=[[1900,'large','var(--sky)',/Marge du jour 400 kcal.*Excellent : bien sous ta cible, ton déficit va au-delà du prévu\./],
             [2100,'ok','var(--green)',/Marge du jour 200 kcal.*Dans ta cible, avec de la marge\./],
             [2250,'juste','var(--lime)',/Marge du jour 50 kcal.*Tout juste dans ta cible\./],
             [2350,'serre','var(--orange)',/Marge du jour dépassée de 50 kcal.*Un peu au-dessus de ta marge : 50 kcal de trop, ça reste léger\./],
             [2500,'depasse','var(--red)',/Marge du jour dépassée de 200 kcal.*Au-delà de ta cible ce jour-là\./]];
  cas.forEach(([k,etat,col,re])=>{jour(k,0,'perte',hier);const g=M(hier);eq(g.etat,etat,k+' kcal');eq(g.couleur,col,k+' kcal');
    const h=vis(X('_htmlMarge')(hier));if(!re.test(h))throw new Error(k+' : '+h);});
  jour(1900,0,'perte',hier);if(!/400 kcal sous ta cible, sans activité enregistrée/.test(vis(X('_htmlMarge')(hier))))throw new Error('calcul sans activite');
});
t('*** les memes couleurs avec une activite : la marge compte l\'activite (exemple de Liam du 11/10 : 606 kcal de marge = bleu clair) ***',()=>{
  X("TARGETS={kcal:2310,prot:175,gluc:208,lip:80};");S.profil={prenom:'T',objectif:'perte'};
  S.dayMeals={};S.dayMeals[S.today]=[{rid:'x',name:'R',mult:1,macros:{kcal:2418,prot:145,gluc:261,lip:82}}];
  X('__setBurn')({[S.today]:{steps:0,activities:[{name:'Muscu',kcal:714}]}});
  const g=M();eq(g.marge,606);eq(g.etat,'large');eq(g.couleur,'var(--sky)');
  const h=vis(X('_htmlMarge')(S.today));
  if(!/714 d'activité − 108 au-dessus de ta cible/.test(h))throw new Error('calcul : '+h);
  if(!/Pour l'instant, cible dépassée de 108 kcal, mais ton activité couvre largement\./.test(h))throw new Error('aujourd\'hui : '+h);
  if(/sous ta cible\./.test(h))throw new Error('« sous ta cible » alors qu\'elle est depassee : '+h);
  const hier=X('shiftDate(S.today,-1)');S.dayMeals[hier]=S.dayMeals[S.today];X('__setBurn')({[hier]:{steps:0,activities:[{name:'Muscu',kcal:714}]}});
  if(!/Cible dépassée de 108 kcal, mais ton activité couvre largement : ton déficit va au-delà du prévu\./.test(vis(X('_htmlMarge')(hier))))throw new Error('jour passe : '+vis(X('_htmlMarge')(hier)));
  jour(2500,400);if(!/Pour l'instant, cible dépassée de 200 kcal, mais ton activité couvre, avec de la marge\./.test(vis(X('_htmlMarge')(S.today))))throw new Error('ok couvre');
  jour(2650,400);if(!/Pour l'instant, cible dépassée de 350 kcal : ton activité couvre tout juste\./.test(vis(X('_htmlMarge')(S.today))))throw new Error('juste couvre');
  jour(2000,400);if(!/Pour l'instant, belle marge, activité comprise\./.test(vis(X('_htmlMarge')(S.today))))throw new Error('large sous la cible avec activite');
  jour(2600,400);eq(M().marge,100);eq(M().etat,'juste','2300 + 400 − 2600 = 100 : sous un palier (115)');
});
t('bornes en kcal arrondies (cible 2300 : palier 115) : 345 bleu, 344 vert, 115 vert, 114 vert-jaune, 0 vert-jaune, −1 orange, −115 orange, −116 rouge',()=>{
  const hier=X('shiftDate(S.today,-1)');
  [[345,'large'],[344,'ok'],[115,'ok'],[114,'juste'],[0,'juste'],[-1,'serre'],[-115,'serre'],[-116,'depasse']].forEach(([m,e])=>{jour(2300-m,0,'perte',hier);eq(M(hier).etat,e,'marge '+m);});
  X("TARGETS={kcal:2310,prot:175,gluc:208,lip:80};");eq(X('_etatMarge("perte",348,2310,false)'),'large','Liam : 348');eq(X('_etatMarge("perte",347,2310,false)'),'ok','Liam : 347');
});
t('*** la marge du jour ne depend plus du TDEE (decision du 17/10/2026) ***',()=>{
  const vrai=X('estimateTDEE');
  try{
    const res=[];['{ok:true,tdee:2673}','{ok:true,tdee:3500}','{ok:false}'].forEach(s=>{X('estimateTDEE=function(){return '+s+';}');jour(2500,400);res.push(M().etat+' | '+vis(X('_htmlMarge')(S.today)));});
    if(res[0]!==res[1]||res[1]!==res[2])throw new Error('varie avec l\'estimation : '+res.join(' // '));
    if(/déficit ≈|prévus par ta cible|kcal de surplus/.test(res[0]))throw new Error('chiffre tire du TDEE : '+res[0]);
  }finally{sb.__e=vrai;X('estimateTDEE=__e');}
  const f=src.slice(src.indexOf('function _margeJour('),src.indexOf('function _htmlMarge('));
  if(/estimateTDEE|_deficitPrevu|_ecartPrevu/.test(f))throw new Error('estimation encore utilisee');
});
t('affichage : aujourd\'hui sous la cible sans activite = rien (journee en cours) ; depasse = affiche ; jour passe = affiche',()=>{
  jour(1500,0);eq(M(),null);jour(2400,0);eq(M().etat,'serre');
  const hier=X('shiftDate(S.today,-1)');jour(1500,0,'perte',hier);eq(M(hier).etat,'large');
});
t('*** seche : une journee terminee sous le plancher n\'est pas « excellente » (orange, comme « Journées très basses ») ***',()=>{
  const hier=X('shiftDate(S.today,-1)');
  jour(1100,0,'perte',hier);S.profil.sexe='f';let g=M(hier);eq(g.etat,'bas','1100 < 1200');eq(g.couleur,'var(--orange)');
  const h=vis(X('_htmlMarge')(hier));
  if(!/Très bas ce jour-là : 1100 kcal notées, sous 1200 kcal\. Si c'est un oubli de saisie, complète la journée/.test(h))throw new Error(h);
  jour(1300,0,'perte',hier);S.profil.sexe='h';eq(M(hier).etat,'bas','homme : 1300 < 1500');
  S.profil.sexe='f';eq(M(hier).etat,'large','femme : 1300 >= 1200');
  jour(1100,400);S.profil.sexe='f';eq(M().etat,'large','aujourd\'hui (en cours) : jamais « très bas »');
  jour(1100,0,'maintien',hier);S.profil.sexe='f';if(M(hier).etat==='bas')throw new Error('maintien : deja « bien trop peu »');
});
t('*** prise de masse : bleu clair dans la cible du jour (±10 %), trop / pas assez en kcal, sans estimation ***',()=>{
  const pose=(k,a,d)=>{d=d||S.today;X("TARGETS={kcal:3200,prot:175,gluc:400,lip:90};");S.profil={prenom:'T',objectif:'prise'};S.dayMeals={};S.dayMeals[d]=[{rid:'x',name:'R',mult:1,macros:{kcal:k,prot:150,gluc:300,lip:80}}];X('__setBurn')(a?{[d]:{steps:0,activities:[{name:'M',kcal:a}]}}:{});};
  pose(3650,400);let g=M();eq(g.etat,'atteinte');eq(g.couleur,'var(--sky)');
  let h=vis(X('_htmlMarge')(S.today));
  if(!/Marge du jour \+50 kcal/.test(h)||!/Cible atteinte, activité compensée \(\+50 kcal\)\./.test(h))throw new Error(h);
  pose(3000,400);eq(M().etat,'ok');if(!/Encore 600 kcal à manger pour ta prise de masse \(ton activité y est comptée\)\./.test(vis(X('_htmlMarge')(S.today))))throw new Error('en cours');
  pose(4100,400);eq(M().etat,'trop');if(!/Un peu trop : 500 kcal au-dessus de ta cible et de ton activité\./.test(vis(X('_htmlMarge')(S.today))))throw new Error('trop');
  pose(4400,400);eq(M().etat,'tropFort');if(!/l'excès part surtout en gras\./.test(vis(X('_htmlMarge')(S.today))))throw new Error('trop fort');
  const hier=X('shiftDate(S.today,-1)');
  pose(3000,400,hier);eq(M(hier).etat,'manque');h=vis(X('_htmlMarge')(hier));
  if(!/Marge du jour −600 kcal/.test(h)||!/Pas assez ce jour-là : 600 kcal sous ta cible et ton activité\./.test(h)||!/200 kcal sous ta cible \+ 400 d'activité à compenser/.test(h))throw new Error(h);
  pose(2800,400,hier);eq(M(hier).etat,'manqueFort');if(!/sans surplus, pas de prise de masse\./.test(vis(X('_htmlMarge')(hier))))throw new Error('manque fort');
  if(/surplus \(prévu|déficit \(prévu/.test(h))throw new Error('bilan estime encore affiche');
});
t('*** maintien : pile dedans en bleu clair, trop ou pas assez ***',()=>{
  const pose=(k,a,d)=>{d=d||S.today;X("TARGETS={kcal:2600,prot:150,gluc:300,lip:80};");S.profil={prenom:'T',objectif:'maintien'};S.dayMeals={};S.dayMeals[d]=[{rid:'x',name:'R',mult:1,macros:{kcal:k,prot:150,gluc:300,lip:80}}];X('__setBurn')(a?{[d]:{steps:0,activities:[{name:'M',kcal:a}]}}:{});};
  pose(3040,400);eq(M().etat,'atteinte');if(!/Pile dans ton maintien, activité compensée \(\+40 kcal\)\./.test(vis(X('_htmlMarge')(S.today))))throw new Error(vis(X('_htmlMarge')(S.today)));
  pose(3400,400);eq(M().etat,'trop');pose(3700,400);eq(M().etat,'tropFort');pose(2500,400);eq(M().etat,'ok');
  const hier=X('shiftDate(S.today,-1)');pose(2500,400,hier);eq(M(hier).etat,'manque');
  pose(2300,400,hier);eq(M(hier).etat,'manqueFort');if(!/si ça se répète, tu perdras du poids\./.test(vis(X('_htmlMarge')(hier))))throw new Error('manque fort');
});
t('le calendrier et la marge partagent la meme tolerance (TOL_CIBLE) ; palier de seche 5 %',()=>{
  eq(X('TOL_CIBLE'),0.1);eq(X('MARGE_PALIER'),0.05);
  if(!/m\.kcal>cible\*\(1\+TOL_CIBLE\)/.test(src)||!/m\.kcal<cible\*\(1-TOL_CIBLE\)/.test(src))throw new Error('_etatJour');
});
console.log('\n=== LXXII. Marge de la semaine (Bilan) ===');
const semaine=(fn)=>{   /* aujourd'hui = jeudi de la semaine courante, le temps du test */
  const aujV=S.today,L=X('_lundiDe(S.today)'),jeu=X("shiftDate('"+L+"',3)");
  S.today=jeu;const vrai=X('estimateTDEE');
  try{fn(L,jeu);}finally{S.today=aujV;sb.__e=vrai;X('estimateTDEE=__e');S.dayMeals={};X('__setBurn')({});}
};
const repasJ=(d,k)=>{S.dayMeals[d]=[{rid:'x',name:'R',mult:1,macros:{kcal:k,prot:120,gluc:200,lip:60}}];};
t('*** somme des marges des journees completes, lundi → dimanche ; un jour incomplet ne compte pas ***',()=>semaine((L,jeu)=>{
  X("TARGETS={kcal:2300,prot:170,gluc:230,lip:70};");S.profil={prenom:'T',objectif:'perte'};S.dayMeals={};X('__setBurn')({});
  repasJ(L,2000);repasJ(X("shiftDate('"+L+"',1)"),2500);repasJ(X("shiftDate('"+L+"',2)"),800);repasJ(jeu,1000);
  const r=X("_margeSemaine('"+L+"')");
  eq(r.n,2,'lundi et mardi seulement (mercredi a 800 : incomplet ; jeudi : en cours)');eq(r.somme,100);eq(r.moy,50);eq(r.etat,'juste');
  eq(r.jours.map(j=>j.etat).join(','),'ok,depasse,incomplet,encours,futur,futur,futur');
}));
t('*** carte du Bilan : cumul, moyenne, 7 barres, deficit reel estime selon les pesees ***',()=>semaine((L)=>{
  X("TARGETS={kcal:2300,prot:170,gluc:230,lip:70};");S.profil={prenom:'T',objectif:'perte'};S.dayMeals={};X('__setBurn')({});
  repasJ(L,2000);repasJ(X("shiftDate('"+L+"',1)"),2500);
  X("estimateTDEE=function(){return {ok:true,tdee:2673};}");
  let h=X('renderMargeSemaine()'),v=vis(h);
  if(!/Marge de la semaine Marge cumulée · 2 jours complets \+100 kcal/.test(v))throw new Error(v.slice(0,200));
  if(!/Semaine tout juste dans ta cible\. \(≈ 50 kcal de marge par jour\)/.test(v))throw new Error('phrase : '+v);
  eq((h.match(/margin-top:3px;">[LMJVSD]</g)||[]).length,7,'7 jours');
  if(h.indexOf('border:1px dashed')<0)throw new Error('jour en cours non distingue');
  if(!/Déficit réel estimé cette semaine \(selon tes pesées\) : ≈ 423 kcal\/jour ?, soit ≈ 0,38 kg par semaine/.test(v))throw new Error('deficit reel : '+v);
  X("estimateTDEE=function(){return {ok:false};}");if(/réel estimé/.test(X('renderMargeSemaine()')))throw new Error('ligne sans estimation');
  if(src.indexOf('renderBilanSemaine()+renderMargeSemaine()+renderCoachSummary()')<0)throw new Error('pas dans le Bilan');
}));
t('semaine tres basse en moyenne : orange, kcal notees par jour',()=>semaine((L)=>{
  X("TARGETS={kcal:2300,prot:170,gluc:230,lip:70};");S.profil={prenom:'T',objectif:'perte',sexe:'h'};S.dayMeals={};X('__setBurn')({});
  repasJ(L,1300);repasJ(X("shiftDate('"+L+"',1)"),1250);
  const r=X("_margeSemaine('"+L+"')");eq(r.etat,'bas');eq(r.couleur,'var(--orange)');eq(r.jours[0].etat,'bas');
  if(!/Semaine très basse : en moyenne sous 1500 kcal par jour\. \(≈ 1275 kcal notées par jour\)/.test(vis(X('renderMargeSemaine()'))))throw new Error(vis(X('renderMargeSemaine()')));
}));
t('aucune journee complete cette semaine (lundi matin) : pas de carte',()=>semaine((L)=>{S.dayMeals={};eq(X('renderMargeSemaine()'),'');}));
t('maintien et prise : « Ecart a ta cible », signe de l\'ecart (au-dessus = +)',()=>semaine((L)=>{
  X("TARGETS={kcal:2600,prot:150,gluc:300,lip:80};");S.profil={prenom:'T',objectif:'maintien'};S.dayMeals={};X('__setBurn')({});
  repasJ(L,2800);repasJ(X("shiftDate('"+L+"',1)"),2700);
  const v=vis(X('renderMargeSemaine()'));
  if(!/Écart à ta cible · 2 jours complets \+300 kcal/.test(v)||!/Semaine dans ta cible \(≈ \+150 kcal par jour, activité comprise\)\./.test(v))throw new Error(v);
}));
t('*** bilan du lundi : la marge de la semaine ecoulee ***',()=>{
  const aujV=S.today,L=X('_lundiDe(S.today)'),Lp=X("shiftDate('"+L+"',-7)");
  try{
    X("TARGETS={kcal:2300,prot:170,gluc:230,lip:70};");S.profil={prenom:'T',objectif:'perte'};S.dayMeals={};X('__setBurn')({});S.bilanVu=null;
    repasJ(Lp,2000);repasJ(X("shiftDate('"+Lp+"',1)"),2100);
    S.today=L;const v=vis(X('renderBilanSemaine()'));
    if(!/Marge de la semaine \+500 kcal/.test(v))throw new Error(v.slice(0,400));
  }finally{S.today=aujV;S.dayMeals={};}
});
t('*** bloc « Il te reste … ça rentre » de Repas : meme tolerance que l\'accueil, et dit « aujourd\'hui » sous un autre jour ***',()=>{
  const f=src.slice(src.indexOf('function renderBudgetSuggestions'),src.indexOf('function renderBudgetSuggestions')+2600);
  if(!/r\.kcal<=remK\*RENTRE_TOLERANCE/.test(f)||/remK\+60/.test(f))throw new Error('tolerance');
  X("TARGETS={kcal:2300,prot:170,gluc:230,lip:70};");S.profil={prenom:'T',objectif:'perte'};X('__setBurn')({});
  S.inv={frigo:[{id:'pz_a',name:'Poulet test',qty:5000,unit:'g',mac100:{kcal:100,prot:20,gluc:0,lip:2}}],placards:[],congelateur:[],epices:[]};
  const R=X('RCP');R.push({id:'rb_x',name:'rb_x',slots:['lunch'],time:10,kcal:500,prot:40,used:[{id:'pz_a',qty:500}]});
  const vv=X('recetteVisible');X("recetteVisible=function(x){return x.id==='rb_x';}");
  try{
    S.dayMeals={};S.dayMeals[S.today]=[{rid:'x',name:'R',mult:1,slot:'breakfast',macros:{kcal:1800,prot:50,gluc:100,lip:30}}];   /* reste 500 */
    X("S.displayDate=S.today;");let h=vis(X('renderBudgetSuggestions()'));
    if(!/^🎯 Il te reste 500 kcal/.test(h.trim()))throw new Error(h.slice(0,80));
    X("S.displayDate=shiftDate(S.today,-2);");h=vis(X('renderBudgetSuggestions()'));
    if(!/^🎯 Aujourd'hui, il te reste 500 kcal/.test(h.trim()))throw new Error(h.slice(0,80));
    S.dayMeals[S.today][0].macros.kcal=1830;   /* reste 470 : 500 > 470 × 1,05 = 493,5 */
    eq(X('renderBudgetSuggestions()'),'','500 kcal pour 470 restantes : ne rentre pas');
  }finally{sb.__vv=vv;X('recetteVisible=__vv');R.splice(R.findIndex(r=>r.id==='rb_x'),1);X("S.displayDate=S.today;");}
});
t('le bleu clair existe et se distingue du bleu, du vert et du vert-jaune',()=>{
  const m=src.match(/--sky: (#[0-9A-Fa-f]{6})/);if(!m)throw new Error('--sky absent');
  if(['#5FA8C9','#6FBF73','#B5CC5C'].indexOf(m[1].toUpperCase())>=0)throw new Error('meme couleur');
});
t('la couleur vert-jaune existe et se distingue du vert et de l\'orange',()=>{
  const m=src.match(/--lime: (#[0-9A-Fa-f]{6})/);if(!m)throw new Error('--lime absent');
  if(['#6FBF73','#E9A13B'].indexOf(m[1].toUpperCase())>=0)throw new Error('meme couleur');
});
t('*** la cible du jour ne bouge pas en seche (decision du 25/09/2026) ***',()=>{
  jour(1880,400);eq(X('_cibleDuJour(S.today)'),2300);
  const r=X('calorieRing(1880,TARGETS.kcal,400)');if(vis(r).indexOf(' 420 kcal restantes')<0)throw new Error('anneau : '+vis(r));
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
t('*** pas saisis mais sous la routine (cas de Liam du 26/10 : 9300 pour 9900) : la marge s\'affiche quand meme, avec la raison ***',()=>{
  jour(2012,0);X("S.pasBase=9900;");X('__setBurn')({[S.today]:{steps:9300,activities:[]}});
  eq(X('getBurn(S.today)').total,0,'0 kcal en plus');
  const g=M();if(!g)throw new Error('encadre absent');eq(g.marge,288);eq(g.etat,'ok');eq(g.pas,9300);
  const h=vis(X('_htmlMarge')(S.today));
  if(!/Marge du jour 288 kcal/.test(h))throw new Error(h);
  if(!/288 kcal sous ta cible ; tes 9.300 pas restent sous ta routine \(9.900\), déjà comptée dans ta cible/.test(h))throw new Error('calcul : '+h);
  if(/sans activité enregistrée/.test(h))throw new Error('« sans activite » alors que les pas sont saisis');
  if(!/Pour l'instant, tu es dans ta cible, avec de la marge\./.test(h))throw new Error('etat : '+h);
  const c=X('coachActivite(S.today)');
  if(!/9.300 pas, sous ta routine de 9.900 : rien à ajouter, ils sont déjà comptés dans ta cible\. Marge du jour : 288 kcal\./.test(c.corps))throw new Error('message : '+c.corps);
  X("S.mainTab='recipes';S.displayDate=S.today;");
  if(/marge/.test(X('_htmlBarreReste()')))throw new Error('barre : la marge y vaut le reste, pas de doublon');
  X("S.pasBase=undefined;");
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
  if(!/marge <strong style="color:var\(--green\);">150<\/strong>/.test(b))throw new Error(b);
  jour(2800,400);if(!/marge <strong style="color:var\(--orange\);">−100<\/strong>/.test(X('_htmlBarreReste()')))throw new Error('serre');
  jour(3300,400);if(!/marge <strong style="color:var\(--red\);">−600<\/strong>/.test(X('_htmlBarreReste()')))throw new Error('depasse');
});
t('*** message apres une activite : la marge, sans reproche ***',()=>{
  jour(1880,400);let c=X('coachActivite(S.today)');
  if(c.corps.indexOf('Marge du jour : 820 kcal, soit 420 restantes + 400 d\'activité. Pour l\'instant, belle marge')<0)throw new Error(c.corps);
  jour(2800,400);c=X('coachActivite(S.today)');
  if(!/Ton activité ramène ton dépassement à 100 kcal\.$/.test(c.corps))throw new Error(c.corps);
  jour(3300,400);c=X('coachActivite(S.today)');
  if(!/Ton activité ramène ton dépassement à 600 kcal\.$/.test(c.corps))throw new Error(c.corps);
  eq(c.ton,'ok');if(/attention|trop/i.test(c.corps))throw new Error('reproche');
});
t('jamais de NaN ni undefined',()=>{
  [[0,1],[1880,400],[2400,400],[2800,400],[3250,400],[5000,50]].forEach(function(p){['perte','maintien','prise'].forEach(function(o){
    jour(p[0],p[1],o);const h=X('_htmlMarge')(S.today)+X('coachActivite(S.today)').corps+X('renderAccueil()');
    if(/NaN|undefined/.test(h))throw new Error(o+' '+p);});});
});
X('heureProfil')!==vraiH&&(sb.__h=vraiH,X('heureProfil=__h'));
S.profil=null;
console.log('---- '+pass+' ok, '+fail+' KO');
