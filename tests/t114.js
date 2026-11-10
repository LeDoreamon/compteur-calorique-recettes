// Ajout de repas (10/11/2026, valide par Liam) : plusieurs photos + precision, ecran d'analyse (loupe, etapes, Annuler),
// repas garde « pour plus tard » quand le reseau manque
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
const REP='{"corrected":"Buffet","ok":true,"items":[{"n":"Nem","q":1,"u":"pc","kcal":180,"prot":6,"gluc":18,"lip":9,"fib":1},{"n":"Tiramisu","q":2,"u":"pc","kcal":400,"prot":6,"gluc":44,"lip":22,"fib":0}]}';
const OKG={candidates:[{content:{parts:[{text:REP}]},finishReason:'STOP'}]};
const OKQ={choices:[{message:{content:REP},finish_reason:'stop'}]};
const rep=j=>({ok:true,status:200,json:async()=>j});
const vis=id=>docEl(id).style.display!=='none'&&docEl(id).style.display!==undefined&&docEl(id).style.display!=='';
const ouvrir=()=>{X("S.inv={frigo:[],placards:[],congelateur:[],epices:[]};S.dayMeals={};S.displayDate=S.today;openAddMeal('text','lunch');setMealStock(false)");
  X("_amPhotos=[{b64:'AAAA',url:'data:image/jpeg;base64,AAAA'},{b64:'BBBB',url:'data:image/jpeg;base64,BBBB'}];_montrerPhotos()");};
const CLE=()=>X('_cleBrouillons()');

