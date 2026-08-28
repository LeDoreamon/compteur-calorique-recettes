const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}

// Bac a sable avec une heure pilotable
function monde(heure){
  // heure = heure voulue a Paris. Intl lit l'instant reel, pas getHours(),
  // donc on fabrique l'instant UTC correspondant (Paris = UTC+2 en aout).
  const isoUTC=new Date(Date.UTC(2026,7,24,(heure+22)%24,0,0)).toISOString();
  let js=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  js+='\n;["S","RCP","TARGETS","coachAdvice","_phaseJournee","_suggereRecette","getDayMacros","canCook","cookedToday","findItem"].forEach(function(n){try{globalThis[n]=eval(n);}catch(e){}});';
  const reg={};
  function mk(){return{value:'',checked:false,textContent:'',innerHTML:'',className:'',style:{},cssText:'',dataset:{},
    offsetWidth:100,placeholder:'',classList:{add(){},remove(){},contains:()=>false,toggle(){}},focus(){},
    appendChild(){},setAttribute(){},getAttribute(){return null;},querySelector(){return null;},
    querySelectorAll(){return[];},addEventListener(){},files:[]};}
  const de=id=>{if(!reg[id])reg[id]=mk();return reg[id];};
  const RD=Date;
  class FD extends RD{constructor(...a){if(!a.length)super(isoUTC);else super(...a);}
    static now(){return new RD(isoUTC).getTime();}}
  const sb={console:{log(){},warn(){},error(){}},Math,Date:FD,JSON,Intl,parseFloat,parseInt,isNaN,isFinite,
   Array,Object,String,Number,Boolean,RegExp,Promise,Map,Set,encodeURIComponent,decodeURIComponent,
   document:{getElementById:de,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>mk(),
     addEventListener(){},hidden:false,body:{appendChild(e){reg['coach-toast']=e;}},
     documentElement:mk(),head:mk()},
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
  // Inventaire reel : sans lui, aucune recette n'est realisable
  const INV=require('./data/inv.json');
  const frigo=[];
  Object.keys(INV).forEach(k=>{
    const it=INV[k];
    const o={id:it.id,name:it.n,unit:it.u,qty:(it.q===-1?null:it.q),
             mac100:it.m?{kcal:it.m[0],prot:it.m[1],gluc:it.m[2],lip:it.m[3]}:null};
    if(it.piece)o.macPiece={kcal:it.piece[0],prot:it.piece[1],gluc:it.piece[2],lip:it.piece[3]};
    if(it.pkg)o.pkg={size:it.pkg};
    frigo.push(o);
  });
  sb.S.inv={frigo:frigo,placards:[],congelateur:[],epices:[]};
  return sb;
}
function journee(sb,kcal,prot){
  sb.S.dayMeals[sb.S.today]=[{rid:'x',name:'J',mult:1,macros:{kcal:kcal,prot:prot,gluc:50,lip:20}}];
}

console.log('\n=== BH. Phase de la journee ===');
t('8 h = debut',()=>eq(monde(8)._phaseJournee(),'debut'));
t('12 h = debut',()=>eq(monde(12)._phaseJournee(),'debut'));
t('16 h = milieu',()=>eq(monde(16)._phaseJournee(),'milieu'));
t('22 h = fin',()=>eq(monde(22)._phaseJournee(),'fin'));
t('*** 2 h du matin = fin (garde nocturne) ***',()=>eq(monde(2)._phaseJournee(),'fin'));
t('un jour passe est toujours clos',()=>{
  const sb=monde(9);
  eq(sb._phaseJournee('2020-01-01'),'close');
});

console.log('\n=== BI. Le ton suit l\'heure ===');
t('*** a 8 h, le reste n\'est pas presente comme un manque ***',()=>{
  const sb=monde(8);journee(sb,500,25);
  const a=sb.coachAdvice();
  if(/manqu|à aller chercher|sous ta cible/i.test(a.corps))throw new Error(a.corps);
  if(!/suite de la journée/i.test(a.corps))throw new Error(a.corps);
});
t('*** a 22 h, la meme journee devient un constat ***',()=>{
  const sb=monde(22);journee(sb,500,25);
  const a=sb.coachAdvice();
  if(/suite de la journée/i.test(a.corps))throw new Error('encore au futur : '+a.corps);
  if(!/termin|Bilan/i.test(a.titre+a.corps))throw new Error(a.titre+' / '+a.corps);
});
t('journee complete a 22 h : felicitations normales',()=>{
  const sb=monde(22);journee(sb,2550,178);
  const a=sb.coachAdvice();
  eq(a.ton,'ok');
});
t('le depassement garde son ton rassurant',()=>{
  const sb=monde(22);journee(sb,2900,180);
  const a=sb.coachAdvice();
  if(!/ne casse rien|ne se voit pas|repars|reprends/i.test(a.corps))throw new Error(a.corps);
});
t('aucun message culpabilisant',()=>{
  [8,13,16,22].forEach(hh=>{
    [[400,20],[1500,90],[2600,175],[3200,200]].forEach(([k,p])=>{
      const sb=monde(hh);journee(sb,k,p);
      const a=sb.coachAdvice();
      if(/tu dois|il faut absolument|rattrape|compense|coupable|honte/i.test(a.corps))
        throw new Error(hh+'h '+k+'kcal : '+a.corps);
    });
  });
});

console.log('\n=== BJ. Suggestion de recette ===');
t('*** une recette realisable est proposee ***',()=>{
  const sb=monde(12);journee(sb,800,40);
  const a=sb.coachAdvice();
  if(!/«/.test(a.corps))throw new Error('aucune suggestion : '+a.corps);
});
t('la recette proposee tient dans le reste',()=>{
  const sb=monde(12);journee(sb,800,40);
  const r=sb._suggereRecette(1800,135);
  if(!r)throw new Error('rien propose');
  if(r.kcal>1880)throw new Error(r.name+' : '+r.kcal+' kcal pour 1800 de marge');
});
t('*** priorite aux proteines quand il en manque ***',()=>{
  const sb=monde(12);
  const r=sb._suggereRecette(1000,100);
  if(!r)throw new Error('rien propose');
  const mieux=(sb.RCP||[]).filter(x=>x.slots&&x.slots.length&&x.profile==='liam'&&x.kcal<=1080&&x.kcal>0);
  const max=Math.max.apply(null,mieux.map(x=>x.prot||0));
  eq(r.prot,max,'doit prendre la plus proteinee qui rentre');
});
t('pas de suggestion si la marge est trop faible',()=>{
  eq(monde(12)._suggereRecette(150,10),null);
});
t('pas de suggestion en fin de journee',()=>{
  const sb=monde(22);journee(sb,800,40);
  if(/«/.test(sb.coachAdvice().corps))throw new Error('propose alors que la journee est finie');
});
t('pas de suggestion sur un jour passe',()=>{
  const sb=monde(12);
  sb.S.dayMeals['2020-01-01']=[{rid:'x',name:'J',mult:1,macros:{kcal:800,prot:40,gluc:50,lip:20}}];
  if(/«/.test(sb.coachAdvice('2020-01-01').corps))throw new Error('propose sur un jour clos');
});
t('aucune recette hors stock n\'est proposee',()=>{
  const sb=monde(12);
  sb.S.inv={frigo:[],placards:[],congelateur:[],epices:[]};   // plus rien
  eq(sb._suggereRecette(1500,80),null);
});
t('les recettes d\'un autre profil sont exclues',()=>{
  const sb=monde(12);
  const r=sb._suggereRecette(1500,80);
  if(r&&r.profile&&r.profile!=='liam')throw new Error(r.name+' appartient a '+r.profile);
});

console.log('\n=== BK. Robustesse ===');
t('journee vide',()=>{
  const sb=monde(9);sb.S.dayMeals={};
  const a=sb.coachAdvice();
  if(!a.titre||!a.corps)throw new Error('reponse incomplete');
  if(/undefined|NaN/.test(a.titre+a.corps))throw new Error(a.corps);
});
t('aucun NaN ni undefined a toute heure',()=>{
  [3,8,13,19,23].forEach(hh=>{
    [[0,0],[300,10],[2600,175],[4000,250]].forEach(([k,p])=>{
      const sb=monde(hh);journee(sb,k,p);
      const a=sb.coachAdvice();
      if(/undefined|NaN/.test(a.titre+a.corps))throw new Error(hh+'h '+k+' : '+a.corps);
    });
  });
});
t('le ton reste une valeur connue',()=>{
  [8,16,22].forEach(hh=>{
    [[0,0],[1200,60],[2600,175],[3500,200]].forEach(([k,p])=>{
      const sb=monde(hh);journee(sb,k,p);
      const tn=sb.coachAdvice().ton;
      if(['ok','mixte','sur'].indexOf(tn)<0)throw new Error('ton inconnu : '+tn);
    });
  });
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
