// Fermeture par le fond (13/11/2026, rapport de Liam : selectionner le nom du repas a la souris en relachant
// hors du cadre fermait « Ajouter un repas » et la saisie etait perdue)
const {sb,docEl}=require('./sb.js');
const vm=require('vm');
const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
const ov=()=>{const el=docEl('addmeal-overlay');el.dataset=el.dataset||{};el.dataset.touche='';return el;};
const clic=(el,appui)=>{sb.__el=el;sb.__appui=appui;sb.__ferme=0;
  X("if(__appui!==undefined)_noterAppui({target:__appui});overlayBackdrop({target:__el},__el,function(){__ferme++;})");return sb.__ferme;};

console.log('\n=== XCI. Fermeture par le fond : seulement si l\'appui a commence sur le fond ===');
t('*** appui dans la fenetre (champ du nom), relache sur le fond : la fenetre reste ouverte ***',()=>{
  const el=ov();eq(clic(el,{id:'addmeal-name'}),0);
});
t('appui et relache sur le fond : la fenetre se ferme',()=>{
  const el=ov();eq(clic(el,el),1);
});
t('clic sans appui connu (clavier, ancien navigateur) : comportement d\'avant, la fenetre se ferme',()=>{
  const el=ov();X('_appuiSur=null');eq(clic(el,undefined),1);
});
t('un appui ne sert qu\'une fois : le clic suivant sur le fond ferme bien',()=>{
  const el=ov();eq(clic(el,{id:'addmeal-name'}),0);eq(clic(el,el),1);
});
t('clic dans la fenetre : rien ne se ferme',()=>{
  const el=ov();sb.__el=el;sb.__ferme=0;X("overlayBackdrop({target:{id:'x'}},__el,function(){__ferme++;})");eq(sb.__ferme,0);
});
t('*** menu + et explication des macros : meme regle ; plus aucun « event.target===this » ***',()=>{
  if(src.indexOf('onclick="if(_clicSurFond(event,this))fermerMenuAjout()"')<0)throw new Error('menu +');
  if(src.indexOf('onclick="if(_clicSurFond(event,this))fermerInfoMacro()"')<0)throw new Error('info macros');
  if(/event\.target===this/.test(src))throw new Error('ancien test de cible restant');
  if(!/\['pointerdown','mousedown','touchstart'\]\.forEach\(function\(t\)\{document\.addEventListener\(t,_noterAppui,true\)/.test(src))throw new Error('appuis non ecoutes');
});
t('*** articles choisis dans l\'inventaire : fermer par le fond demande confirmation (avant : tout partait) ***',()=>{
  X("S.inv={frigo:[{id:'my',name:'Mayonnaise allégée',qty:180,unit:'g',mac100:{kcal:300,prot:1,gluc:8,lip:28}}],congelateur:[],placards:[],epices:[]};S.dayMeals={}");
  X("openAddMeal('text')");const el=ov();
  X("_invPick={my:30};applyInvPick()");
  eq(el.dataset.touche,'1');
  let demande=0;const vrai=sb.confirm;sb.confirm=()=>{demande++;return false;};
  try{eq(clic(el,el),0);eq(demande,1);}finally{sb.confirm=vrai;}
});

(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' -> '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
