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
t('*** seche, sous la cible avec une activite : marge = reste + activite, en bleu clair (le mieux) ***',()=>{
  jour(1880,400);const g=M();
  eq(g.reste,420);eq(g.act,400);eq(g.marge,820);eq(g.etat,'atteinte');eq(g.couleur,'var(--sky)');
  const h=vis(X('_htmlMarge')(S.today));
  if(!/Marge du jour 820 kcal/.test(h))throw new Error(h);
  if(!/420 restantes \+ 400 d'activité/.test(h))throw new Error('calcul : '+h);
  if(!/Cible tenue et déficit au-delà du prévu : ≈ \d+ kcal au lieu de \d+, grâce à ton activité\./.test(h))throw new Error('etat : '+h);
});
t('*** seche, cible depassee mais couverte par l\'activite : vert-jaune, « ton deficit tient » (exemple de Liam, 11/10) ***',()=>{
  X("TARGETS={kcal:2310,prot:175,gluc:208,lip:80};");S.profil={prenom:'T',objectif:'perte'};
  S.dayMeals={};S.dayMeals[S.today]=[{rid:'x',name:'R',mult:1,macros:{kcal:2418,prot:145,gluc:261,lip:82}}];
  X('__setBurn')({[S.today]:{steps:0,activities:[{name:'Muscu',kcal:714}]}});
  const g=M();eq(g.reste,-108);eq(g.marge,606);eq(g.etat,'couvert');eq(g.couleur,'var(--lime)');
  const h=vis(X('_htmlMarge')(S.today));
  if(!/Marge du jour 606 kcal/.test(h))throw new Error(h);
  if(!/714 d'activité − 108 au-dessus de ta cible/.test(h))throw new Error('calcul : '+h);
  if(!/Cible dépassée, mais ton activité couvre le dépassement : ton déficit tient \(≈ \d+ kcal\)\./.test(h))throw new Error('etat : '+h);
  if(/serré/.test(h))throw new Error('dit serre');
});
t('*** seche, toute l\'activite mangee mais encore un deficit : orange, « deficit serre », deficit restant affiche (choix de Liam) ***',()=>{
  jour(2800,400);const g=M();
  eq(g.reste,-500);eq(g.marge,-100);eq(g.deficit,450);eq(g.etat,'serre');eq(g.couleur,'var(--orange)');
  const h=vis(X('_htmlMarge')(S.today));
  if(!/Marge du jour dépassée de 100 kcal/.test(h))throw new Error(h);
  if(!/400 d'activité − 500 au-dessus de ta cible/.test(h))throw new Error('calcul : '+h);
  if(!/Déficit serré : il en reste ≈ 450 kcal sur les 550 prévus par ta cible\./.test(h))throw new Error('etat : '+h);
});
t('*** seche, cible tenue (atteinte ou en dessous) + activite : bleu clair, deficit au-dela du prevu (demande de Liam, 13/10) ***',()=>{
  const vrai=X('estimateTDEE');
  try{
    X("estimateTDEE=function(){return {ok:true,tdee:2673};}");
    X("TARGETS={kcal:2310,prot:175,gluc:208,lip:80};");S.profil={prenom:'T',objectif:'perte'};
    const pose=(k,a)=>{S.dayMeals={};S.dayMeals[S.today]=[{rid:'x',name:'R',mult:1,macros:{kcal:k,prot:150,gluc:200,lip:60}}];X('__setBurn')({[S.today]:{steps:0,activities:[{name:'M',kcal:a}]}});};
    pose(2250,400);let g=M();eq(g.etat,'atteinte');eq(g.couleur,'var(--sky)');eq(g.deficit,823);
    const h=vis(X('_htmlMarge')(S.today));
    if(!/Cible tenue et déficit au-delà du prévu : ≈ 823 kcal au lieu de 363, grâce à ton activité\./.test(h))throw new Error(h);
    pose(1500,400);eq(M().etat,'atteinte','bien sous la cible, avec activite : bleu clair aussi (Liam : « cible atteinte/sous la cible »)');
    pose(2310,400);eq(M().etat,'atteinte','pile la cible');
    pose(2311,400);eq(M().etat,'couvert','au-dessus : vert-jaune');
    pose(2250,400);S.profil={prenom:'T',objectif:'maintien'};eq(M().etat,'ok','maintien : jamais bleu clair');
  }finally{sb.__e=vrai;X('estimateTDEE=__e');S.profil={prenom:'T',objectif:'perte'};}
});
t('*** sans activite, en seche : jour passe ou cible depassee, l\'encadre dit ou en est le deficit (9/10 de Liam : 3097 mangees) ***',()=>{
  const vrai=X('estimateTDEE');
  try{
    X("estimateTDEE=function(){return {ok:true,tdee:2673};}");
    X("TARGETS={kcal:2310,prot:175,gluc:208,lip:80};");S.profil={prenom:'T',objectif:'perte'};X('__setBurn')({});
    const j9=X('shiftDate(S.today,-4)'),pose=(d,k)=>{S.dayMeals={};S.dayMeals[d]=[{rid:'x',name:'R',mult:1,macros:{kcal:k,prot:123,gluc:320,lip:142}}];};
    pose(j9,3097);let g=M(j9);
    eq(g.act,0);eq(g.marge,-787);eq(g.deficit,-424);eq(g.etat,'depasse');eq(g.couleur,'var(--red)');
    let h=vis(X('_htmlMarge')(j9));
    if(!/Marge du jour dépassée de 787 kcal/.test(h))throw new Error(h);
    if(!/787 kcal au-dessus de ta cible, sans activité enregistrée/.test(h))throw new Error('calcul : '+h);
    if(!/Plus de déficit ce jour-là : ≈ 424 kcal de surplus\./.test(h))throw new Error('etat : '+h);
    pose(j9,2500);g=M(j9);eq(g.etat,'serre');eq(g.deficit,173);
    pose(j9,2200);g=M(j9);eq(g.etat,'ok');eq(g.couleur,'var(--green)');
    if(!/Dans ta cible : déficit ≈ 473 kcal \(prévu 363\)\./.test(vis(X('_htmlMarge')(j9))))throw new Error('vert : '+vis(X('_htmlMarge')(j9)));
    if(!/110 kcal sous ta cible, sans activité enregistrée/.test(vis(X('_htmlMarge')(j9))))throw new Error('calcul vert');
    pose(S.today,1500);eq(M(),null,'aujourd\'hui sous la cible, sans activite : rien (journee en cours)');
    pose(S.today,2600);g=M();eq(g.etat,'serre','aujourd\'hui au-dessus, sans activite : affiche');
    X("S.mainTab='recipes';S.displayDate=S.today;");if(/marge/.test(X('_htmlBarreReste()')))throw new Error('barre : marge sans activite (doublon du reste)');
    if(X('renderMacros()').indexOf('marge-jour')<0)throw new Error('tracker');
    S.profil={prenom:'T',objectif:'maintien'};eq(M().etat,'trop','maintien sans activite, cible depassee : affiche aussi (2600 pour 2310 : +290, tolerance 231)');
    S.dayMeals={};eq((S.profil={prenom:'T',objectif:'perte'},M(j9)),null,'jour sans repas : rien');
  }finally{sb.__e=vrai;X('estimateTDEE=__e');}
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
t('*** seche, plus de deficit du tout : rouge, depassement et surplus chiffres ***',()=>{
  jour(3300,400);const g=M();
  eq(g.marge,-600);eq(g.deficit,-50);eq(g.etat,'depasse');eq(g.couleur,'var(--red)');
  const h=vis(X('_htmlMarge')(S.today));
  if(!/Marge du jour dépassée de 600 kcal/.test(h))throw new Error(h);
  if(!/400 d'activité − 1000 au-dessus de ta cible/.test(h))throw new Error('calcul : '+h);
  if(!/Plus de déficit aujourd'hui : ≈ 50 kcal de surplus\./.test(h))throw new Error('etat : '+h);
});
t('bornes : cible = vert ; cible + activite = vert-jaune a 0 ; puis orange tant qu\'il reste un deficit ; rouge a 0 deficit',()=>{
  jour(2300,400);eq(M().etat,'atteinte');eq(M().marge,400);
  jour(2301,400);eq(M().etat,'couvert');
  jour(2700,400);eq(M().etat,'couvert');eq(M().marge,0);
  jour(2701,400);eq(M().etat,'serre');eq(M().deficit,549);
  jour(3249,400);eq(M().etat,'serre');eq(M().deficit,1);
  jour(3250,400);eq(M().etat,'depasse');eq(M().deficit,0);
  if(!/Plus de déficit aujourd'hui\./.test(vis(X('_htmlMarge')(S.today))))throw new Error('deficit nul');
});
t('*** deficit prevu = depense reelle estimee − cible quand elle existe (journee de Liam du 12/10) ***',()=>{
  const vrai=X('estimateTDEE');
  try{
    X("estimateTDEE=function(){return {ok:true,tdee:2673};}");
    X("TARGETS={kcal:2310,prot:175,gluc:208,lip:80};");S.profil={prenom:'T',objectif:'perte'};
    const pose=(k,a)=>{S.dayMeals={};S.dayMeals[S.today]=[{rid:'x',name:'R',mult:1,macros:{kcal:k,prot:150,gluc:200,lip:60}}];X('__setBurn')({[S.today]:{steps:0,activities:[{name:'M',kcal:a}]}});};
    pose(2338,161);let g=M();
    eq(g.prevu,363,'2673 − 2310');eq(g.marge,133);eq(g.deficit,496);eq(g.etat,'couvert');
    if(!/ton déficit tient \(≈ 496 kcal\)\./.test(vis(X('_htmlMarge')(S.today))))throw new Error(vis(X('_htmlMarge')(S.today)));
    pose(2600,161);g=M();eq(g.marge,-129);eq(g.deficit,234);eq(g.etat,'serre');
    if(!/Déficit serré : il en reste ≈ 234 kcal sur les 363 prévus par ta cible\./.test(vis(X('_htmlMarge')(S.today))))throw new Error(vis(X('_htmlMarge')(S.today)));
    pose(3000,161);g=M();eq(g.deficit,-166);eq(g.etat,'depasse');
    if(!/Plus de déficit aujourd'hui : ≈ 166 kcal de surplus\./.test(vis(X('_htmlMarge')(S.today))))throw new Error('surplus');
    pose(2000,161);if(!/Cible tenue et déficit au-delà du prévu : ≈ 834 kcal au lieu de 363, grâce à ton activité\./.test(vis(X('_htmlMarge')(S.today))))throw new Error('bleu');
    X("estimateTDEE=function(){return {ok:true,tdee:2200};}");pose(2338,161);g=M();
    eq(g.prevu,0,'cible au-dessus de la depense : aucun deficit prevu');eq(g.deficit,133);
    X("estimateTDEE=function(){return {ok:false};}");eq(M().prevu,550,'sans estimation : convention');
  }finally{sb.__e=vrai;X('estimateTDEE=__e');}
});
t('un seul deficit de reference : la marge et le conseil du Bilan (TDEE − 550) partagent DEFICIT_PREVU',()=>{
  eq(X('DEFICIT_PREVU'),550);
  if(!/var rec=Math\.round\(\(t\.tdee-DEFICIT_PREVU\)\/10\)\*10;/.test(src))throw new Error('conseil du Bilan');
  if(/MARGE_LARGE/.test(src))throw new Error('ancien seuil');
});
t('*** la cible du jour ne bouge pas en seche (decision du 25/09/2026) ***',()=>{
  jour(1880,400);eq(X('_cibleDuJour(S.today)'),2300);
  const r=X('calorieRing(1880,TARGETS.kcal,400)');if(vis(r).indexOf(' 420 kcal restantes')<0)throw new Error('anneau : '+vis(r));
});
t('*** prise de masse : bleu clair dans la cible du jour (cible + activite, ±10 %), trop / pas assez chiffres (demande de Liam, 13/10) ***',()=>{
  const vrai=X('estimateTDEE');
  try{
    X("estimateTDEE=function(){return {ok:true,tdee:2900};}");   /* cible 3200 : surplus prevu 300 */
    const pose=(k,a,obj,d)=>{d=d||S.today;X("TARGETS={kcal:3200,prot:175,gluc:400,lip:90};");S.profil={prenom:'T',objectif:obj||'prise'};S.dayMeals={};S.dayMeals[d]=[{rid:'x',name:'R',mult:1,macros:{kcal:k,prot:150,gluc:300,lip:80}}];X('__setBurn')(a?{[d]:{steps:0,activities:[{name:'M',kcal:a}]}}:{});};
    /* cible du jour 3600 (3200 + 400), tolerance 360 */
    pose(3650,400);let g=M();eq(g.ecart,50);eq(g.bilan,350);eq(g.etat,'atteinte');eq(g.couleur,'var(--sky)');
    let h=vis(X('_htmlMarge')(S.today));
    if(!/Marge du jour \+50 kcal/.test(h))throw new Error(h);
    if(!/400 d'activité à compenser − 450 au-dessus de ta cible/.test(h))throw new Error('calcul : '+h);
    if(!/Cible atteinte, activité compensée : ≈ 350 kcal de surplus \(prévu ≈ 300\)\./.test(h))throw new Error('etat : '+h);
    pose(3000,400);g=M();eq(g.etat,'ok');eq(g.couleur,'var(--green)');
    if(!/Encore 600 kcal à manger pour ta prise de masse \(ton activité y est comptée\)\./.test(vis(X('_htmlMarge')(S.today))))throw new Error('en cours');
    pose(4100,400);g=M();eq(g.etat,'trop');eq(g.couleur,'var(--orange)');
    if(!/Un peu trop : 500 kcal au-dessus de ta cible et de ton activité, ≈ 800 kcal de surplus \(prévu ≈ 300\)\./.test(vis(X('_htmlMarge')(S.today))))throw new Error('trop : '+vis(X('_htmlMarge')(S.today)));
    pose(4400,400);g=M();eq(g.etat,'tropFort');eq(g.couleur,'var(--red)');
    if(!/l'excès part surtout en gras\./.test(vis(X('_htmlMarge')(S.today))))throw new Error('trop fort');
    const hier=X('shiftDate(S.today,-1)');
    pose(3000,400,'prise',hier);g=M(hier);eq(g.etat,'manque');eq(g.bilan,-300);
    if(!/Pas assez ce jour-là : 600 kcal sous ta cible et ton activité, ≈ 300 kcal de déficit \(prévu ≈ 300\)\./.test(vis(X('_htmlMarge')(hier))))throw new Error('manque : '+vis(X('_htmlMarge')(hier)));
    if(!/Marge du jour −600 kcal/.test(vis(X('_htmlMarge')(hier))))throw new Error('valeur signee');
    if(!/200 kcal sous ta cible \+ 400 d'activité à compenser/.test(vis(X('_htmlMarge')(hier))))throw new Error('jour passe : pas de « restantes »');
    pose(2800,400,'prise',hier);g=M(hier);eq(g.etat,'manqueFort');
    if(!/sans surplus, pas de prise de masse\./.test(vis(X('_htmlMarge')(hier))))throw new Error('manque fort');
    pose(3300,0,'prise',hier);g=M(hier);eq(g.etat,'atteinte','sans activite, jour passe : affiche');
    if(!/^.*Cible atteinte : ≈ 400 kcal de surplus/.test(vis(X('_htmlMarge')(hier))))throw new Error('sans activite');
    X("estimateTDEE=function(){return {ok:false};}");pose(3650,400);eq(M().prevu,291,'sans estimation : cible − cible/1,1');
  }finally{sb.__e=vrai;X('estimateTDEE=__e');}
});
t('*** maintien : pile dedans en bleu clair, trop ou pas assez chiffres ***',()=>{
  const vrai=X('estimateTDEE');
  try{
    X("estimateTDEE=function(){return {ok:true,tdee:2650};}");   /* cible 2600 : ecart prevu −50 */
    const pose=(k,a,d)=>{d=d||S.today;X("TARGETS={kcal:2600,prot:150,gluc:300,lip:80};");S.profil={prenom:'T',objectif:'maintien'};S.dayMeals={};S.dayMeals[d]=[{rid:'x',name:'R',mult:1,macros:{kcal:k,prot:150,gluc:300,lip:80}}];X('__setBurn')(a?{[d]:{steps:0,activities:[{name:'M',kcal:a}]}}:{});};
    /* cible du jour 3000, tolerance 300 */
    pose(3000,400);let g=M();eq(g.etat,'atteinte');eq(g.bilan,-50);
    if(!/Pile dans ton maintien, activité compensée : ≈ 50 kcal de déficit\./.test(vis(X('_htmlMarge')(S.today))))throw new Error(vis(X('_htmlMarge')(S.today)));
    pose(3040,400);if(!/Pile dans ton maintien, activité compensée : à l'équilibre\./.test(vis(X('_htmlMarge')(S.today))))throw new Error('equilibre');
    pose(3400,400);eq(M().etat,'trop');if(!/Un peu trop : 400 kcal au-dessus de ta cible et de ton activité, ≈ 350 kcal de surplus\./.test(vis(X('_htmlMarge')(S.today))))throw new Error('trop');
    pose(3700,400);eq(M().etat,'tropFort');
    pose(2500,400);eq(M().etat,'ok','aujourd\'hui en dessous : encore a manger');
    if(!/Encore 500 kcal à manger pour tenir ton maintien/.test(vis(X('_htmlMarge')(S.today))))throw new Error('ok');
    const hier=X('shiftDate(S.today,-1)');
    pose(2500,400,hier);eq(M(hier).etat,'manque');
    pose(2300,400,hier);eq(M(hier).etat,'manqueFort');if(!/si ça se répète, tu perdras du poids\./.test(vis(X('_htmlMarge')(hier))))throw new Error('manque fort');
  }finally{sb.__e=vrai;X('estimateTDEE=__e');}
});
t('le calendrier et la marge partagent la meme tolerance (TOL_CIBLE)',()=>{
  eq(X('TOL_CIBLE'),0.1);
  if(!/m\.kcal>cible\*\(1\+TOL_CIBLE\)/.test(src)||!/m\.kcal<cible\*\(1-TOL_CIBLE\)/.test(src))throw new Error('_etatJour');
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
  if(!/marge <strong style="color:var\(--lime\);">150<\/strong>/.test(b))throw new Error(b);
  jour(2800,400);if(!/marge <strong style="color:var\(--orange\);">−100<\/strong>/.test(X('_htmlBarreReste()')))throw new Error('serre');
  jour(3300,400);if(!/marge <strong style="color:var\(--red\);">−600<\/strong>/.test(X('_htmlBarreReste()')))throw new Error('depasse');
});
t('*** message apres une activite : la marge, sans reproche ***',()=>{
  jour(1880,400);let c=X('coachActivite(S.today)');
  if(c.corps.indexOf('Marge du jour : 820 kcal, soit 420 restantes + 400 d\'activité. Cible tenue')<0)throw new Error(c.corps);
  jour(2800,400);c=X('coachActivite(S.today)');
  if(!/Ton activité ramène ton dépassement à 100 kcal : ton déficit tient encore \(≈ 450 kcal\)\.$/.test(c.corps))throw new Error(c.corps);
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
