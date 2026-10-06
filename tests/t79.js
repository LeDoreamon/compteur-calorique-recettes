const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
console.log('\n=== XXXVI. Parcours nouvel utilisateur : bugs du 06/10 ===');
t('*** inscription : poids vise -> objectif du Bilan, poids declare -> premiere pesee ***',async()=>{
  let corps=null;const vf=sb.fetch;sb.fetch=async(u,o)=>{if(o&&o.method==='PUT'&&/state/.test(u))corps=JSON.parse(o.body);return {ok:true,status:200,json:async()=>({id_token:'t',expires_in:'3600'})};};
  try{await X('_initNouveauProfil')('users/NEW',{prenom:'Camille',poids:72,poidsVise:65,pas:7000});}finally{sb.fetch=vf;}
  if(!corps)throw new Error('aucune ecriture');eq(corps.weightGoal,65);eq(corps.weights.length,1);eq(corps.weights[0].w,72);
});
t('poids vise absent ou absurde : rien d\'invente',async()=>{
  let corps=null;const vf=sb.fetch;sb.fetch=async(u,o)=>{if(o&&o.method==='PUT'&&/state/.test(u))corps=JSON.parse(o.body);return {ok:true,status:200,json:async()=>({id_token:'t',expires_in:'3600'})};};
  try{await X('_initNouveauProfil')('users/NEW',{prenom:'Ana',poidsVise:'',poids:5});}finally{sb.fetch=vf;}
  eq(corps.weightGoal,undefined);eq(corps.weights,undefined);
});
t('*** compte existant sans objectif de poids : repris du profil au chargement ***',()=>{
  sb._applyState({inv:{frigo:[]},dayMeals:{},profil:{prenom:'A',poidsVise:68}});eq(X('S.weightGoal'),68);
  sb._applyState({inv:{frigo:[]},dayMeals:{},weightGoal:88,profil:{prenom:'A',poidsVise:85}});eq(X('S.weightGoal'),88,'objectif deja fixe : garde');
});
t('*** un seul poids vise : le Bilan met a jour le profil ***',()=>{
  X("S.profil={prenom:'A',poidsVise:85}");docEl('goal-input').value='80';X('setWeightGoal()');
  eq(X('S.weightGoal'),80);eq(X('S.profil.poidsVise'),80);
});
t('*** sans aucune IA : un seul message ***',()=>{
  const vg=X('getApiKey'),vm2=X('getGeminiKey');X('getApiKey=function(){return ""};getGeminiKey=function(){return ""}');
  try{X('_majIAPrevue()');const h=docEl('addmeal-ia').innerHTML;eq((h.match(/Aucune IA configurée/g)||[]).length,1);}
  finally{sb.__g=vg;sb.__m=vm2;X('getApiKey=__g;getGeminiKey=__m');}
});
t('*** « stock utilise » : Non par defaut si l\'inventaire est vide, Oui sinon ***',()=>{
  X("S.inv={frigo:[],congelateur:[],placards:[],epices:[{id:'sel',name:'Sel',qty:null}]}");X("openAddMeal('text')");eq(X('_addMealUseStock'),false,'vide (epices seules)');
  X("S.inv.frigo.push({id:'p',name:'Poulet',qty:0,unit:'g'})");X("openAddMeal('text')");eq(X('_addMealUseStock'),false,'epuise');
  X("S.inv.frigo.push({id:'q',name:'Riz',qty:500,unit:'g'})");X("openAddMeal('text')");eq(X('_addMealUseStock'),true,'en stock');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
