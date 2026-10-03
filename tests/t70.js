const {sb}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
console.log('\n=== XX. Recettes IA et perso visibles ===');
function prepa(cat){X(`_loaded=true;ACTIVE_PROFILE='users/UID7';S.catalogue=${cat?"'liam'":'null'};S.mainTab='recipes';S.mealTab='lunch';S.dayMeals={};S.favs=[];
  S.inv={frigo:[{id:'po',name:'Poulet',qty:1000,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}}],congelateur:[],placards:[{id:'ri',name:'Riz',qty:1000,unit:'g',mac100:{kcal:350,prot:7,gluc:78,lip:1}}],epices:[]};`);}
const ia={id:'ai_x_0',slots:['lunch'],name:'Bowl poulet riz IA',ai:true,urgent:0,ur:null,time:15,kcal:600,prot:50,gluc:70,lip:8,steps:['Cuire'],used:[{id:'po',qty:200},{id:'ri',qty:80}],extras:[]};
t('*** une recette IA du compte est visible (compte avec catalogue) ***',()=>{
  prepa(true);X('S.aiRecipes=[];for(var i=RCP.length-1;i>=0;i--)if(RCP[i].ai)RCP.splice(i,1);');
  X('_applyState')({_profile:'users/UID7',inv:X('S.inv'),dayMeals:{},aiRecipes:[ia]});
  const r=X("RCP.find(function(x){return x.id==='ai_x_0'})");if(!r)throw new Error('absente de RCP');
  eq(r.profile,'users/UID7');eq(X('recetteVisible')(r),true);
});
t('*** idem pour un compte sans catalogue ***',()=>{prepa(false);eq(X("recetteVisible(RCP.find(function(x){return x.id==='ai_x_0'}))"),true);});
t('une recette perso du compte est visible',()=>{prepa(false);eq(X("recetteVisible({id:'cust_1',custom:true,profile:'users/UID7'})"),true);});
t('*** le catalogue d\'un autre profil reste masque, celui du compte rattache visible ***',()=>{
  prepa(false);eq(X("recetteVisible({id:'v6',profile:'liam'})"),false);
  prepa(true);eq(X("recetteVisible({id:'v6',profile:'liam'})"),true);
  eq(X("recetteVisible({id:'o',profile:'users/AUTRE'})"),false,'recette d\'un autre compte');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
