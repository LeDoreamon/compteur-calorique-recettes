const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const paires=G('paires0k'),ignorer=G('ignorerVoisins'),reprendre=G('reprendreVoisins');

function inv(){
  S.paires0k={};
  S.inv={frigo:[
    {id:'g1',name:'Gnocchis fromage jambon',qty:340,unit:'g',mac100:{kcal:220,prot:8,gluc:30,lip:7}},
    {id:'g2',name:'Gnocchis à poêler jambon fromage',qty:0,unit:'g',mac100:{kcal:220,prot:8,gluc:30,lip:7}},
    {id:'s1',name:'St Moret',qty:1000,unit:'g',mac100:{kcal:205,prot:8,gluc:3,lip:18}},
    {id:'s2',name:'St Morêt léger',qty:0,unit:'g',mac100:{kcal:132,prot:10,gluc:5,lip:8}},
    {id:'p1',name:'Poulet',qty:500,unit:'g',mac100:{kcal:165,prot:31,gluc:0,lip:4}}
  ],placards:[
    {id:'pa1',name:'Pâtes protéinées',qty:1200,unit:'g',mac100:{kcal:369,prot:20,gluc:66,lip:2}},
    {id:'pa2',name:'pâtes 21 g protein',qty:500,unit:'g',mac100:{kcal:346,prot:21,gluc:61,lip:1.4}}
  ],congelateur:[],epices:[]};
}
inv();
const noms=()=>paires().map(v=>v.plein.it.name+' / '+v.vide.it.name);

console.log('\n=== ED. Noms voisins dont un est epuise ===');
t('*** les gnocchis sont signales ***',()=>{
  const n=noms();
  if(!n.some(x=>/Gnocchis/.test(x)))throw new Error('non detectes : '+n.join(' | '));
});
t('*** le St Morêt aussi ***',()=>{
  if(!noms().some(x=>/Moret|Morêt/.test(x)))throw new Error('non detecte');
});
t('*** deux articles tous deux en stock ne sont pas signales ***',()=>{
  if(noms().some(x=>/Pâtes|pâtes/.test(x)))throw new Error('les deux pates sont signalees a tort');
});
t('un article sans voisin n\'apparait pas',()=>{
  if(noms().some(x=>/Poulet/.test(x)))throw new Error('Poulet signale');
});
t('le plein et le vide sont correctement identifies',()=>{
  const p=paires().find(v=>/Gnocchis/.test(v.plein.it.name));
  eq(p.plein.it.qty,340,'le plein');
  eq(p.vide.it.qty,0,'le vide');
});
t('chaque paire n\'apparait qu\'une fois',()=>{
  const cles=paires().map(v=>v.cle);
  eq(new Set(cles).size,cles.length,'doublons dans la liste');
});
t('la categorie de chaque article est fournie',()=>{
  paires().forEach(function(v){
    if(!v.plein.cat||!v.vide.cat)throw new Error('categorie manquante');
  });
});

console.log('\n=== EE. Ecarter une paire ===');
t('*** « ce sont deux produits » retire la paire ***',()=>{
  inv();
  const avant=paires().length;
  ignorer('St Moret','St Morêt léger');
  eq(paires().length,avant-1);
  if(noms().some(x=>/Moret|Morêt/.test(x)))throw new Error('toujours signalee');
});
t('les autres paires restent',()=>{
  if(!noms().some(x=>/Gnocchis/.test(x)))throw new Error('les gnocchis ont disparu aussi');
});
t('l\'ordre des noms n\'a pas d\'importance',()=>{
  inv();
  ignorer('St Morêt léger','St Moret');
  if(noms().some(x=>/Moret|Morêt/.test(x)))throw new Error('cle sensible a l\'ordre');
});
t('« tout revoir » remet les paires',()=>{
  inv();
  ignorer('St Moret','St Morêt léger');ignorer('Gnocchis fromage jambon','Gnocchis à poêler jambon fromage');
  eq(paires().length,0);
  reprendre();
  if(paires().length<2)throw new Error('paires non retablies');
});

console.log('\n=== EF. Integration au diagnostic ===');
t('*** les paires comptent dans le total du diagnostic ***',()=>{
  inv();
  const d=sb.invIssues();
  if(!d.voisins||!d.voisins.length)throw new Error('absentes du diagnostic');
  if(d.total<d.voisins.length)throw new Error('non comptees dans le total');
});
t('la section s\'affiche',()=>{
  inv();S.diagOpen=1;
  const h=G('renderInvDiag')();
  if(!/Noms voisins/.test(h))throw new Error('section absente');
  if(!/Gnocchis/.test(h))throw new Error('paire absente du rendu');
});
t('chaque paire propose d\'ouvrir le vide et de l\'ecarter',()=>{
  const h=G('renderInvDiag')();
  if(!/openItemDetail/.test(h))throw new Error('ouverture absente');
  if(!/ignorerVoisins\(/.test(h))throw new Error('bouton d\'ecart absent');
});
t('un nom avec apostrophe ne casse pas le rendu',()=>{
  S.inv.frigo.push({id:'h1',name:"Huile d'olive extra",qty:500,unit:'ml',mac100:{kcal:900,prot:0,gluc:0,lip:100}});
  S.inv.frigo.push({id:'h2',name:"Huile d'olive vierge",qty:0,unit:'ml',mac100:{kcal:900,prot:0,gluc:0,lip:100}});
  const h=G('renderInvDiag')();
  if(/undefined/.test(h))throw new Error('rendu casse');
  inv();
});
t('aucune section quand tout est propre',()=>{
  S.inv={frigo:[{id:'a',name:'Poulet',qty:500,unit:'g',mac100:{kcal:165,prot:31,gluc:0,lip:4}}],
         placards:[],congelateur:[],epices:[]};
  S.paires0k={};
  const h=G('renderInvDiag')();
  if(/Noms voisins/.test(h))throw new Error('section affichee a tort');
});

console.log('\n=== EG. Persistance ===');
t('les paires ignorees partent dans l\'etat',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!/paires0k:S\.paires0k\|\|\{\}/.test(src))throw new Error('absentes du payload');
});
t('elles sont relues au chargement',()=>{
  sb._applyState({inv:{frigo:[]},dayMeals:{},paires0k:{'a|b':1}});
  eq(S.paires0k['a|b'],1);
});
t('valeur invalide : objet vide',()=>{
  sb._applyState({inv:{frigo:[]},dayMeals:{},paires0k:'nimporte quoi'});
  eq(Object.keys(S.paires0k).length,0);
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
