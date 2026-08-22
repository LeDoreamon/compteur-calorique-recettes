const vm=require('vm');const fs=require('fs');
let js=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
js+='\n;try{globalThis.S=S;globalThis.RCP=RCP;globalThis.TARGETS=TARGETS;}catch(e){}';
js+='\n;try{globalThis.INV_DEFAULT=INV_DEFAULT;}catch(e){}';
js+='\n;["_refreshToday","_burnSave","estimateTDEE","renderTDEEBlock","toggleBackupList","annulerRestauration","clearApiKey","openItemDetail","saveItemDetail","stepInvPkg","renderInvDiag","invIssues","itemMealMacros","findItem","apprendNomsIngredients","resolveInv","runMergeDuplicates","_triRecettes","_densProt","setRecTri","toggleRecTriDir","renderRecTri","canCook","cookedToday","titreDepuisInventaire","_nomCourt","_catDeLArticle","invPickQty","applyInvPick","openInvPick","invAddMeal","openAddMeal"].forEach(function(n){try{globalThis[n]=eval(n);}catch(e){}});';
js+='\n;["getDayMacros","_reconcileMacros","findItemByName","invIssues","countDuplicates","recipeMacros","canCook","findRecipe","copyMealTo","burnStepKcal","burnDayTotal","extractJSON","extractJSONArray","_parseQty","_normNom","_applyState","getToday","resolveInv","mergeDuplicates","matchIngToInventory","getM100","effDlc","normMac","calorieRing","missingIngredients","shopSuggestions","_stockBas","coachAdvice","estimateTDEE","avgMacrosOverDays","weightTrendPerWeek"].forEach(function(n){try{globalThis[n]=eval(n);}catch(e){}});';
js+='\n;["openAddMeal","manualAddMeal","setInvMode","openInvPick","invPickQty","applyInvPick","renderInvSuggestions","recalcAddMealMacros","itemMealMacros","findItem","apprendNomsIngredients","resolveInv","runMergeDuplicates","_triRecettes","_densProt","setRecTri","toggleRecTriDir","renderRecTri","canCook","cookedToday","titreDepuisInventaire","_nomCourt","_catDeLArticle","invPickQty","applyInvPick","openInvPick","invAddMeal","openAddMeal","renderInvPick","_invPickSum","confirmAddMealFinal","openFreeOverlay","fillFreeReview","confirmFreeEntry","renderFreeInv","toggleFreeInv","updateFreeTotals"].forEach(function(n){try{globalThis[n]=eval(n);}catch(e){}});';
js+='\n;try{globalThis.__getInvPick=function(){return _invPick;};}catch(e){}';
js+='\n;try{globalThis.__getSugg=function(){return _addMealInvSuggestions;};}catch(e){}';
js+='\n;try{globalThis.__setSugg=function(v){_addMealInvSuggestions=v;};}catch(e){}';
js+='\n;try{globalThis.__setBase=function(b){_addMealBase=b;};}catch(e){}';

const reg={};
function makeEl(){return{value:'',checked:false,textContent:'',innerHTML:'',className:'',
 style:{},cssText:'',dataset:{},offsetWidth:100,placeholder:'',
 classList:{add(){},remove(){},contains:()=>false,toggle(){}},
 focus(){},appendChild(){},setAttribute(){},getAttribute(){return null;},
 querySelector(){return null;},querySelectorAll(){return[];},addEventListener(){},files:[]};}
const docEl=id=>{if(!reg[id])reg[id]=makeEl();return reg[id];};
const RD=Date;class FD extends RD{getHours(){return 12;}}
const sb={console,Math,Date:FD,JSON,parseFloat,parseInt,isNaN,isFinite,
 Array,Object,String,Number,Boolean,RegExp,Promise,Map,Set,
 encodeURIComponent,decodeURIComponent,
 document:{getElementById:docEl,querySelector:()=>null,querySelectorAll:()=>[],
   createElement:()=>makeEl(),addEventListener(){},hidden:false,
   body:{appendChild(e){reg['coach-toast']=e;}},documentElement:makeEl(),head:makeEl()},
 localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
 sessionStorage:{getItem:()=>null,setItem(){}},
 navigator:{userAgent:'node'},alert(){},confirm:()=>true,prompt:()=>'',
 setTimeout(f,d){if(typeof f==='function'&&(!d||d<100))f();return 1;},
 clearTimeout(){},setInterval(){},clearInterval(){},requestAnimationFrame(){},
 AbortController:class{constructor(){this.signal={};}abort(){}},
 fetch:async()=>({ok:true,json:async()=>({})}),
 URL:{createObjectURL:()=>''},Blob:function(){},Image:function(){},
 firebase:{initializeApp:()=>({}),database:()=>({ref:()=>({on(){},
   set:()=>Promise.resolve(),once:()=>Promise.resolve({val:()=>null})})})},
 location:{href:''},history:{pushState(){}},addEventListener(){},removeEventListener(){},
 matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})};
sb.window=sb;sb.globalThis=sb;sb.self=sb;
vm.createContext(sb);vm.runInContext(js,sb,{filename:'a.js'});
module.exports={sb,reg,docEl,makeEl};
