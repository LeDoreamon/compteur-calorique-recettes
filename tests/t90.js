// Audit du 11/10/2026 : synchro sans perte silencieuse, session, entrees piegees.
// Sandbox reseau de t9 (faux Firebase), avec filet garde et comptage des comptes anonymes.
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;
function t(n,f){return f().then(()=>{console.log('  ok  '+n);pass++;})
  .catch(e=>{console.log('  KO  '+n+' -> '+e.message);fail++;});}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
function build(opts){
  opts=opts||{};
  const net={coupe:!!opts.horsLigne};
  const serveur={state:opts.serveur||null,burn:{},envois:[],filet:null,signUp:0};
  const local=Object.assign({},opts.local||{});
  const journal=[];
  let js=fs.readFileSync('catalogue.js','utf8')+'\n'+fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  js+='\n;["S","saveState","loadState","_applyState","render","getToday"].forEach(function(n){try{globalThis[n]=eval(n);}catch(e){}});';
  js+='\n;try{globalThis.__rev=function(){return _stateRev;};globalThis.__setLoaded=function(v){_loaded=v;};}catch(e){}';
  const reg={};
  function makeEl(){return{value:'',checked:false,textContent:'',innerHTML:'',className:'',style:{},
    cssText:'',dataset:{},offsetWidth:100,placeholder:'',
    classList:{add(){},remove(){},contains:()=>false,toggle(){}},focus(){},appendChild(){},
    setAttribute(){},getAttribute(){return null;},querySelector(){return null;},
    querySelectorAll(){return[];},addEventListener(){},files:[]};}
  const docEl=id=>{if(!reg[id])reg[id]=makeEl();return reg[id];};
  const RD=Date;class FD extends RD{getHours(){return 12;}}
  const sb={console:{log(){},warn(){},error(){}},Math,Date:FD,JSON,parseFloat,parseInt,isNaN,isFinite,
   Array,Object,String,Number,Boolean,RegExp,Promise,Map,Set,encodeURIComponent,decodeURIComponent,
   document:{getElementById:docEl,querySelector:()=>null,querySelectorAll:()=>[],
     createElement:()=>makeEl(),addEventListener(){},hidden:false,
     body:{appendChild(e){reg['coach-toast']=e;}},documentElement:makeEl(),head:makeEl()},
   localStorage:{getItem:k=>(k in local?local[k]:null),setItem(k,v){local[k]=String(v);},removeItem(k){delete local[k];}},
   sessionStorage:{getItem:()=>null,setItem(){}},
   navigator:{userAgent:'node'},alert(){},confirm:()=>true,prompt:()=>'',
   setTimeout(f,d){return global.setTimeout(f,Math.min(d||0,40));},
   clearTimeout(id){return global.clearTimeout(id);},setInterval(){},clearInterval(){},requestAnimationFrame(){},
   AbortController:class{constructor(){this.signal={};}abort(){}},
   URL:{createObjectURL:()=>''},Blob:function(){},Image:function(){},
   location:{href:''},history:{pushState(){}},addEventListener(){},removeEventListener(){},
   matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),
   fetch:async(url,init)=>{
     const u=String(url);
     journal.push((init&&init.method||'GET')+' '+u.split('?')[0].split('.app/')[1]);
     if(u.includes('accounts:signUp'))serveur.signUp++;
     if(u.includes('/filet')){if(((init&&init.method)||'GET')==='PUT'){if(net.coupe)throw new Error('reseau coupe');serveur.filet=JSON.parse(init.body);return {ok:true,status:200};}return {ok:true,json:async()=>serveur.filet};}
     if(u.includes('identitytoolkit')||u.includes('securetoken'))
       return {ok:true,json:async()=>({idToken:'TOK',expiresIn:'3600',refreshToken:'RT'})};
     if(net.coupe)throw new Error('reseau coupe');
     const m=(init&&init.method)||'GET';
     const hd=(init&&init.headers)||{};
     if(u.includes('/state'))serveur.envois.push({m,p:(u.split('?')[0].split('/state')[1]||'').replace('.json',''),body:init&&init.body});
     if(u.includes('/state/rev')){
       const et='E'+(serveur.state?serveur.state.rev:'x');
       if(m==='PUT'&&serveur.intrus){serveur.intrus=false;serveur.state.rev++;}   /* un autre appareil ecrit juste avant */
       if(m==='PUT'){const et2='E'+serveur.state.rev;if(hd['if-match']&&hd['if-match']!==et2)return {ok:false,status:412,json:async()=>null};serveur.state=serveur.state||{};serveur.state.rev=JSON.parse(init.body);return {ok:true,status:200};}
       if(serveur.corsEtag&&hd['X-Firebase-ETag'])throw new TypeError('Failed to fetch');
       return {ok:true,headers:{get:k=>(k==='ETag'&&hd['X-Firebase-ETag']&&!serveur.sansEtag)?et:null},json:async()=>(serveur.state?serveur.state.rev:null)};
     }
     if(u.includes('/state')){
       if(m==='PUT'){serveur.state=JSON.parse(init.body);return {ok:true,status:200};}
       if(m==='PATCH'){   /* comme Firebase : mise a jour multi-chemins, null efface */
         serveur.state=serveur.state||{};const p=JSON.parse(init.body);
         Object.keys(p).forEach(c=>{const s=c.split('/');let o=serveur.state;for(let i=0;i<s.length-1;i++){if(!o[s[i]]||typeof o[s[i]]!=='object')o[s[i]]={};o=o[s[i]];}if(p[c]===null)delete o[s[s.length-1]];else o[s[s.length-1]]=p[c];});
         return {ok:true,status:200};
       }
       return {ok:true,json:async()=>serveur.state};
     }
     if(u.includes('/burn')){
       if(m==='PUT')return {ok:true,status:200};
       return {ok:true,json:async()=>({})};
     }
     if(u.includes('/backups')){return {ok:true,json:async()=>({}),status:200};}
     return {ok:true,json:async()=>null};
   }};
  sb.window=sb;sb.globalThis=sb;sb.self=sb;
  vm.createContext(sb);vm.runInContext(js,sb,{filename:'a.js'});
  // Fenetres maison : reponse immediate via sb.confirm / sb.alert (voir sb.js)
  sb._dialogue=function(o){o=o||{};var v=o.annuler?!!sb.confirm(o.message):(sb.alert(o.message),true);return {then:function(f){return f?f(v):v;}};};
  return {sb,serveur,local,journal,reg,net};
}
const attendre=ms=>new Promise(r=>setTimeout(r,ms));
const X=(e,c)=>vm.runInContext(c,e.sb);
const repas=(n,k)=>[{rid:'r_'+n,name:n,mult:1,macros:{kcal:k,prot:1,gluc:1,lip:1}}];
const base=()=>({rev:2,savedAt:'2026-08-01T10:00:00Z',inv:{frigo:[{id:'a',name:'Riz',qty:500,unit:'g'}]},dayMeals:{}});
const pcEcrit=e=>{e.serveur.state.rev++;e.serveur.state.savedAt='2026-08-21T12:00:00Z';e.serveur.state.dayMeals=Object.assign({},e.serveur.state.dayMeals,{'2026-08-20':repas('Repas du PC',500)});};
const src=fs.readFileSync('index.html','utf8');

