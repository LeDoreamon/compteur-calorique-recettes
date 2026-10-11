// Recettes perso : ingredients entre crochets ; mots generiques ; conversion (11/10/2026)
const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+'\n attendu '+b+'\n obtenu  '+a);}
const X=c=>vm.runInContext(c,sb);
const INV=require('./data/inv.json');const fr=[];
Object.values(INV).forEach(it=>{const o={id:it.id,name:it.n,unit:it.u,qty:(it.q===-1?null:it.q)};fr.push(o);});
sb.S.inv={frigo:fr.map(o=>Object.assign({},o)),placards:[],congelateur:[],epices:[]};
const lisible=h=>h.replace(/<mark class="ing-hl">/g,'[').replace(/<\/mark>/g,']');
const aff=(r,s,cr)=>lisible(X('_etapeSurlignee')(X('_ingRecette')(r),s,cr));
const sweet=()=>({id:'cust_sweet',custom:true,name:'Sweet chicken',profile:X('ACTIVE_PROFILE'),
  used:[{id:'soja',n:'Sauce soja sucrée',qty:20},{id:'miel',n:'Miel liquide',qty:10},{id:'cx_mqwkfekl',n:'Aiguillettes de poulet',qty:200}],
  steps:['Mélanger la sauce soja et le miel dans un bol.','Saisir les aiguillettes, verser la sauce et laisser la sauce s\'épaissir 3 min.']});

console.log('\n=== LXI. Recettes perso : seuls les passages entre crochets sont des ingredients ===');
t('*** « laisser la sauce s\'épaissir » reste du texte ; « [sauce soja] » devient le nom exact ***',()=>{
  const r=sweet();
  eq(aff(r,'Laisser la sauce s\'épaissir, puis ajouter la [sauce soja].',true),'Laisser la sauce s\'épaissir, puis ajouter la [sauce soja sucrée].');
});
t('*** sans crochets, rien n\'est surligne ni reecrit dans une recette perso ***',()=>{
  eq(aff(sweet(),'Mélanger la sauce soja et le miel.',true),'Mélanger la sauce soja et le miel.');
});
t('crochets autour d\'un aliment hors de la liste : surligne tel quel, crochets retires',()=>{
  eq(aff(sweet(),'Ajouter le [jus de citron].',true),'Ajouter le [jus de citron].');
  if(/\[\[|\]\]/.test(X('_etapeSurlignee')([],'a [b] c',true)))throw new Error('crochets restes');
  eq(X('_etapeSurlignee')([],'Cuire [riz] 10 min',true),'Cuire <mark class="ing-hl">riz</mark> 10 min');
});
t('*** l\'affichage d\'une recette perso passe en mode crochets ***',()=>{
  const r=sweet();r.steps=['Laisser la sauce s\'épaissir avec le [miel].'];X('RCP').push(r);X("S.openRec='cust_sweet'");
  try{const h=X("renderCard(RCP.find(function(x){return x.id==='cust_sweet'}))");
    if(h.indexOf('Laisser la sauce s\'épaissir avec le <mark class="ing-hl">miel liquide</mark>.')<0)throw new Error(h.slice(h.indexOf('épaissir')-60,h.indexOf('épaissir')+120));}
  finally{X("S.openRec=null");X("RCP.splice(RCP.findIndex(function(x){return x.id==='cust_sweet'}),1)");}
});