console.log('\n=== LXXXVII. Photos multiples, ecran d\'analyse, repas a analyser plus tard ===');
t('*** plateau de photos : vignettes, « + Photo », rien n\'est envoye avant « Analyser » ***',()=>{
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;let n=0;sb.fetch=async()=>{n++;return rep(OKG);};
  ouvrir();const h=docEl('amp-liste').innerHTML;
  eq((h.match(/<img /g)||[]).length,2);if(h.indexOf('ajouterPhotoRepas()')<0||h.indexOf('retirerPhotoRepas(1)')<0)throw new Error('boutons');
  eq(docEl('addmeal-photos').style.display,'block');eq(docEl('addmeal-input').style.display,'none');eq(n,0,'envoi avant Analyser :');
  X('retirerPhotoRepas(0)');eq(X('_amPhotos.length'),1);X('retirerPhotoRepas(0)');eq(docEl('addmeal-input').style.display,'block','retour a la saisie');
  if(!/id="addmeal-photo-input" accept="image\/\*" multiple/.test(src))throw new Error('plusieurs fichiers');
  eq(X('PHOTOS_REPAS_MAX'),4);
});
t('*** deux photos + une precision : une seule analyse, tout est envoye ***',async()=>{
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;const corps=[];sb.fetch=async(u,o)=>{corps.push(JSON.parse(o.body));return rep(OKG);};
  ouvrir();docEl('amp-precision').value='resto à volonté, + 2 verrines tiramisu';
  await X('analyserPhotos()');
  eq(corps.length,1);const parts=corps[0].contents[0].parts;
  eq(parts.filter(p=>p.inline_data).length,2);const txt=parts.find(p=>p.text).text;
  if(txt.indexOf('MÊME repas')<0||txt.indexOf('2 verrines tiramisu')<0)throw new Error(txt);
  eq(corps[0].generationConfig.maxOutputTokens,7200,'budget elargi pour 2 photos');
  eq(X('_addMealFreeItems.length'),2);eq(docEl('addmeal-confirm').style.display,'block');eq(docEl('addmeal-kcal').value,'580');
});
t('une seule photo sans precision : consigne simple',()=>{
  eq(X("_consignePhotos(1,'')"),'Analyse ce repas.');
});
t('*** ecran d\'analyse : loupe animee, IA nommee, passage a l\'IA de secours dit a l\'ecran ***',async()=>{
  if(!/<span class="loupe" aria-hidden="true">🔍<\/span>/.test(src))throw new Error('loupe');
  if(!/\.loupe \{[^}]*animation: loupeCherche [\d.]+s ease-in-out infinite/.test(src)||!/@keyframes loupeCherche\{/.test(src))throw new Error('animation');
  const pas=(src.match(/@keyframes loupeCherche\{(.*?)\}\}/)||['',''])[1].match(/translate\((-?\d+)px,(-?\d+)px\)/g)||[];
  if(pas.length<5)throw new Error('trajet trop pauvre');
  pas.forEach(p=>{const m=p.match(/(-?\d+)px,(-?\d+)px/);if(Math.abs(+m[1])>8||Math.abs(+m[2])>8)throw new Error('sort de son petit carre : '+p);});
  if(!/prefers-reduced-motion: reduce\) \{ \.loupe \{ animation: none; \} \}/.test(src))throw new Error('mouvement reduit');
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;const vus=[];
  sb.fetch=async(u)=>{vus.push(docEl('addmeal-analyzing-txt').textContent);return /generativelanguage/.test(u)?rep({error:{code:429,status:'RESOURCE_EXHAUSTED',message:'quota'}}):rep(OKQ);};
  ouvrir();await X('analyserPhotos()');
  eq(vus[0],'Analyse en cours avec Gemini…');eq(vus[vus.length-1],'Gemini ne répond pas, je passe à Groq…');
});
t('*** « Annuler » pendant l\'analyse : retour aux photos, la reponse tardive est ignoree ***',async()=>{
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;let lacher;sb.fetch=()=>new Promise(r=>{lacher=()=>r(rep(OKG));});
  ouvrir();const p=X('analyserPhotos()');await new Promise(r=>setTimeout(r,5));
  eq(docEl('addmeal-analyzing').style.display,'block');
  X('annulerAnalyse()');eq(docEl('addmeal-analyzing').style.display,'none');eq(docEl('addmeal-photos').style.display,'block');
  docEl('addmeal-confirm').style.display='none';lacher();await p;
  eq(docEl('addmeal-confirm').style.display,'none','reponse perimee appliquee :');eq(docEl('addmeal-photos').style.display,'block');
  if(!/onclick="annulerAnalyse\(\)"/.test(src))throw new Error('bouton Annuler');
});
t('*** reseau coupe : « Garder pour plus tard » propose ; une erreur de quota ne le propose pas ***',async()=>{
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;delete LS[CLE()];
  sb.fetch=async()=>{throw new TypeError('Load failed');};
  ouvrir();await X('analyserPhotos()');
  eq(docEl('addmeal-photos').style.display,'block','retour aux photos');eq(docEl('am-plus-tard-2').style.display,'block');
  if(!docEl('amp-err').textContent)throw new Error('erreur non affichee');
  const st=sb.setTimeout;sb.setTimeout=(f,ms)=>st(f,ms>1000?0:ms);
  try{sb.fetch=async(u)=>/generativelanguage/.test(u)?rep({error:{code:429,status:'RESOURCE_EXHAUSTED',message:'quota'}}):rep({error:{message:'Service unavailable'}});
    ouvrir();await X('analyserPhotos()');}finally{sb.setTimeout=st;}
  eq(docEl('am-plus-tard-2').style.display,'none','propose sur une erreur qui n\'est pas le reseau :');
});
t('*** repas garde : sur l\'appareil, visible dans Repas, rien de compte dans la journee ***',async()=>{
  LS.anthropic_key='gsk_x';LS.gemini_key=GK;delete LS[CLE()];sb.fetch=async()=>{throw new TypeError('Load failed');};
  ouvrir();docEl('amp-precision').value='+ dessert <b>';await X('analyserPhotos()');
  X('garderPourPlusTard()');
  const b=JSON.parse(LS[CLE()]);eq(b.length,1);eq(b[0].photos.join(),'AAAA,BBBB');eq(b[0].slot,'lunch');eq(b[0].jour,X('S.today'));
  eq(docEl('addmeal-overlay').style.display,'none');eq(Object.keys(S.dayMeals).length,0,'repas compte :');
  const h=X('_htmlAAnalyser()');
  if(h.indexOf('Repas à analyser')<0||h.indexOf('Déjeuner aujourd')<0||h.indexOf('2 photos')<0||h.indexOf("reprendreBrouillon('"+b[0].id+"')")<0)throw new Error(h.replace(/<[^>]+>/g,' '));
  if(src.indexOf('${_htmlAAnalyser()}<div id="daypane"')<0)throw new Error('absent de l\'onglet Repas');
});
t('*** « Analyser » plus tard : photos, precision, jour et moment repris ; enregistre, le repas en attente disparait ***',async()=>{
  const id=JSON.parse(LS[CLE()])[0].id;const corps=[];sb.fetch=async(u,o)=>{corps.push(JSON.parse(o.body));return rep(OKG);};
  await X("reprendreBrouillon('"+id+"')");
  eq(corps[0].contents[0].parts.filter(p=>p.inline_data).length,2);
  if(corps[0].contents[0].parts.find(p=>p.text).text.indexOf('+ dessert')<0)throw new Error('precision perdue');
  eq(X('_amSlot'),'lunch');eq(docEl('addmeal-confirm').style.display,'block');
  eq(JSON.parse(LS[CLE()]).length,1,'retire avant l\'enregistrement :');
  X('confirmAddMealFinal()');
  eq(LS[CLE()],undefined,'toujours en attente :');eq(S.dayMeals[X('S.today')].length,1);eq(S.dayMeals[X('S.today')][0].slot,'lunch');
});
t('texte seul : garde et repris aussi',async()=>{
  LS.anthropic_key='gsk_x';delete LS.gemini_key;delete LS[CLE()];sb.fetch=async()=>{throw new TypeError('Load failed');};
  X("S.dayMeals={};openAddMeal('text','dinner');setMealStock(false)");docEl('addmeal-textarea').value='3 parts de pizza';
  await X("startAddMealAnalysis('text')");eq(docEl('am-plus-tard-1').style.display,'block');
  X('garderPourPlusTard()');const b=JSON.parse(LS[CLE()]);eq(b[0].texte,'3 parts de pizza');eq(b[0].photos.length,0);
  if(X('_htmlAAnalyser()').indexOf('« 3 parts de pizza »')<0)throw new Error('libelle');
  const corps=[];sb.fetch=async(u,o)=>{corps.push(JSON.parse(o.body));return rep(OKQ);};
  await X("reprendreBrouillon('"+b[0].id+"')");
  if(JSON.stringify(corps[0].messages).indexOf('3 parts de pizza')<0)throw new Error('texte non renvoye');
});
t('*** garde-fous : 3 repas en attente au plus, donnees abimees ecartees, efface a la deconnexion ***',()=>{
  eq(X('BROUILLONS_MAX'),3);
  LS[CLE()]=JSON.stringify([{id:'b1',jour:'2026-11-09',slot:'lunch',photos:['AAAA','<script>'],texte:'x'},{id:'"><img',jour:'2026-11-09'},{id:'b2',jour:'pas"une date'},null]);
  const l=X('_brouillons()');eq(l.length,1);eq(l[0].photos.join(),'AAAA');
  LS[CLE()]=JSON.stringify([1,2,3].map(i=>({id:'b'+i,jour:X('S.today'),slot:'lunch',photos:[],texte:'t'+i})));
  let alerte='';sb.alert=m=>{alerte=m;};X("openAddMeal('text','lunch')");docEl('addmeal-textarea').value='un de plus';X('garderPourPlusTard()');
  eq(JSON.parse(LS[CLE()]).length,3);if(alerte.indexOf('Déjà 3 repas en attente')<0)throw new Error('alerte : '+alerte);
  if(!/\['_st','_photos','_nonEnvoye','_aAnalyser'\]/.test(src))throw new Error('non efface a la deconnexion');
  delete LS[CLE()];
});

(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' -> '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
