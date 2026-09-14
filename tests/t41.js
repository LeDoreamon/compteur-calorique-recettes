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
t('*** l\'icone de l\'inventaire evoque le frigo ***',()=>{
  if(!/'inventory','\\ud83e\\uddca'/.test(src))throw new Error('icone inchangee');
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
