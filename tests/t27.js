const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const sugg=G('shopSuggestions'),exclure=G('exclureDuRachat'),reprendre=G('reprendreLesSuggestions');

function inv(){
  S.pasRacheter={};S.shop={list:[],graveyard:[]};
  S.inv={frigo:[
    {id:'a',name:'Gnocchis',qty:0,unit:'g',mac100:{kcal:193,prot:5,gluc:36,lip:3}},
    {id:'b',name:'Dés de chorizo',qty:0,unit:'g',mac100:{kcal:400,prot:20,gluc:2,lip:35}},
    {id:'c',name:'Tortellini Prosciutto',qty:0,unit:'g',mac100:{kcal:319,prot:13,gluc:45,lip:9}},
    {id:'d',name:'Poulet',qty:2800,unit:'g',mac100:{kcal:165,prot:31,gluc:0,lip:4}}
  ],placards:[],congelateur:[],epices:[]};
}
const noms=()=>sugg().map(x=>x.name);

console.log('\n=== CT. Ecarter un article des suggestions ===');
inv();
t('les articles epuises sont proposes',()=>{
  const n=noms();
  if(!n.includes('Gnocchis'))throw new Error(n.join(', '));
  eq(n.length,3,'3 epuises');
});
t('un article en stock n\'est pas propose',()=>{
  if(noms().includes('Poulet'))throw new Error('Poulet propose a tort');
});
t('*** un article ecarte disparait des suggestions ***',()=>{
  exclure('Gnocchis');
  const n=noms();
  if(n.includes('Gnocchis'))throw new Error('encore propose');
  eq(n.length,2);
});
t('les autres restent proposes',()=>{
  const n=noms();
  if(!n.includes('Dés de chorizo'))throw new Error(n.join(', '));
});
t('l\'exclusion ignore la casse et les accents',()=>{
  inv();exclure('DES DE CHORIZO');
  if(noms().includes('Dés de chorizo'))throw new Error('exclusion non appliquee');
});
t('ecarter un nom inconnu ne casse rien',()=>{
  inv();exclure('Article fantome');exclure('');exclure(null);
  eq(noms().length,3);
});

console.log('\n=== CU. L\'exclusion se leve toute seule ===');
t('*** un article rachete redevient proposable ***',()=>{
  inv();
  exclure('Gnocchis');
  eq(noms().length,2,'ecarte');
  sb.findItem('a').qty=500;               // rachete
  G('_purgeExclusionsRachat')();
  if(S.pasRacheter['gnocchis'])throw new Error('exclusion toujours en place');
  sb.findItem('a').qty=0;                 // reconsomme
  if(!noms().includes('Gnocchis'))throw new Error('non repropose apres rachat');
});
t('tant qu\'il reste a zero, l\'exclusion tient',()=>{
  inv();exclure('Gnocchis');
  G('_purgeExclusionsRachat')();
  if(noms().includes('Gnocchis'))throw new Error('exclusion levee trop tot');
});
t('« tout reproposer » remet tout',()=>{
  inv();exclure('Gnocchis');exclure('Tortellini Prosciutto');
  eq(noms().length,1);
  reprendre();
  eq(noms().length,3);
});

console.log('\n=== CV. Rendu ===');
t('*** chaque ligne porte une croix ***',()=>{
  inv();S.shopAutoOpen=1;
  const h=G('renderShopAuto')();
  const n=(h.match(/exclureDuRachat\(/g)||[]).length;
  eq(n,3,'une croix par ligne');
});
t('la croix n\'active pas la case a cocher',()=>{
  const h=G('renderShopAuto')();
  if(!/event\.preventDefault\(\);event\.stopPropagation\(\)/.test(h))
    throw new Error('le clic cocherait la case');
});
t('un nom avec apostrophe ne casse pas le rendu',()=>{
  S.inv.frigo.push({id:'e',name:"Huile d'olive \"extra\"",qty:0,unit:'ml',mac100:{kcal:900,prot:0,gluc:0,lip:100}});
  S.pasRacheter={};
  const h=G('renderShopAuto')();
  if(/undefined/.test(h))throw new Error('rendu casse');
  if(!h.includes('Huile'))throw new Error('article absent');
});
t('le compteur d\'ecartes s\'affiche',()=>{
  inv();S.shopAutoOpen=1;exclure('Gnocchis');
  const h=G('renderShopAuto')();
  if(!/1 écarté/.test(h))throw new Error('compteur absent');
  if(!/tout reproposer/.test(h))throw new Error('lien de reprise absent');
});
t('tout ecarte : le lien de reprise reste accessible',()=>{
  inv();S.shopAutoOpen=1;
  ['Gnocchis','Dés de chorizo','Tortellini Prosciutto'].forEach(exclure);
  const h=G('renderShopAuto')();
  if(!/tout reproposer/.test(h))throw new Error('plus aucun moyen de revenir en arriere');
});
t('aucune suggestion ni exclusion : rien ne s\'affiche',()=>{
  inv();S.pasRacheter={};
  S.inv.frigo.forEach(function(i){i.qty=500;});
  eq(G('renderShopAuto')(),'');
});

console.log('\n=== CW. Persistance ===');
t('les exclusions partent dans l\'etat',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!/pasRacheter:S\.pasRacheter\|\|\{\}/.test(src))throw new Error('absent du payload');
});
t('elles sont relues au chargement',()=>{
  sb._applyState({inv:{frigo:[]},dayMeals:{},pasRacheter:{gnocchis:1}});
  eq(S.pasRacheter.gnocchis,1);
});
t('valeur invalide : repli sur un objet vide',()=>{
  sb._applyState({inv:{frigo:[]},dayMeals:{},pasRacheter:'nimporte quoi'});
  eq(typeof S.pasRacheter,'object');
  eq(Object.keys(S.pasRacheter).length,0);
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
