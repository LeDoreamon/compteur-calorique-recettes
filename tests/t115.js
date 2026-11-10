// Recettes (10/11/2026, valide par Liam) : « Garder dans Mes recettes », mode cuisine, photo effacee avec sa recette ;
// lignes estimees sur deux lignes
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
sb.fetch=async()=>({ok:true,status:200,json:async()=>null});
const IMG='data:image/jpeg;base64,AAAA';
const prep=(favs)=>{X(`S.inv={frigo:[],congelateur:[],placards:[{id:'riz_t',name:'Riz basmati',qty:1000,unit:'g',mac100:{kcal:350,prot:7,gluc:78,lip:1}}],epices:[]};
  S.customRecipes=[];S.favs=${JSON.stringify(favs||[])};S.aiRecipes=[];S.mealTab='lunch';
  ['ia1','ia2'].forEach(function(id,i){var r={id:id,name:'Riz '+(i+1),ai:true,profile:ACTIVE_PROFILE,slots:['lunch'],kcal:500,prot:30,gluc:80,lip:5,time:20,
    used:[{id:'riz_t',qty:80}],steps:['Cuire 80 g de riz basmati.','Servir.'],extras:[]};S.aiRecipes.push(r);for(var j=RCP.length-1;j>=0;j--)if(RCP[j].id===id)RCP.splice(j,1);RCP.push(r);});`);};

