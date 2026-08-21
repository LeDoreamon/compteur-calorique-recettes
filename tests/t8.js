const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S;
const rt=sb._refreshToday||sb.window._refreshToday;

console.log('\n=== W. Rafraichissement du jour ===');
t('_refreshToday existe',()=>{if(typeof rt!=='function')throw new Error('non defini');});
t('meme jour : pas de changement, renvoie false',()=>{
  S.today=sb.getToday();S.displayDate=S.today;
  eq(rt(),false,'retour');
});
t('*** jour change : S.today est mis a jour ***',()=>{
  S.today='2020-01-01';S.displayDate='2020-01-01';
  eq(rt(),true,'retour');
  eq(S.today,sb.getToday(),'S.today');
});
t('*** l\'utilisateur qui regardait "aujourd\'hui" suit le nouveau jour ***',()=>{
  S.today='2020-01-01';S.displayDate='2020-01-01';
  rt();
  eq(S.displayDate,sb.getToday(),'displayDate suit');
});
t('*** un jour consulte volontairement n\'est PAS deplace ***',()=>{
  S.today='2020-01-01';S.displayDate='2019-06-15';   // l'utilisateur consulte un autre jour
  rt();
  eq(S.displayDate,'2019-06-15','displayDate doit rester');
  eq(S.today,sb.getToday(),'S.today doit bouger');
});
t('appels repetes idempotents',()=>{
  S.today=sb.getToday();S.displayDate=S.today;
  eq(rt(),false);eq(rt(),false);eq(rt(),false);
});
t('les repas du nouveau jour vont au bon endroit',()=>{
  S.today='2020-01-01';S.displayDate='2020-01-01';
  rt();
  const j=sb.getToday();
  S.dayMeals[j]=[];
  S.dayMeals[j].push({rid:'t',name:'Test',mult:1,macros:{kcal:300,prot:20,gluc:30,lip:8}});
  eq(sb.getDayMacros(j).kcal,300,'kcal du jour courant');
  eq(sb.getDayMacros('2020-01-01').kcal,0,'ancien jour vide');
});

console.log('\n=== X. _burnSave ===');
t('_burnSave ne jette pas',()=>{
  const bs=sb._burnSave||sb.window._burnSave;
  if(typeof bs!=='function')throw new Error('non defini');
  bs('2026-08-21');
});
t('une seule ecriture dans le source',()=>{
  const fs=require('fs');const src=fs.readFileSync('index.html','utf8');
  const i=src.indexOf('function _burnSave');
  const bloc=src.slice(i,i+700);
  const n=(bloc.match(/fetch\(/g)||[]).length;
  if(n!==1)throw new Error(n+' appels fetch dans _burnSave');
});

console.log('\n=== Y. Non-regression du rendu ===');
sb.S.inv={frigo:[{id:'a',name:'Poulet',qty:500,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}}],placards:[],congelateur:[],epices:[]};
['recipes','inventory','courses','weight'].forEach(tab=>{
  t('render '+tab,()=>{S.mainTab=tab;sb.render();
    if(!docEl('root').innerHTML)throw new Error('vide');});
});
t('balises equilibrees',()=>{
  S.mainTab='recipes';S.mealTab='lunch';sb.render();
  const h=docEl('root').innerHTML;
  eq((h.match(/<div/g)||[]).length,(h.match(/<\/div>/g)||[]).length,'div');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
