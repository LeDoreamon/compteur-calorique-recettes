const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}

// Bac a sable avec profil pilotable
function monde(profil){
  let js=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  js+='\n;try{ACTIVE_PROFILE="'+profil+'";TARGETS=("'+profil+'"==="maureen")?MAUREEN_TARGETS:LIAM_TARGETS;}catch(e){}';
  js+='\n;["S","RCP","openAddMeal","setMealStock","invAddMeal","manualAddMeal","invPickQty","applyInvPick","findItem","confirmAddMealFinal","ACTIVE_PROFILE"].forEach(function(n){try{globalThis[n]=eval(n);}catch(e){}});';
  js+='\n;try{globalThis.__useStock=function(){return _addMealUseStock;};globalThis.__profil=function(){return ACTIVE_PROFILE;};}catch(e){}';
  const reg={};
  function mk(){return{value:'',checked:false,textContent:'',innerHTML:'',className:'',style:{},cssText:'',
    dataset:{},offsetWidth:100,placeholder:'',classList:{add(){},remove(){},contains:()=>false,toggle(){}},
    focus(){},click(){},appendChild(){},setAttribute(){},getAttribute(){return null;},querySelector(){return null;},
    querySelectorAll(){return[];},addEventListener(){},files:[]};}
  const de=id=>{if(!reg[id])reg[id]=mk();return reg[id];};
  const RD=Date;class FD extends RD{getHours(){return 12;}}
  const sb={console:{log(){},warn(){},error(){}},Math,Date:FD,JSON,parseFloat,parseInt,isNaN,isFinite,
   Array,Object,String,Number,Boolean,RegExp,Promise,Map,Set,encodeURIComponent,decodeURIComponent,
   document:{getElementById:de,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>mk(),
     addEventListener(){},hidden:false,body:{appendChild(e){reg['coach-toast']=e;}},documentElement:mk(),head:mk()},
   localStorage:{getItem:()=>null,setItem(){},removeItem(){}},sessionStorage:{getItem:()=>null,setItem(){}},
   navigator:{userAgent:'node'},alert(){},confirm:()=>true,prompt:()=>'',
   setTimeout(f,d){if(typeof f==='function'&&(!d||d<100))f();return 1;},clearTimeout(){},setInterval(){},
   clearInterval(){},requestAnimationFrame(){},AbortController:class{constructor(){this.signal={};}abort(){}},
   fetch:async()=>({ok:true,json:async()=>({})}),URL:{createObjectURL:()=>''},Blob:function(){},Image:function(){},
   firebase:{initializeApp:()=>({}),database:()=>({ref:()=>({on(){},set:()=>Promise.resolve(),
     once:()=>Promise.resolve({val:()=>null})})})},
   location:{href:''},history:{pushState(){}},addEventListener(){},removeEventListener(){},
   matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})};
  sb.window=sb;sb.globalThis=sb;sb.self=sb;
  vm.createContext(sb);vm.runInContext(js,sb,{filename:'a.js'});
  sb.S.inv={frigo:[{id:'p',name:'Poulet',unit:'g',qty:500,mac100:{kcal:120,prot:23,gluc:0,lip:2}}],
            placards:[],congelateur:[],epices:[]};
  return {sb:sb,de:de};
}

console.log('\n=== BZ. Defaut selon le profil ===');
t('le bac a sable applique bien le profil',()=>{
  eq(monde('maureen').sb.__profil(),'maureen');
  eq(monde('liam').sb.__profil(),'liam');
});
t('*** Maureen : « Non » par defaut sur un repas hors recette ***',()=>{
  const m=monde('maureen');
  m.sb.openAddMeal('text');
  eq(m.sb.__useStock(),false,'_addMealUseStock');
});
t('*** Liam : « Oui » par defaut, inchange ***',()=>{
  const m=monde('liam');
  m.sb.openAddMeal('text');
  eq(m.sb.__useStock(),true,'_addMealUseStock');
});
t('le bouton Non est visuellement actif pour Maureen',()=>{
  const m=monde('maureen');
  m.sb.openAddMeal('text');
  const oui=m.de('ms-yes').style.cssText||'', non=m.de('ms-no').style.cssText||'';
  if(!/var\(--accent\)/.test(non))throw new Error('Non non surligne : '+non);
  if(/background:var\(--accent\);/.test(oui))throw new Error('Oui surligne a tort');
});
t('le bouton Oui reste actif pour Liam',()=>{
  const m=monde('liam');
  m.sb.openAddMeal('text');
  if(!/var\(--accent\)/.test(m.de('ms-yes').style.cssText||''))throw new Error('Oui non surligne');
});
t('la photo et le manuel suivent le meme defaut',()=>{
  ['photo','text'].forEach(function(type){
    const m=monde('maureen');
    m.sb.openAddMeal(type);
    eq(m.sb.__useStock(),false,type);
  });
});

console.log('\n=== CA. Le choix reste modifiable ===');
t('Maureen peut repasser a Oui',()=>{
  const m=monde('maureen');
  m.sb.openAddMeal('text');
  m.sb.setMealStock(true);
  eq(m.sb.__useStock(),true);
});
t('Liam peut passer a Non',()=>{
  const m=monde('liam');
  m.sb.openAddMeal('text');
  m.sb.setMealStock(false);
  eq(m.sb.__useStock(),false);
});
t('le choix est reinitialise a chaque ouverture',()=>{
  const m=monde('maureen');
  m.sb.openAddMeal('text');m.sb.setMealStock(true);
  m.sb.openAddMeal('text');
  eq(m.sb.__useStock(),false,'doit revenir au defaut du profil');
});

console.log('\n=== CB. Composer depuis l\'inventaire ===');
t('*** choisir l\'inventaire reactive la deduction, meme pour Maureen ***',()=>{
  const m=monde('maureen');
  m.sb.openAddMeal('text');
  eq(m.sb.__useStock(),false,'avant');
  m.sb.invAddMeal();
  eq(m.sb.__useStock(),true,'apres avoir choisi l\'inventaire');
});
t('idem pour Liam',()=>{
  const m=monde('liam');
  m.sb.openAddMeal('text');m.sb.setMealStock(false);
  m.sb.invAddMeal();
  eq(m.sb.__useStock(),true);
});
t('*** le stock de Maureen est bien deduit dans ce cas ***',()=>{
  const m=monde('maureen');
  m.sb.openAddMeal('text');m.sb.invAddMeal();
  m.sb.invPickQty('p',200);m.sb.applyInvPick();
  m.de('addmeal-name').value='Test';
  // hydrate les cases generees
  const h=m.de('inv-items-section').innerHTML||'';
  const re=/<input\b([^>]*)>/g;let x;
  while((x=re.exec(h))){const a=x[1];const id=(a.match(/id="([^"]+)"/)||[])[1];if(!id)continue;
    const el=m.de(id);const v=(a.match(/value="([^"]*)"/)||[])[1];
    if(v!==undefined)el.value=v;el.checked=/\bchecked\b/.test(a);}
  m.sb.confirmAddMealFinal();
  eq(m.sb.findItem('p').qty,300,'500 - 200');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
