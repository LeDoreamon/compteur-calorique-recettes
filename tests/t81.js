const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=require('fs').readFileSync('index.html','utf8');
const sansIA=f=>{const g=X('getApiKey'),m=X('getGeminiKey');X("getApiKey=function(){return ''};getGeminiKey=function(){return ''}");try{return f();}finally{sb.getApiKey=g;sb.getGeminiKey=m;}};
const avecIA=f=>{const g=X('getApiKey');X("getApiKey=function(){return 'gsk_x'}");try{return f();}finally{sb.getApiKey=g;}};
function compteNeuf(){X("S.catalogue=null;ACTIVE_PROFILE='users/u1';S.inv={frigo:[],congelateur:[],placards:[],epices:[]};S.waiting=[];S.editMode=false;S.invDlcSort=false;S.shop={list:[],graveyard:[]};S.dayMeals={};S.weights=[];S.today='2026-10-06';S.profil={prenom:'Camille',sexe:'F',objectif:'perte'}");}
console.log('\n=== XLII. Ergonomie : accueil, cibles, vocabulaire ===');
t('*** ecran d\'accueil : une phrase dit a quoi sert l\'appli ***',()=>{X("_auth.mode='accueil'");X('renderAuth()');if(docEl('profile-screen').innerHTML.indexOf('Compte tes calories et cuisine avec ce que tu as déjà.')<0)throw new Error('accroche absente');});
t('*** cibles expliquees : depense, ecart, rythme, date ; plus de nom de formule ***',()=>{
  const p="{sexe:'F',naissance:'1996-05-12',taille:165,poids:72,poidsVise:65,activite:'2',objectif:'perte'}";
  const tx=X("S.today='2026-10-06';_texteCibles("+p+",1580)");
  if(!/dépense environ <strong[^>]*>\d+ kcal/.test(tx))throw new Error('depense');
  if(!/kcal de moins<\/strong> que tu ne dépenses : environ <strong[^>]*>0,\d kg perdus par semaine/.test(tx))throw new Error('rythme : '+tx);
  if(!/65 kg vers <strong[^>]*>[a-zéû]+ 20\d\d<\/strong>/.test(tx))throw new Error('date');
  if(src.indexOf('Mifflin-St Jeor). Ajuste')>=0)throw new Error('jargon encore affiche');
});
t('maintien : poids stable ; infos manquantes : repere generique',()=>{
  if(X("_texteCibles({sexe:'H',naissance:'1990-01-01',taille:180,poids:80,activite:'2',objectif:'maintien'},Math.round(_depenseEstimee({sexe:'H',naissance:'1990-01-01',taille:180,poids:80,activite:'2'})/10)*10)").indexOf('rester stable')<0)throw new Error('maintien');
  if(X("_texteCibles({},1500)").indexOf('Repère calculé')<0)throw new Error('generique');
});
t('calculerCibles inchange apres extraction de _depenseEstimee',()=>{eq(JSON.stringify(X("calculerCibles({sexe:'F',naissance:'1996-05-12',taille:165,poids:72,poidsVise:65,activite:'2',objectif:'perte'})")),'{"kcal":1580,"prot":117,"gluc":179,"lip":44}');});
t('*** « Sèche » pour mon compte, « Perte de poids » pour les autres ***',()=>{
  compteNeuf();eq(X('_libObjectif()'),'Perte de poids');eq(X('_motSeche()'),'perte de poids');
  X("S.catalogue='liam'");eq(X('_libObjectif()'),'Sèche');X("S.catalogue=null");
});
console.log('\n=== XLIII. Ergonomie : ecrans vides ===');
t('*** inventaire vide : un seul message, sans tri, edition ni recherche ***',()=>{
  compteNeuf();const h=X('renderInv()');
  if(h.indexOf('Ton inventaire est vide.')<0)throw new Error('message');
  if(/Trier par DLC|inv-search|Préparer un plat|toggleEditMode/.test(h))throw new Error('outils affiches');
  if(h.indexOf("openAddItem(\\'frigo\\')")<0&&h.indexOf("openAddItem('frigo')")<0)throw new Error('bouton ajout');
});
t('*** inventaire vide mais articles a ranger : la liste « À ranger » reste visible ***',()=>{
  compteNeuf();X("S.waiting=[{id:'w1',name:'Riz',rayon:'epicerie'}]");const h=X('renderInv()');
  if(h.indexOf('À ranger')<0)throw new Error('a ranger masque');
});
t('inventaire avec un article : outils de retour',()=>{compteNeuf();X("S.inv.frigo=[{id:'a',name:'Yaourt',qty:4,unit:'pcs'}]");if(X('renderInv()').indexOf('Trier par DLC')<0)throw new Error('outils absents');});
t('*** courses vides : ni mode d\'emploi ni bouton de validation ***',()=>{
  compteNeuf();const h=X('renderCoursesHTML()');
  if(/Valider les courses|Coche ce que tu mets/.test(h))throw new Error('encore affiches');
  X("S.shop.list=[{id:'s1',name:'Riz',rayon:'epicerie',checked:false}]");const h2=X('renderCoursesHTML()');
  if(h2.indexOf('Valider les courses')<0||h2.indexOf('Coche ce que tu mets')<0)throw new Error('absents avec un article');
});
t('*** bilan sans journee complete : pas de carte « Pilotage » vide ***',()=>{compteNeuf();if(/Pilotage de la/.test(X('renderCockpit()')))throw new Error('carte vide');});
t('*** objectif avec une seule pesee : on explique qu\'il faut des pesees, sans reproche ***',()=>{
  compteNeuf();X("S.weightGoal=65;S.weights=[{d:'2026-10-06',w:72}]");const h=X('renderGoalBlock()');
  if(h.indexOf('une date estimée apparaîtra après quelques pesées')<0)throw new Error('message');
  if(h.indexOf('ne baisse pas assez')>=0)throw new Error('reproche');
});
t('recettes vides pour un compte sans catalogue : marche a suivre',()=>{compteNeuf();sansIA(()=>{X("S.mainTab='recipes'");X('render()');const h=docEl('root').innerHTML;X("S.mainTab='accueil'");
  if(h.indexOf('Pas encore de recettes. Remplis ton inventaire')<0)throw new Error('message');if(h.indexOf('il faut une clé IA')<0)throw new Error('cle');});});
