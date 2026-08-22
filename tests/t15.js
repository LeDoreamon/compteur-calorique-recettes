const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu "'+b+'" obtenu "'+a+'"');}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const titre=G('titreDepuisInventaire');

// Inventaire proche du vrai
S.inv={
 congelateur:[
  {id:'poulet',name:'Aiguillettes de poulet',unit:'g',qty:2800,mac100:{kcal:165,prot:31,gluc:0,lip:3.6}},
  {id:'boeuf',name:'Boeuf haché (450g à 5% MG)',unit:'g',qty:1050,mac100:{kcal:125,prot:20,gluc:0.5,lip:5}},
  {id:'oignons',name:'Oignons émincés',unit:'g',qty:540,mac100:{kcal:40,prot:1.1,gluc:9,lip:0.1}}],
 frigo:[
  {id:'fb',name:'Fromage blanc 0% nature ou parfumé',unit:'g',qty:700,mac100:{kcal:61,prot:6.5,gluc:7.8,lip:0.5}},
  {id:'rape',name:'Fromage râpé',unit:'g',qty:250,mac100:{kcal:342,prot:25,gluc:2,lip:26}},
  {id:'oeufs',name:'Oeufs',unit:'pcs',qty:10,macPiece:{kcal:78,prot:6.5,gluc:0.6,lip:5.5}},
  {id:'soupe',name:'Soupe - Potiron et Kiri',unit:'ml',qty:3300,mac100:{kcal:40,prot:0.8,gluc:4.9,lip:1.6}}],
 placards:[
  {id:'riz',name:'Riz',unit:'g',qty:null,mac100:{kcal:350,prot:7,gluc:78,lip:1}},
  {id:'huile',name:"Huile d'olive",unit:'ml',qty:null,mac100:{kcal:900,prot:0,gluc:0,lip:100}},
  {id:'soja',name:'Sauce soja sucrée',unit:'ml',qty:1010,mac100:{kcal:55,prot:5,gluc:7,lip:0}}],
 epices:[
  {id:'curry',name:'Curry',unit:'',qty:null,mac100:{kcal:170,prot:3.5,gluc:34.5,lip:9.5}},
  {id:'sesame',name:'Sésame doré',unit:'',qty:null,mac100:{kcal:573,prot:18.6,gluc:4.7,lip:49.9}}]};
const L=(id,qty,unit)=>({id:id,name:sb.findItem(id).name,qty:qty,unit:unit||'g',src:'pick'});

console.log('\n=== AX. Titres de base ===');
t('un seul ingredient',()=>eq(titre([L('poulet',200)]),'Aiguillettes de poulet'));
t('deux ingredients, le plus calorique en tete',()=>{
  // poulet 200g=330 kcal, riz 80g=280 kcal
  eq(titre([L('riz',80),L('poulet',200)]),'Aiguillettes de poulet & riz');
});
t('trois ingredients',()=>{
  // poulet 330, riz 280, oignons 60g=24 -> sous 8% ? total 634, 8%=51 -> exclu
  const r=titre([L('poulet',200),L('riz',80),L('oignons',150)]);
  eq(r,'Aiguillettes de poulet, riz & oignons émincés');
});
t('liste vide',()=>eq(titre([]),''));
t('entree nulle ne casse pas',()=>{titre(null);titre(undefined);});

console.log('\n=== AY. Nettoyage des noms ===');
t('*** les parentheses disparaissent ***',()=>{
  eq(titre([L('boeuf',150)]),'Boeuf haché');
});
t('*** "ou ..." est coupe ***',()=>{
  eq(titre([L('fb',250)]),'Fromage blanc 0% nature');
});
t('le tiret devient une espace',()=>{
  eq(titre([L('soupe',400,'ml')]),'Soupe Potiron et Kiri');
});
t('un nom tres long est tronque sur un mot',()=>{
  S.inv.frigo.push({id:'longg',name:'Preparation culinaire au saumon fume et aneth frais',unit:'g',qty:200,mac100:{kcal:200,prot:20,gluc:0,lip:12}});
  const r=titre([L('longg',100)]);
  if(r.length>27)throw new Error('trop long : '+r.length+' -> '+r);
  if(/\s$/.test(r))throw new Error('espace finale');
  S.inv.frigo.pop();
});

