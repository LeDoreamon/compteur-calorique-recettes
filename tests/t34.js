const {sb}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const fusion=G('_addOrMergeInv');
const j=n=>sb.shiftDate(sb.getToday(),n);

function inv(dlcExistante,qty){
  S.inv={frigo:[{id:'v',name:'Crème fraîche légère',qty:(qty===undefined?200:qty),unit:'g',
    dlc:dlcExistante,mac100:{kcal:167,prot:2.8,gluc:5,lip:15}}],
    placards:[],congelateur:[],epices:[]};
}
const neuf=(dlc)=>({id:'cx_new',name:'Crème fraîche légère',qty:400,unit:'g',dlc:dlc,
  mac100:{kcal:167,prot:2.8,gluc:5,lip:15},urgent:0});

console.log('\n=== DY. Ranger un article deja present ===');
t('*** une date perimee ne remplace plus la date saisie ***',()=>{
  inv(j(-30));                       // ancien lot perime depuis un mois
  fusion('frigo',neuf(j(20)));       // nouveau lot, DLC dans 20 jours
  eq(sb.findItem('v').dlc,j(20),'la date saisie doit etre conservee');
});
t('*** l\'article n\'est plus signale comme perime aussitot ***',()=>{
  inv(j(-30));fusion('frigo',neuf(j(20)));
  const d=sb.invIssues();
  if((d.expires||[]).some(x=>x.it.id==='v'))throw new Error('encore signale perime');
});
t('deux dates valides : la plus proche est gardee',()=>{
  inv(j(15));fusion('frigo',neuf(j(40)));
  eq(sb.findItem('v').dlc,j(15),'la plus proche doit primer');
});
t('la nouvelle date gagne si elle est plus proche',()=>{
  inv(j(40));fusion('frigo',neuf(j(15)));
  eq(sb.findItem('v').dlc,j(15));
});
t('article sans date existante : la saisie est prise',()=>{
  inv(null);fusion('frigo',neuf(j(25)));
  eq(sb.findItem('v').dlc,j(25));
});
t('date du jour : consideree comme encore valable',()=>{
  inv(j(0));fusion('frigo',neuf(j(30)));
  eq(sb.findItem('v').dlc,j(0),'aujourd\'hui n\'est pas depasse');
});
t('les deux perimees : la saisie l\'emporte',()=>{
  inv(j(-30));fusion('frigo',neuf(j(-2)));
  eq(sb.findItem('v').dlc,j(-2));
});
t('aucune date saisie : l\'ancienne est conservee',()=>{
  inv(j(-30));
  fusion('frigo',{id:'x',name:'Crème fraîche légère',qty:400,unit:'g',mac100:{kcal:167,prot:2.8,gluc:5,lip:15}});
  eq(sb.findItem('v').dlc,j(-30),'sans nouvelle date, on ne touche a rien');
});

console.log('\n=== DZ. Le reste de la fusion est intact ===');
t('les quantites s\'additionnent',()=>{
  inv(j(20),200);fusion('frigo',neuf(j(25)));
  eq(sb.findItem('v').qty,600,'200 + 400');
});
t('un stock illimite le reste',()=>{
  inv(j(20),null);fusion('frigo',neuf(j(25)));
  eq(sb.findItem('v').qty,null);
});
t('aucun doublon n\'est cree',()=>{
  inv(j(20));fusion('frigo',neuf(j(25)));
  eq(S.inv.frigo.length,1);
});
t('un article different est bien ajoute',()=>{
  inv(j(20));
  fusion('frigo',{id:'a',name:'Beurre',qty:250,unit:'g',mac100:{kcal:750,prot:1,gluc:1,lip:82}});
  eq(S.inv.frigo.length,2);
});
t('la comparaison de noms ignore casse et accents',()=>{
  inv(j(20));
  fusion('frigo',{id:'b',name:'CREME FRAICHE LEGERE',qty:100,unit:'g',mac100:{kcal:167,prot:2.8,gluc:5,lip:15}});
  eq(S.inv.frigo.length,1,'doublon cree malgre le meme nom');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