console.log('\n=== XLIV. Ergonomie : sans IA, deconnexion, onglet ===');
t('*** sans IA : le menu + commence par code-barres et saisie manuelle, propose d\'activer l\'IA ***',()=>{
  compteNeuf();sansIA(()=>X('ouvrirMenuAjout()'));const h=docEl('menu-ajout-corps').innerHTML;
  const i=h.indexOf("menuAjoutAction('code')"),m=h.indexOf("menuAjoutAction('manuel')");
  if(!(i>0&&m>i))throw new Error('ordre');if(h.indexOf("menuAjoutAction('texte')")>=0||h.indexOf("menuAjoutAction('photo')")>=0)throw new Error('parcours IA proposes');
  if(h.indexOf("menuAjoutAction('ia')")<0)throw new Error('activer IA');
});
t('« Activer l\'IA » ouvre les reglages ; « Saisie manuelle » ouvre la saisie',()=>{
  let o=0,m=0;const so=sb.openSettings,sm=sb.manualAddMeal;sb.openSettings=()=>{o++;};sb.manualAddMeal=()=>{m++;};
  try{X("menuAjoutAction('ia')");X("menuAjoutAction('manuel')");}finally{sb.openSettings=so;sb.manualAddMeal=sm;}
  eq(o,1);eq(m,1);
});
t('*** sans IA : la fenetre d\'ajout masque la description et la photo ***',()=>{
  compteNeuf();sansIA(()=>X("openAddMeal('text')"));
  eq(docEl('am-bloc-ia').style.display,'none');eq(docEl('am-m-photo').style.display,'none');eq(docEl('am-autrement').textContent,'Ajouter le repas');
  avecIA(()=>X("openAddMeal('text')"));eq(docEl('am-bloc-ia').style.display,'');eq(docEl('am-autrement').textContent,'Ou autrement');
});
t('avec IA : menu inchange',()=>{avecIA(()=>X('ouvrirMenuAjout()'));const h=docEl('menu-ajout-corps').innerHTML;if(h.indexOf("menuAjoutAction('texte')")<0)throw new Error('texte');});
t('*** bandeau sans IA en clair (plus de « features », plus de « Clé API Groq ») ***',()=>{if(/features IA|Clé API Groq non configurée/.test(src))throw new Error('ancien texte');if(src.indexOf('Sans IA : pas d’analyse des repas')<0)throw new Error('nouveau texte');});
t('*** onglet « Repas » (journal du jour et recettes) ***',()=>{if(src.indexOf("['recipes','\\ud83c\\udf7d\\ufe0f','Repas']")<0)throw new Error('libelle');});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
