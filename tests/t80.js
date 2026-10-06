const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
const acc=()=>X('renderAccueil()');
console.log('\n=== XXXVII. Nutrition : rappel de pesee ===');
t('*** jamais pese : rappel affiche ***',()=>{X("S.today='2026-10-06';S.weights=[]");delete LS.dz_pesee_plus_tard;if(acc().indexOf('Pas encore de pesée')<0)throw new Error('absent');});
t('*** pese hier : pas de rappel ; il y a 2 jours : rappel ***',()=>{
  X("S.weights=[{d:'2026-10-05',w:80}]");if(/pesée il y a|Pas encore de pesée/.test(acc()))throw new Error('rappel trop tot');
  X("S.weights=[{d:'2026-10-04',w:80},{d:'2026-09-20',w:81}]");if(acc().indexOf('Dernière pesée il y a 2 jours')<0)throw new Error('absent a 2 jours');
});
t('une pesee future (saisie par erreur) ne masque pas le rappel',()=>{X("S.weights=[{d:'2026-10-20',w:80},{d:'2026-10-01',w:80}]");if(acc().indexOf('il y a 5 jours')<0)throw new Error('mauvais calcul');});
t('*** « Plus tard » : masque pour la journee seulement ***',()=>{
  X("S.weights=[]");X('peseePlusTard()');eq(LS.dz_pesee_plus_tard,'2026-10-06');if(acc().indexOf('Pas encore de pesée')>=0)throw new Error('encore affiche');
  X("S.today='2026-10-07'");if(acc().indexOf('Pas encore de pesée')<0)throw new Error('pas revenu le lendemain');X("S.today='2026-10-06'");
});
t('« Me peser » ouvre la pesee',()=>{delete LS.dz_pesee_plus_tard;X("S.weights=[]");if(acc().indexOf("menuAjoutAction('pesee')")<0)throw new Error('bouton');});
console.log('\n=== XXXVIII. Nutrition : journees trop basses ===');
function jour(d,k){X("S.dayMeals['"+d+"']=[{rid:'_x',name:'R',mult:1,macros:{kcal:"+k+",prot:50,gluc:50,lip:20}}]");}
function prepBas(sexe){X("S.today='2026-10-06';S.dayMeals={};S.weights=[{d:'2026-10-06',w:80}];TARGETS={kcal:2000,prot:150,gluc:200,lip:70};S.profil={prenom:'A',sexe:'"+sexe+"'}");delete LS.dz_bas_vu;}
t('*** homme : 2 jours sur 3 sous 1500 -> alerte ***',()=>{prepBas('H');jour('2026-10-05',1300);jour('2026-10-04',1400);jour('2026-10-03',2000);
  const h=acc();if(h.indexOf('Journées très basses')<0)throw new Error('absente');if(h.indexOf('sous 1500 kcal')<0)throw new Error('plancher');});
t('un seul jour bas : pas d\'alerte',()=>{prepBas('H');jour('2026-10-05',1300);jour('2026-10-04',1900);jour('2026-10-03',2000);if(acc().indexOf('Journées très basses')>=0)throw new Error('alerte a tort');});
t('*** journees sous 50 % de la cible = oublis de saisie, pas comptees ***',()=>{prepBas('H');jour('2026-10-05',600);jour('2026-10-04',800);if(acc().indexOf('Journées très basses')>=0)throw new Error('oublis comptes');});
t('sexe en minuscule (« h ») : plancher homme',()=>{prepBas('h');jour('2026-10-05',1300);jour('2026-10-04',1400);if(acc().indexOf('sous 1500 kcal')<0)throw new Error('minuscule ignoree');});
t('femme : plancher 1200',()=>{prepBas('F');jour('2026-10-05',1300);jour('2026-10-04',1300);if(acc().indexOf('Journées très basses')>=0)throw new Error('1300 > 1200');
  jour('2026-10-05',1100);jour('2026-10-04',1150);if(acc().indexOf('sous 1200 kcal')<0)throw new Error('absente');});
