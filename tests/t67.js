const {sb,docEl}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
function prepa(){
  X(`_loaded=true;S.today='2026-09-26';S.displayDate=S.today;S.dayMeals={};S.shop={list:[],graveyard:[]};S.pasRacheter={};
  S.inv={frigo:[
    {id:'fb',name:'Fromage blanc 0%',qty:1200,unit:'g',mac100:{kcal:61,prot:6.5,gluc:7.8,lip:0.5,fib:0.2}},
    {id:'oe',name:'Oeufs',qty:6,unit:'pcs',pieceG:55,macPiece:{kcal:72,prot:6.3,gluc:0.4,lip:4.8,fib:0}}],
   congelateur:[],placards:[{id:'su',name:'Sucre blanc',qty:500,unit:'g',mac100:{kcal:387,prot:0,gluc:99.9,lip:0,fib:0}}],epices:[]};`);
}
function remplir(nom,parts){
  X(`ouvrirPreparerPlat();_plat.ings=[{id:'fb',name:'Fromage blanc 0%',qty:800},{id:'oe',name:'Oeufs',qty:3},{id:'su',name:'Sucre blanc',qty:100},
     {id:null,name:'Spéculoos',qty:200,m100:{kcal:480,prot:6,gluc:72,lip:18,fib:2}}];_plat.parts=${parts};`);
  docEl('plat-nom').value=nom;docEl('plat-dlc').value='2026-09-30';docEl('plat-dessert').checked=true;
}
const plat=()=>X("S.inv.frigo.find(function(i){return i.plat;})");
console.log('\n=== XVII. Plats maison ===');
t('*** la fenetre explique la fonction et le plat entier ***',()=>{
  prepa();X('ouvrirPreparerPlat()');const h=docEl('plat-overlay').innerHTML;
  ['Comment ça marche','retirés du stock','parts','Pas besoin de peser','Plats maison','ne compte pas dans ta journée','Mon inventaire','jamais ajouté aux courses','Plat entier'].forEach(x=>{
    if(h.toLowerCase().indexOf(x.toLowerCase())<0)throw new Error(x+' absent');});
});
t('*** creer : stock deduit, plat en parts, rien de compte dans la journee ***',async()=>{
  prepa();remplir('Cheesecake',8);await X('creerPlat()');
  eq(X("findItem('fb').qty"),400);eq(X("findItem('oe').qty"),3);eq(X("findItem('su').qty"),400);
  const p=plat();if(!p)throw new Error('plat absent');
  eq(p.name,'Cheesecake');eq(p.qty,8);eq(p.unit,'parts');eq(p.dessert,true);eq(p.dlc,'2026-09-30');
  // total : 488 + 216 + 387 + 960 = 2051 kcal ; poids 800+165+100+200 = 1265 g
  eq(p.macPiece.kcal,Math.round(2051/8));eq(p.pieceG,Math.round(1265/8));eq(p.plat.parts,8);eq(p.plat.poidsEstime,1265);
  eq(p.mac100.kcal,Math.round(2051/1265*100));
  if(typeof p.macPiece.fib!=='number')throw new Error('fibres perdues');
  eq(Object.keys(X('S.dayMeals')).length,0,'repas compte a la preparation');
});
t('*** manger une part ou des grammes ***',()=>{
  const p=plat();eq(X("itemMealMacros(findItem('"+p.id+"'),1).kcal"),p.macPiece.kcal);
  X("_invPick={};_invPickG={};_invPickG['"+p.id+"']=true;invPickQtyPlat('"+p.id+"',"+p.pieceG*2+")");
  eq(Math.round(X("_invPick['"+p.id+"']")*10)/10,2,'grammes convertis en parts');
});
t('*** jamais aux courses ni au diagnostic, meme fini ***',()=>{
  const p=plat();X("findItem('"+p.id+"').qty=0");
  eq(X('_stockBas')(plat()),null);
  if(X('shopSuggestions()').some(s=>s.name==='Cheesecake'))throw new Error('propose aux courses');
  const d=X('invIssues()');if(JSON.stringify(d).indexOf('Cheesecake')>=0)throw new Error('dans le diagnostic');
  X("findItem('"+p.id+"').qty=8");
});
t('*** affiche a part (Plats maison), pas dans la liste du frigo ***',()=>{
  X("S.openCat={frigo:true}");
  if(X('renderInvCats()').indexOf('Cheesecake')>=0)throw new Error('dans le frigo');
  const h=X('renderPlatsMaison()');if(h.indexOf('Cheesecake')<0||h.indexOf('8 parts')<0)throw new Error('absent de Plats maison');
  if(h.indexOf('rgba(233,161,59')<0)throw new Error('pas de couleur distincte');
  eq(X('qtyLabel(findItem("'+plat().id+'"))'),'8 parts');
});
t('*** fini : masque 3 jours puis retire, une part rendue le fait revenir ***',()=>{
  const id=plat().id;X("findItem('"+id+"').qty=0;_nettoyerPlats()");
  eq(plat().plat.finiLe,'2026-09-26');if(X('renderPlatsMaison()').indexOf('Cheesecake')>=0)throw new Error('encore affiche');
  X("findItem('"+id+"').qty=1;_nettoyerPlats()");eq(plat().plat.finiLe,undefined,'retour non pris en compte');
  X("findItem('"+id+"').qty=0;_nettoyerPlats();S.today='2026-09-28';_nettoyerPlats()");if(!plat())throw new Error('retire trop tot');
  X("S.today='2026-09-29';_nettoyerPlats()");if(plat())throw new Error('pas retire');
  eq(X('S.shop.graveyard.length'),0,'passe par Deja achetes');
});
t('plus que le stock : on demande, et rien ne bouge si on refuse',async()=>{
  prepa();remplir('Lasagnes',6);X("_plat.ings[0].qty=5000");const vrai=sb.confirm;sb.confirm=()=>false;
  try{await X('creerPlat()');}finally{sb.confirm=vrai;}
  eq(X("findItem('fb').qty"),1200);if(plat())throw new Error('plat cree');
});
t('erreurs claires : sans nom, sans ingredient',async()=>{
  prepa();X('ouvrirPreparerPlat()');docEl('plat-nom').value='';await X('creerPlat()');if(!/nom/.test(X('_plat.err')))throw new Error('nom');
  docEl('plat-nom').value='Chili';await X('creerPlat()');if(!/ingrédient/.test(X('_plat.err')))throw new Error('ingredient');
});
t('ingredient hors stock estime par l\'IA',async()=>{
  prepa();X('ouvrirPreparerPlat()');const vrai=sb.callAI,vraiK=sb.getApiKey;
  sb.callAI=async()=>({content:[{type:'text',text:'{"kcal":480,"prot":6,"gluc":72,"lip":18,"fib":2.1}'}],empty:false});
  X("getApiKey=function(){return 'gsk_x';}");
  docEl('plat-l-nom').value='Spéculoos';docEl('plat-l-q').value='200';['kcal','prot','gluc','lip'].forEach(k=>docEl('plat-l-'+k).value='');
  try{await X('ajouterIngLibrePlat()');}finally{sb.callAI=vrai;X("getApiKey=function(){return localStorage.getItem('anthropic_key')||'';}");}
  const g=X('_plat.ings[0]');eq(g.name,'Spéculoos');eq(g.m100.kcal,480);eq(g.m100.fib,2.1);eq(g.id,null);
});
t('accessible depuis le menu + et l\'onglet Inventaire',()=>{
  if(!/onclick="fermerMenuAjout\(\);ouvrirPreparerPlat\(\)"/.test(src))throw new Error('menu +');
  if(X('renderPlatsMaison()').indexOf('ouvrirPreparerPlat()')<0)throw new Error('inventaire');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