(async()=>{
console.log('\n=== LIV. Audit : aucune saisie perdue en silence entre appareils ===');
await t('*** hors ligne, puis un autre appareil ecrit, puis retour du reseau : on demande, rien ne disparait en silence ***',async()=>{
  const e=build({serveur:base()});await e.sb.loadState();await attendre(30);
  e.net.coupe=true;
  e.sb.S.dayMeals['2026-08-21']=repas('Dejeuner hors ligne',777);
  await e.sb.saveState();await attendre(30);
  eq(e.sb._nonEnvoye,true,'envoi non confirme retenu');eq(e.local['liam_nonEnvoye'],'1','retenu sur l appareil');
  pcEcrit(e);
  let q=null;e.sb.confirm=m=>{q=m;return false;};   /* « Plus tard » */
  e.net.coupe=false;await e.sb.saveState();await attendre(60);   /* evenement online */
  if(!q)throw new Error('rechargement silencieux');
  if(!e.sb.S.dayMeals['2026-08-21'])throw new Error('saisie locale perdue');
  if(!e.serveur.state.dayMeals['2026-08-20'])throw new Error('ecriture du PC ecrasee');
});
await t('*** « Recharger » : la saisie d\'ici est mise de cote dans le filet, recuperable ***',async()=>{
  const e=build({serveur:base()});await e.sb.loadState();await attendre(30);
  e.net.coupe=true;e.sb.S.dayMeals['2026-08-21']=repas('Dejeuner hors ligne',777);
  await e.sb.saveState();await attendre(30);
  pcEcrit(e);e.sb.confirm=()=>true;   /* « Recharger » */
  e.net.coupe=false;await e.sb.saveState();await attendre(80);
  if(!e.sb.S.dayMeals['2026-08-20'])throw new Error('version du PC non chargee');
  if(!e.serveur.filet)throw new Error('rien mis de cote');
  const st=JSON.parse(e.serveur.filet.state);
  if(!st.dayMeals['2026-08-21'])throw new Error('la saisie hors ligne manque dans le filet');
  eq(e.serveur.filet.remplacePar,X(e,'MOTIF_AUTRE_APPAREIL'),'motif');
  eq(e.sb._nonEnvoye,false,'drapeau retombe');
});
await t('*** appli relancee hors ligne, autre appareil passe entre-temps : pas d\'ecrasement du cloud au retour du reseau ***',async()=>{
  const e=build({serveur:base()});await e.sb.loadState();await attendre(30);
  e.net.coupe=true;e.sb.S.dayMeals['2026-08-21']=repas('Dejeuner hors ligne',777);
  await e.sb.saveState();await attendre(30);
  pcEcrit(e);
  const e2=build({serveur:e.serveur.state,horsLigne:true,local:e.local});   /* relance sans reseau */
  await e2.sb.loadState();await attendre(30);
  if(!e2.sb.S.dayMeals['2026-08-21'])throw new Error('copie locale non reprise');
  let q=null;e2.sb.confirm=m=>{q=m;return false;};
  e2.net.coupe=false;await e2.sb.saveState();await attendre(60);
  if(!e2.serveur.state.dayMeals['2026-08-20'])throw new Error('le repas du PC a ete ECRASE en silence');
  if(!q)throw new Error('aucune question posee');
});
await t('*** relance en ligne, envoi jamais confirme et cloud ecrit depuis : cloud affiche, saisie d\'ici mise de cote ***',async()=>{
  const e=build({serveur:base()});await e.sb.loadState();await attendre(30);
  e.net.coupe=true;e.sb.S.dayMeals['2026-08-21']=repas('Dejeuner hors ligne',777);
  await e.sb.saveState();await attendre(30);
  pcEcrit(e);
  const e2=build({serveur:e.serveur.state,local:e.local});
  await e2.sb.loadState();await attendre(30);
  if(!e2.sb.S.dayMeals['2026-08-20'])throw new Error('cloud non applique');
  if(!e2.serveur.filet||!JSON.parse(e2.serveur.filet.state).dayMeals['2026-08-21'])throw new Error('saisie locale non mise de cote');
  if(e2.local['liam_nonEnvoye'])throw new Error('drapeau non retombe');
});
await t('relance en ligne, personne d\'autre n\'a ecrit : la saisie est reprise et renvoyee (comme avant)',async()=>{
  const e=build({serveur:base()});await e.sb.loadState();await attendre(30);
  e.net.coupe=true;e.sb.S.dayMeals['2026-08-21']=repas('Dejeuner hors ligne',777);
  await e.sb.saveState();await attendre(30);
  const e2=build({serveur:e.serveur.state,local:e.local});
  await e2.sb.loadState();await attendre(1700);
  if(!e2.serveur.state.dayMeals['2026-08-21'])throw new Error('non renvoyee');
  if(e2.serveur.filet)throw new Error('mise de cote inutile');
  if(e2.local['liam_nonEnvoye'])throw new Error('drapeau reste apres envoi reussi');
});
await t('retour au premier plan avec une saisie en attente : question, pas de rechargement silencieux',async()=>{
  const e=build({serveur:base()});await e.sb.loadState();await attendre(30);
  e.net.coupe=true;e.sb.S.dayMeals['2026-08-21']=repas('Dejeuner hors ligne',777);
  await e.sb.saveState();await attendre(30);
  pcEcrit(e);e.net.coupe=false;
  let q=null;e.sb.confirm=m=>{q=m;return false;};
  await e.sb._checkFresherOnResume();await attendre(30);
  if(!q)throw new Error('rechargement silencieux au retour');
  if(!e.sb.S.dayMeals['2026-08-21'])throw new Error('saisie perdue');
});
await t('retour au premier plan sans rien en attente : rechargement direct (comme avant)',async()=>{
  const e=build({serveur:base()});await e.sb.loadState();await attendre(30);
  pcEcrit(e);let q=null;e.sb.confirm=m=>{q=m;return true;};
  await e.sb._checkFresherOnResume();await attendre(30);
  if(q)throw new Error('question inutile');
  if(!e.sb.S.dayMeals['2026-08-20'])throw new Error('version recente non chargee');
});

console.log('\n=== LV. Audit : session et appareil partage ===');
await t('*** sans compte connecte : aucun compte anonyme cree, rien n\'est lu au demarrage ***',async()=>{
  const e=build({serveur:base()});await attendre(80);
  eq(e.serveur.signUp,0,'comptes anonymes');
  eq(e.journal.length,0,'requetes au demarrage : '+e.journal.join(', '));
  eq(await e.sb.fbAuthToken(),null,'jeton sans session');
});
await t('*** deconnexion : rien du compte ne reste lisible sur l\'appareil ***',async()=>{
  const e=build({serveur:base()});await e.sb.loadState();await attendre(30);
  Object.assign(e.local,{dz_auth:JSON.stringify({uid:'u9',rtok:'r'}),'users/u9_st':'{"x":1}','users/u9_photos':'{}','users/u9_nonEnvoye':'1',
    frigo_state:'{}',fb_rtok:'r',dz_journal:'[]',dz_pesee_plus_tard:'x',dz_bas_vu:'x',anthropic_key:'gsk_x',gemini_key:'AIzaX',dz_nouveautes:'b'});
  e.sb._effacerDonneesLocales('u9');X(e,"localStorage.removeItem('dz_auth')");
  const restes=Object.keys(e.local).filter(k=>!/^(anthropic_key|gemini_key|dz_nouveautes|liam_st)$/.test(k));
  eq(restes.join(','),'','cles restantes');
  eq(e.local.dz_nouveautes,'b','preference de l appareil gardee');
});
await t('deconnexion avec une saisie non envoyee : avertissement, « Annuler » garde la session',async()=>{
  const e=build({serveur:base()});await e.sb.loadState();await attendre(30);
  e.local.dz_auth=JSON.stringify({uid:'u9',rtok:'r'});
  e.net.coupe=true;e.sb.S.dayMeals['2026-08-21']=repas('Pas envoye',300);
  let n=0;e.sb.confirm=m=>{n++;return n===1;};   /* oui a « Se deconnecter ? », non a « quand meme » */
  await e.sb.deconnexion();
  eq(n,2,'avertissement');
  if(!e.local.dz_auth)throw new Error('session effacee malgre Annuler');
});
await t('hors ligne sans copie du compte : plus de repli sur frigo_state (donnees d\'avant les comptes)',async()=>{
  const e=build({serveur:base(),horsLigne:true,local:{frigo_state:JSON.stringify({inv:{frigo:[]},dayMeals:{'2020-01-01':repas('Ancien',1)}})}});
  await e.sb.loadState();
  if(e.sb.S.dayMeals['2020-01-01'])throw new Error('frigo_state applique');
});

console.log('\n=== LVI. Audit : entrees piegees (sauvegarde importee, IA, OpenFoodFacts) ===');
await t('*** identifiant avec apostrophe neutralise, nom avec apostrophe intact ***',async()=>{
  const e=build({});
  const o=e.sb._neutre({id:"x');alert(1);('",name:"Huile d'olive",used:[{id:"a'b",n:"Pomme d'api"}],rid:'liam_v6_ok'});
  if(/'/.test(o.id)||/'/.test(o.used[0].id))throw new Error('apostrophe restee : '+o.id);
  eq(o.name,"Huile d'olive");eq(o.used[0].n,"Pomme d'api");eq(o.rid,'liam_v6_ok');
});
await t('*** jour, pesee et activite a cle piegee : ignores au chargement ***',async()=>{
  const e=build({});
  e.sb._applyState({inv:{frigo:[]},dayMeals:{"2026-08-01');x('":repas('Piege',1),'2026-08-02':repas('Bon',1)},
    weights:[{d:"x');y('",w:80},{d:'2026-08-02',w:81}]});
  const j=Object.keys(e.sb.S.dayMeals);
  if(j.some(k=>/'/.test(k)))throw new Error('cle piegee gardee');
  if(j.indexOf('2026-08-02')<0)throw new Error('jour legitime perdu');
  eq(e.sb.S.weights.map(w=>w.d).join(','),'2026-08-02');
  const b=e.sb._burnSur({"2026-08-01/../cles":{steps:1},'2026-08-03':{steps:5,activities:[{name:'<b>x</b>'}]}});
  eq(Object.keys(b).join(','),'2026-08-03');
  if(/</.test(b['2026-08-03'].activities[0].name))throw new Error('activite non neutralisee');
});
await t('*** aucun nom insere dans un onclick sans _attr (un & de nom OpenFoodFacts en sortirait) ***',async()=>{
  const m=src.match(/on[a-z]+="[^"]{0,160}JSON\.stringify\([^)]*\)\.replace/g);
  if(m)throw new Error(m.length+' insertion(s) : '+m[0].slice(0,80));
  const n=src.match(/on[a-z]+="[^"]{0,200}\$\{[^}]*\.name\}/g);
  if(n)throw new Error('nom brut dans un gestionnaire : '+n[0].slice(0,80));
});
await t('*** mots vides : une seule table par usage, « nature » et « bio » ne rapprochent plus deux aliments ***',async()=>{
  const e=build({});
  eq((src.match(/var _MOTS_VIDES\s*=/g)||[]).length,1,'declarations de _MOTS_VIDES');
  eq(e.sb._nomsCompatibles('Yaourt nature','Riz nature'),false,'nature');
  eq(e.sb._nomsCompatibles('Pâtes bio','Tomates bio'),false,'bio');
  eq(e.sb._nomsCompatibles('Lait sans lactose','Beurre sans sel'),false,'sans');
  eq(e.sb._nomsCompatibles('Riz basmati','Riz complet'),true,'mot commun reel');
});
await t('liens externes : rel="noopener" partout',async()=>{
  const l=(src.match(/<a [^>]*target="_blank"[^>]*>/g)||[]).filter(a=>!/noopener/.test(a));
  eq(l.length,0,'liens sans noopener');
});
await t('filet : libelle selon son origine, texte inconnu neutralise',async()=>{
  const e=build({});const L=x=>e.sb._libFilet({remplacePar:x});
  if(!/autre appareil/.test(L(X(e,'MOTIF_AUTRE_APPAREIL'))))throw new Error('autre appareil');
  if(!/restauration de la sauvegarde du 2026-10-01/.test(L('2026-10-01')))throw new Error('restauration');
  if(!/import/.test(L('import de sauvegarde')))throw new Error('import');
  if(/</.test(L('<img src=x>')))throw new Error('non neutralise');
});
console.log('---- '+pass+' ok, '+fail+' KO');
})();