t('« Compris » masque pour la journee',()=>{X('joursBasVu()');if(acc().indexOf('Journées très basses')>=0)throw new Error('encore');});
console.log('\n=== XXXIX. Nutrition : proteines par repas ===');
function repas(slot,p){X("S.dayMeals[S.today]=(S.dayMeals[S.today]||[]).concat([{rid:'_y',name:'R',mult:1,slot:"+(slot?"'"+slot+"'":"null")+",macros:{kcal:400,prot:"+p+",gluc:40,lip:10}}])");}
t('*** proteines par repas affichees, repas principal faible signale ***',()=>{prepBas('H');repas('breakfast',12);repas('lunch',45);repas('snack',8);
  const h=acc();if(h.indexOf('Protéines par repas')<0)throw new Error('ligne absente');
  if(!/Petit-déj <strong style="color:var\(--orange\);">12 g/.test(h))throw new Error('petit-dej non signale');
  if(!/Déjeuner <strong style="color:var\(--green\);">45 g/.test(h))throw new Error('dejeuner');
  if(h.indexOf('ton petit déjeuner n’en a apporté que 12 g')<0)throw new Error('conseil');});
t('une collation seule : pas de ligne ; collation faible jamais signalee',()=>{prepBas('H');repas('snack',5);if(acc().indexOf('Protéines par repas')>=0)throw new Error('ligne pour une collation');});
t('tout au-dessus de 25 g : pas de conseil',()=>{prepBas('H');repas('breakfast',30);repas('dinner',40);if(acc().indexOf('Vise 25 à 40 g')>=0)throw new Error('conseil a tort');});
console.log('\n=== XL. Nutrition : portions adaptees a la seche ===');
t('*** catalogue : aucun plat principal au-dessus de 700 kcal, aucun petit-dejeuner au-dessus de 550 ***',()=>{
  const trop=X("RCP.filter(function(r){return /^liam_v[67]_/.test(r.id)&&r.slots&&r.slots.length}).filter(function(r){var princ=r.slots.indexOf('lunch')>=0||r.slots.indexOf('dinner')>=0;return princ?r.kcal>700:(r.slots.indexOf('breakfast')>=0&&r.kcal>550);}).map(function(r){return r.name+' '+r.kcal})");
  if(trop.length)throw new Error(trop.join(' | '));
});
t('*** generation IA en perte de poids : consigne de portions (550-700 kcal, 35 g de proteines) ***',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!/PORTIONS \(perte de poids\) : plat principal \(déjeuner, dîner\) entre 550 et 700 kcal/.test(src))throw new Error('consigne absente');
  if(!/\$\{_objectif\(\)==='perte'\?`/.test(src))throw new Error('non conditionnee a l\'objectif');
});
console.log('\n=== XLI. Nutrition : produits tres transformes (NOVA) ===');
const offNova=(g)=>async()=>({ok:true,status:200,json:async()=>({status:1,product:{product_name:'Biscuits',nova_group:g,nutriments:{'energy-kcal_100g':480,proteins_100g:6,carbohydrates_100g:65,fat_100g:20}}})});
function ficheN(it){X("S.inv={frigo:[],congelateur:[],placards:["+JSON.stringify(it)+"],epices:[]};");X("openItemDetail('placards','"+it.id+"')");}
t('*** groupe NOVA demande a OpenFoodFacts ***',()=>{const src=require('fs').readFileSync('index.html','utf8');if(src.indexOf('quantity,nova_group')<0)throw new Error('champ absent');});
t('_novaValide : 1 a 4 seulement',()=>{eq(X("[_novaValide(4),_novaValide('2'),_novaValide(0),_novaValide(5),_novaValide('x'),_novaValide(null)].join(',')"),'4,2,,,,');});
t('*** scan de la fiche : NOVA 4 garde sur l\'article et signale ***',async()=>{
  ficheN({id:'bi',name:'Biscuits',qty:200,unit:'g'});
  const vrai=sb.fetch;sb.fetch=offNova(4);
  try{X("_scanMode='item'");await X('lookupBarcode')('3017620422003');}finally{sb.fetch=vrai;}
  if(docEl('item-scan-st').textContent.indexOf('très transformé')<0)throw new Error('message de scan');
  X('saveItemDetail()');eq(X("findItem('bi').nova"),4);
  if(X("_badgeNova(findItem('bi'))").indexOf('pastille-nova')<0)throw new Error('badge');
  X("openItemDetail('placards','bi')");if(docEl('item-nova').innerHTML.indexOf('Produit très transformé')<0||docEl('item-nova').style.display!=='block')throw new Error('explication fiche');
});
t('enregistrer la fiche sans nouveau scan ne touche pas au classement',()=>{X("openItemDetail('placards','bi')");X('saveItemDetail()');eq(X("findItem('bi').nova"),4);});
t('un nouveau scan NOVA 1 remplace le 4 ; produit sans classement -> retire',async()=>{
  const vrai=sb.fetch;
  try{X("openItemDetail('placards','bi');_scanMode='item'");sb.fetch=offNova(1);await X('lookupBarcode')('3017620422003');X('saveItemDetail()');eq(X("findItem('bi').nova"),1);
    X("openItemDetail('placards','bi')");sb.fetch=offNova(undefined);await X('lookupBarcode')('3017620422003');X('saveItemDetail()');eq(X("findItem('bi').nova"),undefined);
  }finally{sb.fetch=vrai;}
  X("openItemDetail('placards','bi')");eq(docEl('item-nova').style.display,'none');
});
t('pas de badge sans classement ou en dessous de 4',()=>{eq(X("_badgeNova({nova:3})+_badgeNova({})+_badgeNova(null)"),'');});
t('*** courses : scan -> a ranger -> inventaire, le classement suit ***',async()=>{
  X("S.inv={frigo:[],congelateur:[],placards:[],epices:[]};S.shop={list:[],graveyard:[]};S.waiting=[]");
  const vrai=sb.fetch;sb.fetch=offNova(4);
  try{X("_scanMode='shop'");await X('lookupBarcode')('3017620422003');}finally{sb.fetch=vrai;}
  eq(X("S.shop.list[0].nova"),4);
  X("S.shop.list[0].checked=true;S.shop.list[0].rayon='epicerie'");X('validateCourses()');
  eq(X("S.waiting.length"),1,'a ranger');eq(X("S.waiting[0].nova"),4);
  X("_waitRef=S.waiting[0].id;_waitCat='placards';_waitMacMode='100';_macSrc.wait='auto'");docEl('wait-qty').value='300';docEl('wait-unit').value='g';docEl('wait-present').checked=false;docEl('wait-pkg-on').checked=false;docEl('wait-dlc').value='';X('confirmWaitPlace()');
  eq(X("Object.values(S.inv).flat().filter(function(i){return i.name==='Biscuits'})[0].nova"),4);
});
t('ajout d\'article par scan : classement garde',async()=>{
  X("S.inv={frigo:[],congelateur:[],placards:[],epices:[]}");X("openAddItem('placards')");
  const vrai=sb.fetch;sb.fetch=offNova(4);
  try{X("_scanMode='inv'");await X('lookupBarcode')('3017620422003');}finally{sb.fetch=vrai;}
  if(docEl('ai-mnote').textContent.indexOf('très transformé')<0)throw new Error('note');
  docEl('ai-qty').value='200';X('confirmAddItem()');
  eq(X("S.inv.placards.filter(function(i){return i.name==='Biscuits'})[0].nova"),4);
  X("openAddItem('placards')");eq(X('_novaAjout'),null,'remis a zero a l\'ouverture');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
