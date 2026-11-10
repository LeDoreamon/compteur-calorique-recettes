// Audit du 10/11/2026 : etat recharge (listes vides ailleurs), changement d'adresse dans le profil, reponse coupee en mode inventaire
const {sb,docEl}=require('./sb.js');
const vm=require('vm');
const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const S=sb.S;
const src=fs.readFileSync('index.html','utf8');
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
const GK='AIza'+'SyDummyDummyDummyDummyDummyDumm0';

/* un compte ordinaire (pas l'ancien profil, qui recoit inventaire et repas par defaut) */
const PROFIL_AVANT=X('ACTIVE_PROFILE');
const etat=(plus)=>Object.assign({_profile:'users/u1',rev:5,schema:X('SCHEMA'),profil:{prenom:'T',cibles:{kcal:2000,prot:100,gluc:200,lip:70}},
  inv:{frigo:[{id:'a',name:'Lait',qty:1000,unit:'ml'}],placards:[],congelateur:[],epices:[]}},plus||{});
const PERSO={id:'cust_1',custom:true,profile:'users/u1',name:'Perso',slots:['lunch'],used:[{id:'a',qty:100}],steps:['x']};
const IAPASSEE={id:'ai_9',custom:true,profile:'users/u1',name:'Ex-IA',slots:['dinner'],used:[{id:'a',qty:100}],steps:['x']};

console.log('\n=== LXXXVI. Audit du 10/11/2026 ===');
t('*** etat recharge : la derniere recette perso supprimee sur un autre appareil ne reste pas (et ne repart pas vers le cloud) ***',()=>{
  X("ACTIVE_PROFILE='users/u1'");
  X('_applyState')(JSON.parse(JSON.stringify(etat({customRecipes:[PERSO,IAPASSEE]}))));
  eq(X('S.customRecipes.length'),2);eq(X("RCP.filter(r=>r.custom).length"),2);
  /* l'autre appareil a supprime les deux : Firebase ne garde pas le tableau vide, le champ est absent */
  X('_applyState')(JSON.parse(JSON.stringify(etat({rev:6}))));
  eq(X('S.customRecipes.length'),0,'recettes perso restees en memoire :');
  eq(X("RCP.filter(r=>r.custom===true||/^cust_/.test(r.id)).length"),0,'restees a l\'ecran :');
  eq((X('_etatPourEnvoi()').customRecipes||[]).length,0,'renvoyees au cloud :');
});
t('etat recharge : les recettes perso encore presentes restent, le catalogue n\'est pas touche',()=>{
  const avant=X("RCP.filter(r=>!r.custom&&!r.ai).length");
  X('_applyState')(JSON.parse(JSON.stringify(etat({rev:7,customRecipes:[PERSO]}))));
  eq(X('S.customRecipes.map(r=>r.id).join()'),'cust_1');eq(X("RCP.filter(r=>r.custom).length"),1);
  eq(X("RCP.filter(r=>!r.custom&&!r.ai).length"),avant,'catalogue modifie :');
});
t('*** « Récemment supprimés » vide ailleurs : vide ici aussi ***',()=>{
  X('_applyState')(JSON.parse(JSON.stringify(etat({rev:8,deletedItems:[{it:{id:'z',name:'Z'},cat:'frigo',t:Date.now()}]}))));
  eq(X('S.deletedItems.length'),1);
  X('_applyState')(JSON.parse(JSON.stringify(etat({rev:9}))));
  eq(X('S.deletedItems.length'),0);
  X("ACTIVE_PROFILE="+JSON.stringify(PROFIL_AVANT));
});

/* profil : changement d'adresse */
let appelsId=[];
const profil=(login,catalogue)=>{LS.dz_auth=JSON.stringify({uid:'UID1',rtok:'r',login:login});S.profil={prenom:'T'};S.catalogue=catalogue||null;
  X('ouvrirEditionProfil')();appelsId=[];};
