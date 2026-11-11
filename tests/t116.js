// Repas habituels (11/11/2026, rapport de Liam : « Yaourts 0% fruits » propose alors qu'il n'en restait plus)
const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const repas=(nom,k,plus)=>Object.assign({name:nom,slot:'snack',macros:{kcal:k,prot:5,gluc:10,lip:1}},plus||{});
const prepa=(qYaourt)=>{X(`S.inv={frigo:[{id:'ya',name:'Yaourts 0% fruits',qty:${qYaourt},unit:'pcs',macPiece:{kcal:70,prot:5,gluc:10,lip:0}},
  {id:'sel',name:'Sel',qty:null,unit:'g'}],congelateur:[],placards:[],epices:[]};S.dayMeals={};S.ingNames={};`);
  sb.__m=[repas('Yaourts 0% fruits',70,{ings:[{id:'ya',qty:1,n:'Yaourts 0% fruits'}]}),repas('Clear Whey',90),repas('Salade salée',200,{ings:[{id:'sel',qty:2,n:'Sel'}]})];
  X("S.dayMeals[shiftDate(S.today,-1)]=JSON.parse(JSON.stringify(__m));S.dayMeals[shiftDate(S.today,-2)]=[JSON.parse(JSON.stringify(__m[0]))];");};
const noms=()=>X('_repasHabituels(6)').map(x=>x.nom).join();

console.log('\n=== LXXXIX. Repas habituels : seulement ceux que le stock permet ===');
t('en stock : le repas est propose (le plus frequent d\'abord)',()=>{
  prepa(4);eq(noms(),'Yaourts 0% fruits,Clear Whey,Salade salée');
});
t('*** article epuise : le repas n\'est plus propose ; hors inventaire et stock illimite restent ***',()=>{
  prepa(0);eq(noms(),'Clear Whey,Salade salée');
});
t('*** article supprime de l\'inventaire : plus propose non plus ; rachete sous le meme nom : il revient ***',()=>{
  prepa(4);X("S.inv.frigo=S.inv.frigo.filter(i=>i.id!=='ya')");eq(noms(),'Clear Whey,Salade salée');
  X("S.inv.frigo.push({id:'ya2',name:'Yaourts 0% fruits',qty:8,unit:'pcs'})");eq(noms(),'Yaourts 0% fruits,Clear Whey,Salade salée');
});
t('pas assez pour la quantite du repas : pas propose',()=>{
  prepa(1);X("S.dayMeals[shiftDate(S.today,-1)][0].ings[0].qty=2");
  eq(X('_repasHabituels(6)').some(x=>x.nom==='Yaourts 0% fruits'&&x.jour===X('shiftDate(S.today,-1)')),false);
});
t('extra ou dessert de l\'inventaire epuise : pas propose',()=>{
  prepa(0);X("S.dayMeals={};S.dayMeals[shiftDate(S.today,-1)]=[{name:'Bol',slot:'lunch',macros:{kcal:500,prot:30,gluc:50,lip:10},extras:[{id:'ya',qty:1,name:'Yaourts 0% fruits',kcal:70}]}]");
  eq(noms(),'');X("S.inv.frigo[0].qty=3");eq(noms(),'Bol');
  eq(X("_repasRefaisable(null)"),false);
});
t('*** le menu + ne montre plus le repas epuise ; les places liberees vont aux suivants ***',()=>{
  prepa(0);X("for(var i=0;i<7;i++)S.dayMeals[shiftDate(S.today,-1)].push({name:'Plat '+i,slot:'lunch',macros:{kcal:300+20*i,prot:20,gluc:10,lip:5}})");
  eq(X('_repasHabituels(6)').length,6);
  X('ouvrirMenuAjout()');const h=docEl('menu-ajout-corps').innerHTML;
  if(h.indexOf('Refaire un repas habituel')<0)throw new Error('liste absente');
  if(h.indexOf('Yaourts 0% fruits')>=0)throw new Error('repas epuise encore propose');
});

(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' -> '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
