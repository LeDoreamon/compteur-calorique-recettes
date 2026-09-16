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
