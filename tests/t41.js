const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');

console.log('\n=== EV. Les quatre moments ===');
t('*** les quatre moments sont definis ***',()=>{
  const M=G('MOMENTS');
  eq(M.length,4);
  eq(M.map(m=>m.id).join(','),'breakfast,lunch,dinner,snack','ordre : collation en dernier');
});
t('chacun a une couleur distincte',()=>{
  const c=G('MOMENTS').map(m=>m.couleur);
  eq(new Set(c).size,4,'couleurs en double');
  c.forEach(function(x){if(!/^#[0-9A-Fa-f]{6}$/.test(x))throw new Error('couleur invalide : '+x);});
});
t('couleurMoment repond pour chaque identifiant',()=>{
  ['breakfast','lunch','dinner','snack'].forEach(function(id){
    if(G('couleurMoment')(id)==='transparent')throw new Error(id+' sans couleur');
  });
});
t('un identifiant inconnu ne casse rien',()=>{
  eq(G('couleurMoment')('nimportequoi'),'transparent');
  eq(G('couleurMoment')(null),'transparent');
});

console.log('\n=== EW. Le repas retient son moment ===');
t('*** le moment choisi est enregistre avec le repas ***',()=>{
  if(!/slot:_amSlot\|\|null/.test(src))throw new Error('le moment n\'est pas conserve');
});
t('*** le liseré reprend la couleur du moment ***',()=>{
  if(!/border-left:3px solid \$\{_mo\.couleur\}/.test(src))throw new Error('liseré absent');
  if(!/border-left:3px solid transparent/.test(src))throw new Error('pas de repli sans moment');
});
t('un repas sans moment garde le meme alignement',()=>{
  const i=src.indexOf("border-left:3px solid transparent");
  if(!/padding-left:7px/.test(src.slice(i,i+80)))throw new Error('alignement different');
});

console.log('\n=== EX. Corriger le moment apres coup ===');
t('le selecteur existe dans la fenetre d\'edition',()=>{
  if(!/id="em-moments"/.test(src))throw new Error('bloc absent');
  if(!/Moment de la journée/.test(src))throw new Error('libelle absent');
});
t('*** ouvrir un repas pre-selectionne son moment ***',()=>{
  S.dayMeals[S.today]=[{rid:'x',name:'Test',mult:1,slot:'dinner',macros:{kcal:500,prot:30,gluc:40,lip:15}}];
  G('openEditMeal')(S.today,0);
  const h=docEl('em-moments').innerHTML;
  if(!/setEmMoment\('dinner'\)/.test(h))throw new Error('boutons non rendus');
  const i=h.indexOf("setEmMoment('dinner')");
  if(!/#8B7DD8/.test(h.slice(i,i+300)))throw new Error('moment non surligne');
});
t('les quatre boutons sont proposes',()=>{
  const h=docEl('em-moments').innerHTML;
  eq((h.match(/setEmMoment\(/g)||[]).length,4);
});
t('*** choisir un moment puis enregistrer l\'applique ***',()=>{
  S.dayMeals[S.today]=[{rid:'x',name:'Test',mult:1,macros:{kcal:500,prot:30,gluc:40,lip:15}}];
  G('openEditMeal')(S.today,0);
  G('setEmMoment')('lunch');
  docEl('em-name').value='Test';
  G('saveEditMeal')();
  eq(S.dayMeals[S.today][0].slot,'lunch');
});
t('recliquer sur le meme moment le retire',()=>{
  S.dayMeals[S.today]=[{rid:'x',name:'Test',mult:1,slot:'lunch',macros:{kcal:500,prot:30,gluc:40,lip:15}}];
  G('openEditMeal')(S.today,0);
  G('setEmMoment')('lunch');
  docEl('em-name').value='Test';
  G('saveEditMeal')();
  if(S.dayMeals[S.today][0].slot)throw new Error('moment toujours pose');
});
t('le reste du repas survit au changement de moment',()=>{
  S.dayMeals[S.today]=[{rid:'x',name:'Mon repas',mult:1,macros:{kcal:500,prot:30,gluc:40,lip:15}}];
  G('openEditMeal')(S.today,0);
  G('setEmMoment')('breakfast');
  docEl('em-name').value='Mon repas';
  G('saveEditMeal')();
  const m=S.dayMeals[S.today][0];
  eq(m.name,'Mon repas');eq(m.macros.kcal,500);
});

console.log('\n=== EY. Icones et aura ===');
t('*** l\'icone des recettes est un livre ouvert ***',()=>{
  if(!/'recipes','\\ud83d\\udcd6'/.test(src))throw new Error('icone inchangee');
});
t('*** l\'icone de l\'inventaire est un frigo dessine ***',()=>{
  if(!/ICONE_FRIGO/.test(src))throw new Error('icone absente');
  if(!/'inventory',ICONE_FRIGO/.test(src))throw new Error('non reliee a l\'onglet');
  if(/'inventory','\\ud83e\\uddca'/.test(src))throw new Error('glacon encore utilise');
});
t('les deux autres onglets sont inchanges',()=>{
  if(!/'courses','\\ud83d\\uded2'/.test(src))throw new Error('courses modifie');
  if(!/'weight','\\ud83d\\udcca'/.test(src))throw new Error('bilan modifie');
});
t('*** une aura entoure l\'onglet actif ***',()=>{
  if(!/\.bnav-b\.on::before/.test(src))throw new Error('aura absente');
  if(!/radial-gradient/.test(src.slice(src.indexOf('.bnav-b.on::before'),src.indexOf('.bnav-b.on::before')+400)))
    throw new Error('pas de degradé');
});
t('l\'aura ne recouvre pas l\'icone',()=>{
  const i=src.indexOf('.bnav-b.on::before');
  if(!/z-index: -1/.test(src.slice(i,i+400)))throw new Error('aura au-dessus du contenu');
});
t('la barre garde sa position fixe',()=>{
  const i=src.indexOf('.bnav { position: fixed');
  if(i<0)throw new Error('regle perdue');
  if(!/bottom: 0/.test(src.slice(i,i+700)))throw new Error('ancrage perdu');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');

console.log('\n=== FN. Moment a la confirmation de cuisson ===');
t('*** le selecteur existe dans la fenetre de cuisson ***',()=>{
  if(!/id="cc-moments"/.test(src))throw new Error('bloc absent');
  if(!/function renderCcMoments/.test(src))throw new Error('rendu absent');
});
t('*** le moment part avec le repas cuisine ***',()=>{
  if(!/if\(_ccMoment\)_entry\.slot=_ccMoment;/.test(src))throw new Error('moment non enregistre');
});
t('*** une recette a un seul creneau le pre-remplit ***',()=>{
  S.inv={frigo:[],placards:[],congelateur:[],epices:[]};
  S.dayMeals[S.today]=[];
  const r=(sb.RCP||[]).find(x=>x.slots&&x.slots.length===1&&x.profile==='liam');
  if(!r)throw new Error('aucune recette a creneau unique');
  G('openConfirmCook')(r.id,1,S.today,false);
  const h=docEl('cc-moments').innerHTML;
  const i=h.indexOf("setCcMoment('"+r.slots[0]+"')");
  if(i<0)throw new Error('bouton absent');
  if(!/background:#/.test(h.slice(i,i+220)))throw new Error('creneau non pre-selectionne');
});
t('les quatre moments sont proposes',()=>{
  const h=docEl('cc-moments').innerHTML;
  eq((h.match(/setCcMoment\(/g)||[]).length,4);
});
t('*** plusieurs creneaux : le prochain moment du jour est retenu ***',()=>{
  S.dayMeals[S.today]=[{rid:'a',name:'Pdj',mult:1,slot:'breakfast',macros:{kcal:400,prot:30,gluc:40,lip:10}}];
  const r=(sb.RCP||[]).find(x=>x.slots&&x.slots.indexOf('lunch')>=0&&x.slots.indexOf('dinner')>=0&&x.profile==='liam');
  if(!r)throw new Error('aucune recette a creneaux multiples');
  G('openConfirmCook')(r.id,1,S.today,false);
  const h=docEl('cc-moments').innerHTML;
  const i=h.indexOf("setCcMoment('lunch')");
  if(!/background:#/.test(h.slice(i,i+220)))throw new Error('le dejeuner manquant aurait du etre propose');
});
t('on peut changer le moment propose',()=>{
  G('setCcMoment')('dinner');
  const h=docEl('cc-moments').innerHTML;
  const i=h.indexOf("setCcMoment('dinner')");
  if(!/background:#/.test(h.slice(i,i+220)))throw new Error('changement sans effet');
});
t('recliquer sur le meme moment le retire',()=>{
  // On repart d'un etat connu en rouvrant la fenetre
  S.dayMeals[S.today]=[];
  const r=(sb.RCP||[]).find(x=>x.slots&&x.slots.length===1&&x.profile==='liam');
  G('openConfirmCook')(r.id,1,S.today,false);
  const cible=r.slots[0];
  const actif=function(){
    const h=docEl('cc-moments').innerHTML;
    const i=h.indexOf("setCcMoment('"+cible+"')");
    return /background:#[0-9A-F]{6}22/i.test(h.slice(i,i+220));
  };
  if(!actif())throw new Error('le creneau de la recette devrait etre pre-selectionne');
  G('setCcMoment')(cible);
  if(actif())throw new Error('le moment reste actif apres un second clic');
});

console.log('\n=== FO. Le halo ne rejoue plus a chaque clic ===');
t('*** la barre n\'est construite qu\'une fois ***',()=>{
  const i=src.indexOf('function renderBnav');
  const b=src.slice(i,i+900);
  if(!/if\(!_bnavPose\)/.test(b))throw new Error('reconstruite a chaque rendu');
  if(!/_bnavPose=true/.test(b))throw new Error('drapeau non pose');
});
t('*** seule la classe change ensuite ***',()=>{
  const i=src.indexOf('function renderBnav');
  const b=src.slice(i,i+900);
  if(!/if\(b\.className!==vis\)b\.className=vis/.test(b))
    throw new Error('la classe est reecrite meme sans changement');
});
t('rester sur le meme onglet ne touche a rien',()=>{
  S.mainTab='accueil';sb.render();
  const b=docEl('bnav-b-accueil');
  const avant=b.className;
  sb.render();sb.render();
  eq(b.className,avant,'classe reecrite inutilement');
});
t('changer d\'onglet deplace bien la marque',()=>{
  S.mainTab='accueil';sb.render();
  eq(docEl('bnav-b-accueil').className,'bnav-b on');
  S.mainTab='recipes';sb.render();
  eq(docEl('bnav-b-accueil').className,'bnav-b');
  eq(docEl('bnav-b-recipes').className,'bnav-b on');
});
t('chaque bouton porte un identifiant stable',()=>{
  if(!/id="bnav-b-'\+t\[0\]\+'"/.test(src))throw new Error('identifiants absents');
});
console.log('\n---- total '+pass+' ok, '+fail+' KO ----');

console.log('\n=== FP. Moment a l\'ajout d\'un repas ===');
t('*** les boutons suivent l\'ordre reel de la journee ***',()=>{
  S.inv={frigo:[],placards:[],congelateur:[],epices:[]};S.dayMeals[S.today]=[];
  sb.openAddMeal('text');
  const h=docEl('am-slots').innerHTML;
  const pos=['breakfast','lunch','dinner','snack'].map(x=>h.indexOf("setAmSlot('"+x+"')"));
  pos.forEach(function(p,i){if(p<0)throw new Error('moment '+i+' absent');});
  for(var i=1;i<pos.length;i++)if(pos[i]<pos[i-1])throw new Error('collation avant diner');
});
t('*** chaque bouton porte la couleur de son moment ***',()=>{
  S.dayMeals[S.today]=[];
  sb.openAddMeal('text');
  const h=docEl('am-slots').innerHTML;
  const i=h.indexOf("setAmSlot('breakfast')");
  if(!/#E9A13B/.test(h.slice(i,i+240)))throw new Error('couleur du petit-dejeuner absente');
});
t('*** le moment est pre-rempli d\'apres ce qui manque ***',()=>{
  S.dayMeals[S.today]=[];
  sb.openAddMeal('text');
  eq(G('__amSlot')(),'breakfast','journee vierge : petit-dejeuner attendu');
});
t('il suit l\'ordre quand des repas sont deja loggés',()=>{
  S.dayMeals[S.today]=[{rid:'a',name:'Pdj',mult:1,slot:'breakfast',macros:{kcal:400,prot:30,gluc:40,lip:10}}];
  sb.openAddMeal('text');
  eq(G('__amSlot')(),'lunch');
});
t('*** pre-remplir ne renomme pas le repas ***',()=>{
  S.dayMeals[S.today]=[];
  docEl('addmeal-name').value='';
  sb.openAddMeal('text');
  const n=docEl('addmeal-name').value||'';
  if(/à base de/.test(n))throw new Error('le nom a ete prefixe : '+n);
});
t('les quatre moments couverts : aucun pre-remplissage',()=>{
  S.dayMeals[S.today]=['breakfast','lunch','dinner','snack'].map(function(s){
    return {rid:s,name:s,mult:1,slot:s,macros:{kcal:300,prot:20,gluc:30,lip:8}};
  });
  sb.openAddMeal('text');
  eq(G('__amSlot')(),null);
});
t('choisir un moment a la main renomme toujours le repas',()=>{
  S.dayMeals[S.today]=[];
  sb.openAddMeal('text');
  docEl('addmeal-name').value='pâtes au thon';
  G('setAmSlot')('dinner');
  if(!/Dîner à base de/.test(docEl('addmeal-name').value))
    throw new Error('renommage perdu : '+docEl('addmeal-name').value);
});
t('plus aucune fonction morte de rendu des moments',()=>{
  if(/_renderAmSlotsAncien/.test(src))throw new Error('fonction morte conservee');
});
console.log('\n---- total '+pass+' ok, '+fail+' KO ----');

console.log('\n=== FQ. Moment des l\'ecran de saisie ===');
t('*** le choix est propose avant l\'analyse ***',()=>{
  if(!/id="am-slots-entree"/.test(src))throw new Error('bloc absent de l\'ecran de saisie');
  const iEntree=src.indexOf('id="am-slots-entree"');
  const iInput=src.indexOf('id="addmeal-input"');
  const iVerify=src.indexOf('id="addmeal-verify"');
  if(iEntree<iInput)throw new Error('place avant l\'ecran de saisie');
  if(iVerify>0&&iEntree>iVerify)throw new Error('place sur l\'ecran de confirmation');
});
t('*** les deux ecrans montrent le meme etat ***',()=>{
  S.inv={frigo:[],placards:[],congelateur:[],epices:[]};S.dayMeals[S.today]=[];
  sb.openAddMeal('text');
  const a=docEl('am-slots-entree').innerHTML;
  const b=docEl('am-slots').innerHTML;
  if(!a)throw new Error('ecran de saisie vide');
  eq(a,b,'les deux selecteurs divergent');
});
t('le moment y est deja pre-rempli',()=>{
  S.dayMeals[S.today]=[];
  sb.openAddMeal('text');
  const h=docEl('am-slots-entree').innerHTML;
  const i=h.indexOf("setAmSlot('breakfast')");
  if(!/#E9A13B/.test(h.slice(i,i+240)))throw new Error('non pre-rempli');
});
t('*** changer de moment sur la saisie se voit sur la confirmation ***',()=>{
  S.dayMeals[S.today]=[];
  sb.openAddMeal('text');
  G('setAmSlot')('dinner');
  const b=docEl('am-slots').innerHTML;
  const i=b.indexOf("setAmSlot('dinner')");
  if(!/#8B7DD8/.test(b.slice(i,i+240)))throw new Error('non repercute');
});
t('*** sans nom saisi, rien n\'est renomme ***',()=>{
  S.dayMeals[S.today]=[];
  sb.openAddMeal('text');
  docEl('addmeal-name').value='';
  G('setAmSlot')('lunch');
  const n=docEl('addmeal-name').value||'';
  if(/à base de/.test(n))throw new Error('nom fabrique a vide : '+n);
});
t('avec un nom, le renommage fonctionne toujours',()=>{
  S.dayMeals[S.today]=[];
  sb.openAddMeal('text');
  docEl('addmeal-name').value='pâtes au thon';
  G('setAmSlot')('dinner');
  if(!/Dîner à base de/.test(docEl('addmeal-name').value))
    throw new Error('renommage perdu : '+docEl('addmeal-name').value);
});
console.log('\n---- total '+pass+' ok, '+fail+' KO ----');

console.log('\n=== FZ. Ordre des repas dans le tracker ===');
const R=(slot,nom)=>({rid:'r_'+nom,name:nom,mult:1,slot:slot,macros:{kcal:300,prot:20,gluc:30,lip:10}});
t('*** les repas suivent l\'ordre de la journee ***',()=>{
  const m=[R('dinner','D'),R('snack','C'),R('breakfast','P'),R('lunch','L')];
  eq(G('_ordreRepas')(m).map(i=>m[i].name).join(''),'PLDC');
});
t('*** les repas sans moment passent a la fin ***',()=>{
  const m=[R(null,'X'),R('dinner','D'),R(undefined,'Y'),R('breakfast','P')];
  eq(G('_ordreRepas')(m).map(i=>m[i].name).join(''),'PDXY');
});
t('a moment egal, l\'ordre de saisie est garde',()=>{
  const m=[R('snack','C1'),R('lunch','L'),R('snack','C2')];
  eq(G('_ordreRepas')(m).map(i=>m[i].name).join(','),'L,C1,C2');
});
t('un moment inconnu est traite comme absent',()=>{
  const m=[R('brunch','B'),R('lunch','L')];
  eq(G('_ordreRepas')(m).map(i=>m[i].name).join(''),'LB');
});
t('liste vide ou nulle',()=>{
  eq(G('_ordreRepas')([]).length,0);eq(G('_ordreRepas')(null).length,0);
});
t('*** l\'edition vise toujours le bon repas ***',()=>{
  S.inv={frigo:[],placards:[],congelateur:[],epices:[]};
  S.displayDate=S.today;
  S.dayMeals[S.today]=[R('dinner','Diner'),R('breakfast','Petit')];
  S.mainTab='recipes';sb.render();
  const h=docEl('root').innerHTML;
  const iP=h.indexOf('>Petit'),iD=h.indexOf('>Diner');
  if(iP<0||iD<0)throw new Error('repas absents du rendu');
  if(iP>iD)throw new Error('le petit-dejeuner devrait s\'afficher en premier');
  const seg=h.slice(h.lastIndexOf('data-action="edit-meal"',iP),iP);
  if(!/data-idx="1"/.test(seg))throw new Error('le lien d\'edition pointe vers le mauvais repas');
});
t('les donnees ne sont pas reordonnees',()=>{
  eq(S.dayMeals[S.today][0].name,'Diner','le tri ne doit toucher que l\'affichage');
});
console.log('\n---- total '+pass+' ok, '+fail+' KO ----');
