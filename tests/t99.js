// Nouveau compte sans inventaire ni repas : le profil se perdait a chaque modification (15/10/2026)
// Faux Firebase de t90, qui comme le vrai ne garde ni tableau ni objet vide.
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;
function t(n,f){return f().then(()=>{console.log('  ok  '+n);pass++;})
  .catch(e=>{console.log('  KO  '+n+' -> '+e.message);fail++;});}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
function sansVides(v){
  if(Array.isArray(v)){const a=v.map(sansVides).filter(x=>x!==undefined);return a.length?a:undefined;}
  if(v&&typeof v==='object'){const o={};Object.keys(v).forEach(k=>{const x=sansVides(v[k]);if(x!==undefined&&x!==null)o[k]=x;});return Object.keys(o).length?o:undefined;}
  return v;
}
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
       if(m==='PUT'){serveur.state=sansVides(JSON.parse(init.body));return {ok:true,status:200};}
       if(m==='PATCH'){   /* comme Firebase : mise a jour multi-chemins, null efface */
         serveur.state=serveur.state||{};const p=JSON.parse(init.body);
         Object.keys(p).forEach(c=>{const s=c.split('/');let o=serveur.state;for(let i=0;i<s.length-1;i++){if(!o[s[i]]||typeof o[s[i]]!=='object')o[s[i]]={};o=o[s[i]];}if(p[c]===null)delete o[s[s.length-1]];else o[s[s.length-1]]=p[c];});
         serveur.state=sansVides(serveur.state);
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
const PROFIL={prenom:'Zoé',emoji:'🌸',sexe:'F',naissance:'1996-05-04',taille:165,poids:62,objectif:'maintien',activite:2,
  cibles:{kcal:1850,prot:110,gluc:210,lip:62},login:'zoe'};
const compte=async(e)=>{X(e,"ACTIVE_PROFILE='users/Z1'");e.sb.__p=JSON.parse(JSON.stringify(PROFIL));await X(e,"_initNouveauProfil('users/Z1',__p,'','')");};
const ouvrir=async(e)=>{X(e,"ACTIVE_PROFILE='users/Z1';_loaded=false;S.inv=JSON.parse(JSON.stringify(INV_VIDE));S.dayMeals={};S.profil=null;TARGETS=CIBLES_PAR_DEFAUT;");await e.sb.loadState();await attendre(200);};   /* laisse finir la mise au format et la sauvegarde du jour (une fois) */

(async()=>{
console.log('\n=== LXIX. Nouveau compte sans inventaire ni repas : le profil tient ===');
await t('le faux Firebase se comporte comme le vrai : l\'etat d\'inscription n\'a ni inventaire ni repas',async()=>{
  const e=build();await compte(e);
  if(e.serveur.state.inv||e.serveur.state.dayMeals)throw new Error('vides gardes');
  eq(e.serveur.state.profil.prenom,'Zoé');eq(e.serveur.state.rev,1);
});
await t('*** a l\'ouverture, le profil et les cibles du cloud sont repris (avant : perte de poids, 2000 kcal par defaut) ***',async()=>{
  const e=build();await compte(e);await ouvrir(e);
  eq(e.sb.S.profil&&e.sb.S.profil.prenom,'Zoé','profil');eq(X(e,'TARGETS.kcal'),1850,'cibles');eq(X(e,'_objectif()'),'maintien','objectif');
  if(!(X(e,'_stateRev')>=1))throw new Error('revision du cloud non reprise : '+X(e,'_stateRev'));eq(X(e,'_syncStatus'),'ok','pas « hors ligne »');
});
await t('la mise au format de l\'etat d\'inscription ne joue qu\'une fois : l\'ouverture suivante n\'ecrit rien',async()=>{
  const e=build();await compte(e);await ouvrir(e);
  const n=e.serveur.envois.filter(x=>x.m!=='GET').length;
  X(e,'_loaded=false');await e.sb.loadState();await attendre(200);
  eq(e.serveur.envois.filter(x=>x.m!=='GET').length,n,'ecritures au second chargement');
});
await t('*** modifier le profil part dans le cloud, sans question « autre appareil » ***',async()=>{
  const e=build();await compte(e);await ouvrir(e);
  let q=null;e.sb.confirm=m=>{q=m;return true;};
  const r0=e.serveur.state.rev;
  X(e,"S.profil.cibles.kcal=1900;S.profil.objectif='perte';TARGETS=_ciblesProfil();");
  await e.sb.saveState();await attendre(40);
  if(q)throw new Error('question posee : '+q.slice(0,60));
  eq(e.serveur.state.profil.cibles.kcal,1900,'cible envoyee');eq(e.serveur.state.profil.objectif,'perte');
  eq(e.serveur.state.rev,r0+1,'une revision de plus');
});
await t('*** rouvert sur un autre appareil (rien en local) : les modifications sont la ***',async()=>{
  const e=build();await compte(e);await ouvrir(e);
  X(e,"S.profil.cibles.kcal=1900;TARGETS=_ciblesProfil();");await e.sb.saveState();await attendre(40);
  const e2=build({serveur:e.serveur.state});await ouvrir(e2);
  eq(X(e2,'TARGETS.kcal'),1900);eq(e2.sb.S.profil&&e2.sb.S.profil.prenom,'Zoé');
});
await t('un premier repas puis un second enregistrement : tout tient',async()=>{
  const e=build();await compte(e);await ouvrir(e);
  e.sb.S.dayMeals[e.sb.S.today]=[{rid:'r1',name:'Salade',mult:1,macros:{kcal:400,prot:20,gluc:30,lip:15}}];
  await e.sb.saveState();await attendre(40);
  X(e,"S.profil.cibles.kcal=1950;TARGETS=_ciblesProfil();");await e.sb.saveState();await attendre(40);
  const e2=build({serveur:e.serveur.state});await ouvrir(e2);
  eq(X(e2,'TARGETS.kcal'),1950);eq((e2.sb.S.dayMeals[e2.sb.S.today]||[]).length,1,'repas');
});
await t('*** un etat du cloud sans repas (tous supprimes ailleurs) vide bien les repas affiches ici ***',async()=>{
  const e=build();await compte(e);await ouvrir(e);
  e.sb.S.dayMeals[e.sb.S.today]=[{rid:'r1',name:'Salade',mult:1,macros:{kcal:400,prot:20,gluc:30,lip:15}}];
  await e.sb.saveState();await attendre(40);
  delete e.serveur.state.dayMeals;e.serveur.state.rev++;   /* l'autre appareil a tout supprime */
  await X(e,'_reloadFromServer(true)');await attendre(30);
  eq(Object.keys(e.sb.S.dayMeals).filter(d=>(e.sb.S.dayMeals[d]||[]).length).length,0,'repas fantomes');
});
await t('un etat vide ou absent du cloud ne remplace rien (garde-fou inchange)',async()=>{
  const e=build({serveur:null,local:{'users/Z1_st':JSON.stringify({rev:3,_profile:'users/Z1',profil:PROFIL,inv:{frigo:[],placards:[],congelateur:[],epices:[]},dayMeals:{}})}});
  await ouvrir(e);eq(e.sb.S.profil&&e.sb.S.profil.prenom,'Zoé','copie locale reprise');
  const e2=build({serveur:{}});await ouvrir(e2);eq(e2.sb.S.profil,null,'objet vide : rien a appliquer');
});
console.log('---- '+pass+' ok, '+fail+' KO');
})();