t('*** profil : la nouvelle adresse doit etre un e-mail (on ne remplace plus son e-mail par un identifiant) ***',async()=>{
  profil('tom@exemple.fr');const h=docEl('profil-panneau').innerHTML;
  if(h.indexOf('Nouvelle adresse e-mail')<0||h.indexOf('Changer l\'adresse e-mail')<0)throw new Error('libelles');
  if(/Nouvel identifiant/.test(h))throw new Error('ancien libelle');
  X('var __ci=changerIdentifiant');sb.__appels=appelsId;X('changerIdentifiant=async function(n){__appels.push(n);}');
  try{
    docEl('pf-login').value='tom';await X('modifierIdentifiant')();
    eq(appelsId.length,0,'identifiant simple accepte :');if(docEl('pf-err').innerHTML.indexOf('adresse e-mail valide')<0)throw new Error('message : '+docEl('pf-err').innerHTML);
    docEl('pf-login').value='Tom@Autre.fr';await X('modifierIdentifiant')();
    eq(appelsId.join(),'Tom@Autre.fr');if(docEl('pf-err').innerHTML.indexOf('tom@autre.fr')<0)throw new Error('confirmation : '+docEl('pf-err').innerHTML);
  }finally{X('changerIdentifiant=__ci');}
});
t('profil : compte a simple identifiant : invitation a passer a une adresse e-mail',()=>{
  profil('tom');const h=docEl('profil-panneau').innerHTML;
  if(h.indexOf('Passer à une adresse e-mail')<0||h.indexOf('Sans adresse e-mail')<0)throw new Error('invitation absente');
});
t('*** refus de Firebase : marche a suivre pour Liam, « demande à Liam » pour les autres (pas de console) ***',async()=>{
  X('var __ci=changerIdentifiant');X("changerIdentifiant=async function(){throw new Error('OPERATION_NOT_ALLOWED');}");
  try{
    X("ACTIVE_PROFILE='users/u1'");   /* un compte ordinaire, sans le catalogue de Liam */
    profil('tom@exemple.fr',null);docEl('pf-login').value='t2@exemple.fr';await X('modifierIdentifiant')();
    let e=docEl('pf-err').innerHTML;if(e.indexOf('Demande à Liam')<0||/Console Firebase/.test(e))throw new Error('autre compte : '+e.replace(/<[^>]+>/g,''));
    profil('liam@exemple.fr','liam');docEl('pf-login').value='l2@exemple.fr';await X('modifierIdentifiant')();
    e=docEl('pf-err').innerHTML;if(!/Console Firebase/.test(e))throw new Error('compte de Liam : '+e.replace(/<[^>]+>/g,''));
  }finally{X('changerIdentifiant=__ci');S.catalogue=null;X("ACTIVE_PROFILE="+JSON.stringify(PROFIL_AVANT));}
});

/* reponse coupee en mode « avec mon inventaire » */
t('*** photo « avec mon inventaire » coupee en route : ingredients gardes et avertissement (avant : aucun) ***',async()=>{
  X("S.inv={frigo:[{id:'po',name:'Poulet',qty:1000,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}},{id:'ri',name:'Riz',qty:1000,unit:'g',mac100:{kcal:350,prot:7,gluc:78,lip:1}}],placards:[],congelateur:[],epices:[]};S.dayMeals={}");
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;X("openAddMeal('text');setMealStock(true)");
  const COUPE='{"name":"Poulet riz","inv_suggestions":[{"id":"po","name":"Poulet","qty":150,"unit":"g","g":150},{"id":"ri","name":"Ri';
  sb.fetch=async(url)=>/generativelanguage/.test(url)?{ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:COUPE}]},finishReason:'MAX_TOKENS'}]})}:{ok:true,status:200,json:async()=>null};
  X('var __it=_infoToast');sb.__notes=[];X("_infoToast=function(a,b){__notes.push(a);}");
  try{await X('runAddMealAI')([{role:'user',content:[{type:'text',text:'x'},{type:'image',source:{type:'base64',media_type:'image/jpeg',data:'AAAA'}}]}]);}
  finally{X('_infoToast=__it');}
  eq(X('_addMealInvSuggestions.map(s=>s.id).join()'),'po');
  if(sb.__notes.join().indexOf('incomplète')<0)throw new Error('pas d\'avertissement');
});

(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' -> '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