console.log('\n=== LXXXVIII. Garder une recette IA, mode cuisine, photos des recettes supprimees ===');
t('*** recette ouverte : « Mode cuisine » partout, « Garder dans Mes recettes » sur les recettes de l\'IA seulement ***',()=>{
  prep();
  const ia=X("_actionsRecette(findRecipe('ia1'))");
  if(ia.indexOf("ouvrirModeCuisine('ia1')")<0||ia.indexOf("garderRecetteIA('ia1')")<0)throw new Error(ia);
  const cat=X("_actionsRecette(RCP.find(r=>!r.ai&&!r.custom&&(r.steps||[]).length))");
  if(cat.indexOf('Mode cuisine')<0||cat.indexOf('Garder dans')>=0)throw new Error('catalogue : '+cat);
  eq(X("_actionsRecette({id:'x',steps:[]})"),'','sans etape ni IA');
  if(src.indexOf('${_actionsRecette(r)}${renderCardBottom(r)}')<0)throw new Error('absent de la carte');
});
t('*** « Garder dans Mes recettes » : cette recette seule passe en recette perso, les autres restent ***',()=>{
  prep(['ia1']);X("garderRecetteIA('ia1')");
  eq(X('S.aiRecipes.map(r=>r.id).join()'),'ia2');
  const r=X("S.customRecipes.find(r=>r.id==='ia1')");if(!r)throw new Error('absente de Mes recettes');
  eq(r.custom,true);eq(r.ai,undefined);if(r.steps[0].indexOf('[')<0)throw new Error('etapes sans crochets');
  eq(X("S.favs.indexOf('ia1')>=0"),true,'favori perdu');eq(X("RCP.filter(r=>r.id==='ia1').length"),1);
  X("garderRecetteIA('inconnue')");eq(X('S.aiRecipes.length'),1,'identifiant inconnu');
});
t('*** mode cuisine : etapes en grand, a cocher ; fermer remet tout a zero ***',()=>{
  prep();const r=X("findRecipe('ia1')");sb.__r=r;
  let h=X('_htmlCuisine(__r,{},true)');
  eq((h.match(/cocherEtapeCuisine\(/g)||[]).length,2);if(h.indexOf('font-size:16px')<0)throw new Error('texte trop petit');
  if(h.indexOf('0 / 2 étapes')<0||h.indexOf('écran reste allumé')<0||h.indexOf('fermerModeCuisine()')<0)throw new Error('entete');
  if(!/<mark class="ing-hl[^"]*">[^<]*riz basmati/i.test(h))throw new Error('ingredient non surligne');
  h=X('_htmlCuisine(__r,{0:true},false)');
  if(h.indexOf('1 / 2 étapes')<0||h.indexOf('aria-pressed="true"')<0||h.indexOf('line-through')<0)throw new Error('etape cochee');
  if(h.indexOf('ne permet pas de garder l\'écran allumé')<0)throw new Error('message sans verrou');
  X("ouvrirModeCuisine('ia1')");eq(X('_cuisine.id'),'ia1');
  X('cocherEtapeCuisine(1)');eq(X('_cuisine.fait[1]'),true);X('cocherEtapeCuisine(1)');eq(X('_cuisine.fait[1]'),false);
  X('fermerModeCuisine()');eq(X('_cuisine'),null);
  X("ouvrirModeCuisine('inconnue')");eq(X('_cuisine'),null,'recette inconnue');
  eq(Object.keys(S.dayMeals||{}).filter(d=>(S.dayMeals[d]||[]).some(m=>m.rid==='ia1')).length,0,'repas compte par le mode cuisine');
});
t('*** l\'ecran reste allume pendant le mode cuisine, et le verrou est rendu a la fermeture ***',async()=>{
  let pris=0,rendus=0;sb.navigator.wakeLock={request:async(type)=>{eq(type,'screen');pris++;return {release:async()=>{rendus++;},addEventListener(){}};}};
  prep();X("ouvrirModeCuisine('ia1')");await new Promise(r=>setTimeout(r,5));
  eq(pris,1);eq(X('!!_verrouEcran'),true);
  X('fermerModeCuisine()');await new Promise(r=>setTimeout(r,5));eq(rendus,1);eq(X('_verrouEcran'),null);
  sb.navigator.wakeLock={request:async()=>{throw new Error('NotAllowedError');}};
  eq(await X('_ecranAllume(true)'),false,'refus du navigateur');
  delete sb.navigator.wakeLock;eq(await X('_ecranAllume(true)'),false,'navigateur sans verrou');
});
t('*** photo d\'une recette IA effacee : supprimee avec elle ; celle d\'une favorite reste ***',async()=>{
  prep(['ia1']);X(`PHOTOS['ia1']='${IMG}';PHOTOS['ia2']='${IMG}';`);
  sb.confirm=m=>/^Effacer/.test(m);await X('clearAIRecipes()');
  eq(X("'ia2' in PHOTOS"),false,'photo orpheline :');eq(X("'ia1' in PHOTOS"),true,'photo de la favorite perdue :');
});
t('*** photo d\'une recette perso supprimee, et d\'une recette IA remplacee a la generation ***',()=>{
  prep();X(`S.customRecipes=[{id:'cust_p',custom:true,name:'P',slots:['lunch'],used:[],steps:[]}];PHOTOS['cust_p']='${IMG}';_cr={id:'cust_p',name:'P'};_supprimerCustRec()`);
  eq(X("'cust_p' in PHOTOS"),false);
  if(!/const i=RCP\.findIndex\(x=>x\.id===r\.id\);if\(i>=0\)RCP\.splice\(i,1\);\s*_oublierPhotoRecette\(r\.id\);/.test(src))throw new Error('generation');
  X("_oublierPhotoRecette('jamais_vue')");   /* ne doit pas lever */
});
t('*** lignes estimees : le nom sur sa propre ligne, quantite / kcal / ↻ en dessous ***',()=>{
  X(`_addMealInvSuggestions=[];_addMealFreeItems=[{n:'Thon au naturel en conserve',qty:100,baseQty:100,unit:'g',m:{kcal:120,prot:26,gluc:0,lip:1},pu:{kcal:1.2,prot:.26,gluc:0,lip:.01}}];renderInvSuggestions([])`);
  const h=docEl('inv-items-section').innerHTML;
  if(!/class="ligne-estimee" style="display:flex;flex-wrap:wrap;/.test(h))throw new Error('conteneur');
  const nom=(h.match(/<input type="text" id="free-nom-0"[^>]*>/)||[''])[0];if(!/flex:1 1 calc\(100% - 64px\)/.test(nom))throw new Error('nom : '+nom);
  const qte=(h.match(/<input type="number" id="free-qty-0"[^>]*>/)||[''])[0];if(!/order:2;/.test(qte))throw new Error('quantite : '+qte);
});

(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' -> '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
