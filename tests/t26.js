const {sb}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const qtyLabel=G('qtyLabel');
const src=fs.readFileSync('index.html','utf8');

console.log('\n=== CP. Libelle de quantite ===');
t('*** un article en pieces n\'affiche plus de fraction de paquet ***',()=>{
  const s=qtyLabel({qty:12,unit:'pc',pieceG:100,pkg:{size:100}});
  eq(s,'12 pc');
  if(/×/.test(s))throw new Error('fraction affichee : '+s);
});
t('idem pour « pcs » et autres unites denombrables',()=>{
  ['pcs','pc','boîtes','sachets'].forEach(function(u){
    const s=qtyLabel({qty:6,unit:u,pkg:{size:100}});
    if(/×/.test(s))throw new Error(u+' : '+s);
  });
});
t('*** un article au poids garde son compte de paquets ***',()=>{
  eq(qtyLabel({qty:400,unit:'g',pkg:{size:100}}),'400 g · 4×100g');
});
t('les millilitres aussi',()=>{
  eq(qtyLabel({qty:3000,unit:'ml',pkg:{size:1000}}),'3000 ml · 3×1000ml');
});
t('fraction affichee proprement au poids',()=>{
  eq(qtyLabel({qty:350,unit:'g',pkg:{size:100}}),'350 g · 3.5×100g');
});
t('stock illimite',()=>eq(qtyLabel({qty:null,unit:'g'}),'présent'));
t('sans emballage, libelle simple',()=>eq(qtyLabel({qty:250,unit:'g'}),'250 g'));

console.log('\n=== CQ. Nettoyage des emballages orphelins ===');
t('*** un pkg sur un article en pieces est retire au chargement ***',()=>{
  sb._applyState({inv:{frigo:[{id:'c',name:'Compotes',qty:12,unit:'pc',pkg:{size:100},
    macPiece:{kcal:51,prot:0.5,gluc:12,lip:0.5}}]},dayMeals:{}});
  const it=sb.findItem('c');
  if(it.pkg)throw new Error('pkg encore present');
});
t('*** le poids par piece est preserve au passage ***',()=>{
  sb._applyState({inv:{frigo:[{id:'r',name:'Ramen',qty:2,unit:'pcs',pkg:{size:100},
    mac100:{kcal:450,prot:9,gluc:60,lip:20}}]},dayMeals:{}});
  const it=sb.findItem('r');
  eq(it.pieceG,100,'pieceG repris');
  eq(Math.round(sb.itemMealMacros(it,1).kcal),450,'macros intactes');
});
t('un pieceG existant n\'est pas ecrase',()=>{
  sb._applyState({inv:{frigo:[{id:'x',name:'X',qty:2,unit:'pcs',pieceG:55,pkg:{size:100},
    mac100:{kcal:100,prot:1,gluc:1,lip:1}}]},dayMeals:{}});
  eq(sb.findItem('x').pieceG,55);
});
t('*** un emballage legitime au poids est conserve ***',()=>{
  sb._applyState({inv:{frigo:[{id:'g',name:'Soupe',qty:3000,unit:'ml',pkg:{size:1000},
    mac100:{kcal:40,prot:1,gluc:5,lip:2}}]},dayMeals:{}});
  const it=sb.findItem('g');
  if(!it.pkg)throw new Error('emballage supprime a tort');
  eq(it.pkg.size,1000);
});
t('inventaire vide ou casse : pas de plantage',()=>{
  sb._applyState({inv:null,dayMeals:{}});
  sb._applyState({inv:{frigo:[null,{id:'z'}]},dayMeals:{}});
});

console.log('\n=== CR. Jours restants avant la DLC ===');
t('*** le badge compte des jours de calendrier ***',()=>{
  if(/Math\.round\(\(new Date\(dlc\)-new Date\(\)\)/.test(src))
    throw new Error('compte encore a partir de l\'instant present');
  if(!/new Date\(dlc\)-new Date\(getToday\(\)\)/.test(src))
    throw new Error('formule non alignee');
});
t('la liste des DLC proches suit la meme regle',()=>{
  if(/new Date\(e\)-new Date\(\)\)/.test(src))throw new Error('non alignee');
});
t('*** badge et fiche donnent le meme nombre ***',()=>{
  const dlc=sb.shiftDate(S.today,106);
  const st=G('getDlcStatus')(dlc);
  const attendu=Math.round((new Date(dlc)-new Date(sb.getToday()))/864e5);
  eq(attendu,106,'reference');
  const n=(st&&(st.days!==undefined?st.days:st.d));
  if(n!==undefined&&n!==106)throw new Error('badge : '+n);
});
t('une date du jour donne zero',()=>{
  eq(Math.round((new Date(S.today)-new Date(sb.getToday()))/864e5),0);
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');

console.log('\n=== CS. Tableaux troues venus de Firebase ===');
t('*** un article null ne fait plus planter le rendu ***',()=>{
  sb._applyState({inv:{frigo:[null,{id:'ok',name:'Poulet',qty:100,unit:'g',
    mac100:{kcal:120,prot:23,gluc:0,lip:2}},null]},dayMeals:{}});
  S.mainTab='inventory';
  sb.render();
  const n=(S.inv.frigo||[]).length;
  eq(n,1,'seul l article valide subsiste');
});
t('un article sans identifiant est ecarte aussi',()=>{
  sb._applyState({inv:{frigo:[{name:'Sans id'},{id:'v',name:'Valide',qty:1,unit:'g',
    mac100:{kcal:1,prot:0,gluc:0,lip:0}}]},dayMeals:{}});
  eq((S.inv.frigo||[]).length,1);
});
t('*** plus aucun null dans aucune categorie ***',()=>{
  sb._applyState({inv:{frigo:[null],placards:[null],congelateur:[null],epices:[null]},dayMeals:{}});
  Object.keys(S.inv||{}).forEach(function(c){
    const arr=S.inv[c]||[];
    if(arr.some(function(x){return !x||!x.id;}))throw new Error(c+' contient encore un trou');
  });
  sb.render();   // ne doit pas plantera
});
console.log('\n---- total '+pass+' ok, '+fail+' KO ----');