console.log('\n=== AZ. Assaisonnements ecartes ===');
t('*** les epices n\'entrent pas dans le titre ***',()=>{
  const r=titre([L('poulet',200),L('riz',80),L('curry',6,'')]);
  if(/curry/i.test(r))throw new Error(r);
});
t('*** l\'huile n\'entre pas dans le titre ***',()=>{
  // 10 ml d'huile = 90 kcal, plus que les oignons, mais ca reste un assaisonnement
  const r=titre([L('poulet',200),L('riz',80),L('huile',10,'ml')]);
  if(/huile/i.test(r))throw new Error(r);
  eq(r,'Aiguillettes de poulet & riz');
});
t('la sauce soja est ecartee',()=>{
  const r=titre([L('poulet',200),L('riz',80),L('soja',25,'ml')]);
  if(/soja/i.test(r))throw new Error(r);
});
t('*** mais un assaisonnement dominant reste ***',()=>{
  // que de l'huile : il ne reste rien d'autre a nommer
  const r=titre([L('huile',20,'ml')]);
  if(!r)throw new Error('titre vide');
  if(!/huile/i.test(r))throw new Error(r);
});
t('un ingredient marginal est ecarte',()=>{
  // oignons 20g = 8 kcal face a 330+280 : sous le seuil de 8%
  const r=titre([L('poulet',200),L('riz',80),L('oignons',20)]);
  if(/oignons/i.test(r))throw new Error(r);
});

console.log('\n=== BA. Forme du titre ===');
t('la premiere lettre est en majuscule',()=>{
  const r=titre([L('riz',100)]);
  eq(r.charAt(0),r.charAt(0).toUpperCase());
});
t('les ingredients suivants passent en minuscule',()=>{
  const r=titre([L('poulet',200),L('riz',80)]);
  if(!/& riz$/.test(r))throw new Error(r);
});
t('on retombe a deux noms si trois deborderaient',()=>{
  const r=titre([L('poulet',200),L('fb',300),L('soupe',600,'ml')]);
  if(r.length>52)throw new Error('trop long : '+r.length+' -> '+r);
});
t('les pieces sont comptees correctement',()=>{
  // 3 oeufs = 234 kcal, plus que 50 g de riz (175)
  eq(titre([L('oeufs',3,'pcs'),L('riz',50)]),'Oeufs & riz');
});
t('jamais de undefined ni NaN',()=>{
  const r=titre([L('poulet',200),L('oeufs',2,'pcs'),L('riz',80),L('curry',5,'')]);
  if(/undefined|NaN/.test(r))throw new Error(r);
});
t('un article inconnu ne casse rien',()=>{
  const r=titre([{id:'fantome',name:'Article fantome',qty:100,unit:'g'},L('poulet',200)]);
  if(/undefined/.test(r))throw new Error(r);
});

console.log('\n=== BB. Integration dans le formulaire ===');
const invAddMeal=G('invAddMeal');
function composer(sel){
  sb.openAddMeal('text');invAddMeal();
  Object.keys(sel).forEach(k=>sb.invPickQty(k,sel[k]));
  sb.applyInvPick();
  return docEl('addmeal-name').value;
}
t('*** le nom se remplit tout seul ***',()=>{
  eq(composer({poulet:200,riz:80}),'Aiguillettes de poulet & riz');
});
t('*** un nom saisi a la main n\'est pas ecrase ***',()=>{
  sb.openAddMeal('text');invAddMeal();
  docEl('addmeal-name').value='Mon plat du dimanche';
  sb.invPickQty('poulet',200);sb.applyInvPick();
  eq(docEl('addmeal-name').value,'Mon plat du dimanche');
});
function hydrate(cid){
  const h=docEl(cid).innerHTML||'';const re=/<input\b([^>]*)>/g;let m;
  while((m=re.exec(h))){
    const a=m[1];const id=(a.match(/id="([^"]+)"/)||[])[1];if(!id)continue;
    const el=docEl(id);const v=(a.match(/value="([^"]*)"/)||[])[1];
    if(v!==undefined)el.value=v;el.checked=/\bchecked\b/.test(a);
  }
}
t('*** un titre auto est remplace si la selection change ***',()=>{
  sb.openAddMeal('text');invAddMeal();
  sb.invPickQty('poulet',200);sb.applyInvPick();
  const t1=docEl('addmeal-name').value;
  eq(t1,'Aiguillettes de poulet','titre initial');
  hydrate('inv-items-section');       // le vrai DOM garde les cases cochees
  sb.openInvPick();sb.invPickQty('riz',80);sb.applyInvPick();
  const t2=docEl('addmeal-name').value;
  if(t1===t2)throw new Error('titre non actualise');
  eq(t2,'Aiguillettes de poulet & riz','titre actualise');
});
t('selection vide : pas de titre pose',()=>{
  sb.openAddMeal('text');invAddMeal();
  sb.applyInvPick();
  eq(docEl('addmeal-name').value,'');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
