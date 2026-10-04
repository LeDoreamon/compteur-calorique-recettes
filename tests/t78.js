const {sb}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
function etat(extra){return Object.assign({catalogue:'liam',shopSeeded:true,progMigre:true,dupMerged:true,fibInv:true,epicesFix2:true,dayMeals:{},
  inv:{frigo:[{id:'pa1',name:'Parmigiano Reggiano DOP En copeaux',qty:0,unit:'g'},{id:'pa2',name:'Parmigiano Reggiano',qty:125,unit:'g'}],
       congelateur:[{id:'steaks',name:'Steaks (4 à 5% MG)',qty:7,unit:'pcs',pieceG:100,mac100:{kcal:147,prot:20,gluc:0,lip:7},macPiece:{kcal:147,prot:20,gluc:0,lip:7}}],placards:[],epices:[]},
  pasRacheter:{'parmigiano reggiano dop en copeaux':1}},extra||{});}
console.log('\n=== XXXV. Corrections de mon inventaire (04/10) ===');
t('*** steaks a 5 % : 125 kcal / 21 g / 4,5 g, par piece aussi ***',()=>{
  sb._applyState(etat());const s=X("findItem('steaks')");
  eq(s.mac100.kcal,125);eq(s.mac100.lip,4.5);eq(s.macPiece.kcal,125);eq(s.macPiece.prot,21);eq(X('S.invFix1004'),true);
});
t('*** parmesan en double epuise retire, l\'autre garde, exclusion de rachat levee ***',()=>{
  sb._applyState(etat());eq(X("findItem('pa1')"),null);eq(X("findItem('pa2').qty"),125);
  if(X('S.pasRacheter')['parmigiano reggiano dop en copeaux'])throw new Error('exclusion restee');
});
t('une seule fois : une valeur corrigee ensuite a la main n\'est pas ecrasee',()=>{
  const e=etat({invFix1004:true});e.inv.congelateur[0].macPiece.kcal=150;e.inv.congelateur[0].mac100.kcal=150;
  sb._applyState(e);eq(X("findItem('steaks').mac100.kcal"),150);if(!X("findItem('pa1')"))throw new Error('parmesan retire apres coup');
});
t('valeur deja changee par l\'utilisateur avant la migration : pas touchee',()=>{
  const e=etat();e.inv.congelateur[0].macPiece.kcal=130;e.inv.congelateur[0].mac100.kcal=130;sb._applyState(e);eq(X("findItem('steaks').mac100.kcal"),130);
});
t('parmesan en stock : jamais retire ; autres comptes : rien',()=>{
  const e=etat();e.inv.frigo[0].qty=50;sb._applyState(e);if(!X("findItem('pa1')"))throw new Error('retire alors qu\'il en reste');
  sb._applyState(etat({catalogue:'autre'}));eq(X("findItem('steaks').mac100.kcal"),147,'autre compte');
});
t('le drapeau est enregistre avec l\'etat',()=>{if(!/invFix1004:!!S\.invFix1004/.test(X('_saveStateNow.toString()')+X('saveState.toString()')+require('fs').readFileSync('index.html','utf8')))throw new Error('non enregistre');});
t('*** aiguillettes de poulet : valeurs du cru (110 / 23,5 / 0 / 1,5), une seule fois ***',()=>{
  const e=etat({invFix1004:true});e.inv.congelateur.push({id:'cx_mqwkfekl',name:'Aiguillettes de poulet',qty:1500,unit:'g',mac100:{kcal:165,prot:31,gluc:0,lip:3.6}});
  sb._applyState(e);eq(X("findItem('cx_mqwkfekl').mac100.kcal"),110);eq(X("findItem('cx_mqwkfekl').mac100.prot"),23.5);eq(X('S.invFix1004b'),true);
  const e2=etat({invFix1004:true,invFix1004b:true});e2.inv.congelateur.push({id:'cx_mqwkfekl',name:'Aiguillettes de poulet',qty:1500,unit:'g',mac100:{kcal:165,prot:31,gluc:0,lip:3.6}});
  sb._applyState(e2);eq(X("findItem('cx_mqwkfekl').mac100.kcal"),165,'deja fait : plus touche');
  const e3=etat({invFix1004:true});e3.inv.congelateur.push({id:'cx_mqwkfekl',name:'Aiguillettes de poulet',qty:1500,unit:'g',mac100:{kcal:112,prot:24,gluc:0,lip:1.5}});
  sb._applyState(e3);eq(X("findItem('cx_mqwkfekl').mac100.kcal"),112,'valeur de l\'etiquette deja saisie : gardee');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
