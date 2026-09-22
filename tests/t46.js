const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');
const piege='<img src=x onerror="alert(1)">';

console.log('\n=== GA. Neutralisation des entrees ===');
t('*** une balise est desamorcee ***',()=>{
  const v=G('_neutre')(piege);
  if(/[<>"]/.test(v))throw new Error('caractere dangereux restant : '+v);
});
t('un nom ordinaire est inchange',()=>{
  eq(G('_neutre')("Huile d'olive"),"Huile d'olive");
  eq(G('_neutre')('Crème fraîche 5,5 %'),'Crème fraîche 5,5 %');
});
t('la neutralisation descend dans les objets et tableaux',()=>{
  const o=G('_neutre')({a:[{n:piege}],b:{c:piege},k:12,z:null});
  if(/[<>"]/.test(JSON.stringify(o).replace(/\\"/g,'').replace(/"/g,'')))throw new Error(JSON.stringify(o));
  eq(o.k,12);eq(o.z,null);
});
t('*** un nom piege venu de la base n\'atteint pas la page ***',()=>{
  sb._applyState({inv:{frigo:[{id:'x',name:piege,qty:100,unit:'g',mac100:{kcal:1,prot:0,gluc:0,lip:0}}]},dayMeals:{}});
  const it=sb.findItem('x');
  if(/[<>"]/.test(it.name))throw new Error('nom non neutralise : '+it.name);
  S.mainTab='inventory';S.editMode=true;
  const h=G('renderInv')();
  if(h.indexOf('<img src=x')>=0)throw new Error('balise injectee dans le rendu');
  S.editMode=false;
});
t('*** un repas piege aussi ***',()=>{
  sb._applyState({inv:{frigo:[]},dayMeals:{[S.today]:[{rid:'r',name:piege,mult:1,macros:{kcal:1,prot:0,gluc:0,lip:0}}]}});
  if(/[<>"]/.test(S.dayMeals[S.today][0].name))throw new Error('repas non neutralise');
});
t('*** une reponse d\'IA piegee est desamorcee ***',()=>{
  const o=G('extractJSON')('{"name":"'+piege.replace(/"/g,'\\"')+'"}');
  if(/[<>"]/.test(o.name))throw new Error(o.name);
  const a=G('extractJSONArray')('[{"n":"<b>x</b>"}]');
  if(/[<>]/.test(a[0].n))throw new Error(a[0].n);
});
t('le JSON d\'IA valide reste exploitable',()=>{
  const o=G('extractJSON')('texte {"kcal":450,"prot":30} fin');
  eq(o.kcal,450);eq(o.prot,30);
});

console.log('\n=== GB. Photos ===');
t('*** seule une vraie image est acceptee ***',()=>{
  const ok='data:image/jpeg;base64,/9j/4AAQSk==';
  const r=G('_photosSures')({a:ok,b:'x" onerror="alert(1)',c:'javascript:alert(1)',d:'data:text/html;base64,PHNjcmlwdD4=',e:12});
  eq(Object.keys(r).join(','),'a');
});
t('la neutralisation est cablee au chargement des photos',()=>{
  eq((src.match(/_photosSures\(/g)||[]).length,3,'definition + deux usages');
});

console.log('\n=== GC. Hygiene du code ===');
t('*** aucune fonction de premier niveau en double ***',()=>{
  const js=src.match(/<script>([\s\S]*?)<\/script>/)[1];
  const top=[...js.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m=>m[1]);
  const d=top.filter((x,i)=>top.indexOf(x)!==i);
  if(d.length)throw new Error(d.join(', '));
});
t('*** aucune fonction jamais appelee ***',()=>{
  const js=src.match(/<script>([\s\S]*?)<\/script>/)[1];
  const defs=[...new Set([...js.matchAll(/(?:^|[^\w$.])function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]))];
  const morts=defs.filter(function(f){
    const n=(src.match(new RegExp('(?<![\\w$])'+f.replace(/\$/g,'\\$')+'(?![\\w$])','g'))||[]).length;
    const d=(js.match(new RegExp('function\\s+'+f.replace(/\$/g,'\\$')+'\\s*\\(','g'))||[]).length;
    return n<=d;
  });
  if(morts.length)throw new Error(morts.join(', '));
});
t('*** aucun secret dans le source ***',()=>{
  [/ghp_[A-Za-z0-9]{20,}/,/gsk_[A-Za-z0-9]{20,}/,/sk-ant-[A-Za-z0-9-]{20,}/,/sk-[A-Za-z0-9]{32,}/].forEach(function(p){
    if(p.test(src))throw new Error('motif trouve : '+p);
  });
});
t('aucun console.log ni debugger',()=>{
  const js=src.match(/<script>([\s\S]*?)<\/script>/)[1];
  if(/console\.log\(/.test(js))throw new Error('console.log');
  if(/\bdebugger\b/.test(js))throw new Error('debugger');
});

console.log('\n=== GD. Aucun ecran ne plante ===');
t('*** chaque onglet se rend sans erreur, vide ou rempli ***',()=>{
  const INV=require('./data/inv.json');
  const plein={frigo:[],placards:[],congelateur:[],epices:[]};
  Object.keys(INV).forEach(function(k){const it=INV[k];const o={id:it.id,name:it.n,unit:it.u,qty:(it.q===-1?null:it.q)};
    if(it.piece)o.macPiece={kcal:it.piece[0],prot:it.piece[1],gluc:it.piece[2],lip:it.piece[3]};
    else o.mac100={kcal:it.m[0],prot:it.m[1],gluc:it.m[2],lip:it.m[3]};plein.placards.push(o);});
  [{frigo:[],placards:[],congelateur:[],epices:[]},plein].forEach(function(inv,n){
    S.inv=JSON.parse(JSON.stringify(inv));
    S.dayMeals[S.today]=n?[{rid:'x',name:'R',mult:1,slot:'lunch',macros:{kcal:700,prot:50,gluc:60,lip:20}}]:[];
    ['accueil','recipes','inventory','courses','weight'].forEach(function(tab){
      S.mainTab=tab;
      [false,true].forEach(function(ed){S.editMode=ed;
        try{sb.render();}catch(e){throw new Error(tab+(ed?' (edition)':'')+(n?' plein':' vide')+' : '+e.message);}
      });
    });
    ['breakfast','lunch','dinner','snack','perso','fav','dlc'].forEach(function(mt){
      S.mainTab='recipes';S.mealTab=mt;
      try{sb.render();}catch(e){throw new Error('recettes/'+mt+' : '+e.message);}
    });
  });
  S.editMode=false;
});
t('le rendu ne laisse passer ni undefined ni NaN visibles',()=>{
  S.mainTab='accueil';sb.render();
  const h=docEl('root').innerHTML.replace(/<[^>]+>/g,' ');
  if(/\bundefined\b|\bNaN\b/.test(h))throw new Error((h.match(/.{0,40}(undefined|NaN).{0,40}/)||[])[0]);
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