console.log('\n=== LXII. Reperage automatique (catalogue, IA) : plus de faux amis ===');
t('*** « la sauce » seule n\'est plus prise pour la sauce soja ***',()=>{
  const r=sweet();r.custom=false;
  eq(aff(r,'Verser la sauce et laisser réduire.'),'Verser la sauce et laisser réduire.');
  eq(aff(r,'Déglacer avec la sauce soja.'),'Déglacer avec la [sauce soja sucrée].');
});
t('*** « la pâte » (preparation) n\'est pas les pâtes ; « les pâtes » le restent ***',()=>{
  const r={id:'x',used:[{id:'pates_blanches',n:'Pâtes blanches',qty:75}],steps:[]};
  eq(aff(r,'Étaler la pâte.'),'Étaler la pâte.');
  eq(aff(r,'Lancer 75 g de pâtes.'),'Lancer 75 g de [pâtes blanches].');
});
t('*** « gnocchis à sec » : le « à » n\'est plus avale (« [Gnocchi à poêler] sec ») ***',()=>{
  const r={id:'x',used:[{id:'cx_mtot8zeh',n:'Gnocchi à poêler',qty:180}],steps:[]};
  eq(aff(r,'Poêler 180 g de gnocchis à sec, 6 min.'),'Poêler 180 g de [gnocchi à poêler] à sec, 6 min.');
});
t('les petits mots qui menent a un mot du nom sont toujours pris (« pâtes 21 g de protéines »)',()=>{
  const r={id:'x',used:[{id:'cx_mtou24qu',n:'pâtes 21 g protein',qty:70}],steps:[]};
  eq(aff(r,'Lancer 70 g de pâtes 21 g de protéines.'),'Lancer 70 g de [pâtes 21 g protein].');
});

console.log('\n=== LXIII. Conversion des recettes perso existantes (migration 2) ===');
t('*** crochets ajoutes autour des ingredients, texte inchange, jamais autour de « la sauce » ***',()=>{
  const r=sweet();X('S.customRecipes=[]');X('S.customRecipes').push(r);
  X('_migrerSchema(1)');
  eq(r.steps.join(' | '),'Mélanger la [sauce soja] et le [miel] dans un bol. | Saisir les [aiguillettes], verser la sauce et laisser la sauce s\'épaissir 3 min.');
  eq(r.steps.join(' | ').replace(/[\[\]]/g,''),sweet().steps.join(' | '),'texte d\'origine');
  eq(X('S.schema'),2);
});
t('une seule fois : recette deja en crochets ou version deja atteinte, rien ne bouge',()=>{
  const r=sweet();r.steps=['Ajouter la [sauce soja] et le miel.'];X('S.customRecipes=[]');X('S.customRecipes').push(r);
  X('_migrerSchema(1)');eq(r.steps[0],'Ajouter la [sauce soja] et le miel.','recette deja convertie');
  const r2=sweet();X('S.customRecipes').push(r2);X('_migrerSchema(2)');eq(r2.steps[0],sweet().steps[0],'migration rejouee');
});
t('les recettes du catalogue et de l\'IA ne sont pas touchees',()=>{
  const r=sweet();r.custom=false;r.ai=true;X('S.customRecipes=[]');X('S.customRecipes').push(r);
  X('_migrerSchema(1)');eq(r.steps[0],sweet().steps[0]);
});
t('*** editeur : la pastille insere l\'ingredient entre crochets, l\'aide l\'explique ***',()=>{
  X("openCustRec(null,{name:'Test',rows:[{id:'soja',name:'Sauce soja sucrée',qty:20}]})");
  if(docEl('cr-inserer').innerHTML.indexOf('entre crochets')<0)throw new Error('aide absente');
  const ta=docEl('cr-steps');ta.value='Verser ';ta.selectionStart=ta.selectionEnd=7;
  X('crInsererIng(0)');eq(ta.value,'Verser [sauce soja sucrée]');
  X('closeCustRec()');
});

console.log('\n=== LXIV. Recettes perso modifiees ou supprimees ailleurs ===');
t('*** apres un rechargement, la liste affichee montre la nouvelle version et plus la recette supprimee ***',()=>{
  const st=o=>Object.assign({_profile:X('ACTIVE_PROFILE'),schema:2,inv:{frigo:fr,placards:[],congelateur:[],epices:[]},dayMeals:{}},o);
  const a={id:'cust_a',custom:true,name:'Avant',steps:['x'],used:[]},b={id:'cust_b',custom:true,name:'Supprimee ailleurs',steps:['y'],used:[]};
  sb.__d=st({customRecipes:[a,b]});X('_applyState(__d)');
  sb.__d=st({customRecipes:[Object.assign({},a,{name:'Apres'})]});X('_applyState(__d)');
  const l=X('RCP').filter(r=>/^cust_[ab]$/.test(r.id)).map(r=>r.name).join(',');
  eq(l,'Apres');
});

(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
