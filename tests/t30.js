const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');
S.inv={frigo:[],placards:[],congelateur:[],epices:[]};

console.log('\n=== DF. La barre vit hors du contenu re-rendu ===');
t('*** elle est declaree dans le HTML statique, avant #root ***',()=>{
  const iNav=src.indexOf('<nav class="bnav" id="bnav">');
  const iRoot=src.indexOf('<div id="root"');
  if(iNav<0)throw new Error('barre absente du HTML statique');
  if(iNav>iRoot)throw new Error('declaree apres #root');
});
t('*** elle n\'est plus generee dans le contenu ***',()=>{
  ['recipes','inventory','courses','weight'].forEach(function(tab){
    S.mainTab=tab;sb.render();
    if(/class="bnav"/.test(docEl('root').innerHTML))
      throw new Error('la barre est encore dans #root sur l\'onglet '+tab);
  });
});
t('un seul <nav class="bnav"> dans tout le fichier',()=>{
  eq((src.match(/<nav class="bnav"/g)||[]).length,1);
});
t('la barre n\'est plus reconstruite par le template de rendu',()=>{
  if(/\$\{\[\['recipes','\\u2605'/.test(src))throw new Error('template encore present dans render');
});

console.log('\n=== DG. Contenu de la barre ===');
t('les quatre onglets sont presents',()=>{
  S.mainTab='recipes';sb.render();
  const h=docEl('bnav').innerHTML;
  ['Recettes','Inventaire','Courses','Bilan'].forEach(function(l){
    if(!h.includes(l))throw new Error(l+' absent');
  });
  eq((h.match(/data-action="main-tab"/g)||[]).length,4);
});
t('*** un seul onglet actif a la fois ***',()=>{
  ['recipes','inventory','courses','weight'].forEach(function(tab){
    S.mainTab=tab;sb.render();
    const h=docEl('bnav').innerHTML;
    eq((h.match(/bnav-b on/g)||[]).length,1,tab);
    if(!new RegExp('data-val="'+tab+'" class="bnav-b on"').test(h))
      throw new Error(tab+' non marque actif');
  });
});
t('les libelles restent inchanges',()=>{
  const h=docEl('bnav').innerHTML;
  if(!/bnav-i/.test(h))throw new Error('icones perdues');
});
t('changer d\'onglet met bien la barre a jour',()=>{
  S.mainTab='recipes';sb.render();
  const a=docEl('bnav').innerHTML;
  S.mainTab='weight';sb.render();
  const b=docEl('bnav').innerHTML;
  if(a===b)throw new Error('barre non actualisee');
  if(!/data-val="weight" class="bnav-b on"/.test(b))throw new Error('mauvais onglet actif');
});
t('renderBnav tolere l\'absence du conteneur',()=>{
  const vrai=sb.document.getElementById;
  sb.document.getElementById=function(id){return id==='bnav'?null:vrai(id);};
  try{G('renderBnav')();}finally{sb.document.getElementById=vrai;}
});

console.log('\n=== DH. Style et positionnement ===');
t('la barre garde sa position fixe en bas',()=>{
  const i=src.indexOf('.bnav { position: fixed');
  if(i<0)throw new Error('regle CSS perdue');
  const b=src.slice(i,i+700);
  if(!/bottom: 0/.test(b))throw new Error('ancrage perdu');
  if(!/z-index: 180/.test(b))throw new Error('z-index perdu');
});
t('la couche de composition dediee est conservee',()=>{
  const i=src.indexOf('.bnav { position: fixed');
  if(!/translateZ\(0\)/.test(src.slice(i,i+700)))throw new Error('translateZ perdu');
});
t('la reserve sous la barre est conservee',()=>{
  if(!/\.container \{ padding-bottom: calc\(96px/.test(src))throw new Error('reserve perdue');
});
t('la marge pour la barre home est conservee',()=>{
  const i=src.indexOf('.bnav { position: fixed');
  if(!/env\(safe-area-inset-bottom/.test(src.slice(i,i+700)))throw new Error('safe-area perdue');
});

console.log('\n=== DI. Non-regression du rendu ===');
t('les quatre onglets rendent sans erreur',()=>{
  ['recipes','inventory','courses','weight'].forEach(function(tab){
    S.mainTab=tab;sb.render();
    if(!docEl('root').innerHTML)throw new Error('vide sur '+tab);
  });
});
t('balises equilibrees dans le contenu',()=>{
  S.mainTab='recipes';S.mealTab='lunch';sb.render();
  const h=docEl('root').innerHTML;
  eq((h.match(/<div/g)||[]).length,(h.match(/<\/div>/g)||[]).length,'div');
});
t('balises equilibrees dans la barre',()=>{
  const h=docEl('bnav').innerHTML;
  eq((h.match(/<button/g)||[]).length,(h.match(/<\/button>/g)||[]).length,'button');
  eq((h.match(/<span/g)||[]).length,(h.match(/<\/span>/g)||[]).length,'span');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');

console.log('\n=== DJ. La barre doit rester cliquable ===');
t('*** le gestionnaire est une fonction nommee, partageable ***',()=>{
  if(!/function _onActionClick\(e\)\{/.test(src))
    throw new Error('gestionnaire anonyme : impossible de le partager avec la barre');
});
t('*** il est attache a #root ET a #bnav ***',()=>{
  if(!/ROOT\.addEventListener\('click',_onActionClick\)/.test(src))
    throw new Error('non attache a #root');
  if(!/_bnavEl\.addEventListener\('click',_onActionClick\)/.test(src))
    throw new Error('non attache a #bnav : la barre serait inerte');
});
t('le nav est declare avant le script qui le cherche',()=>{
  const iNav=src.indexOf('<nav class="bnav" id="bnav">');
  const iScript=src.indexOf('<script>');
  if(iScript<iNav)throw new Error('getElementById renverrait null au chargement');
});
t('un seul attachement par element, pas de doublon',()=>{
  eq((src.match(/ROOT\.addEventListener\('click'/g)||[]).length,1,'#root');
  eq((src.match(/_bnavEl\.addEventListener\('click'/g)||[]).length,1,'#bnav');
});
t('*** un clic sur un onglet change bien d\'onglet ***',()=>{
  S.mainTab='recipes';sb.render();
  const faux={target:{closest:function(sel){
    return sel==='[data-action]'?{dataset:{action:'main-tab',val:'weight'}}:null;}},
    preventDefault(){},stopPropagation(){}};
  G('_onActionClick')(faux);
  eq(S.mainTab,'weight','onglet non change');
});
t('les quatre onglets repondent',()=>{
  ['recipes','inventory','courses','weight'].forEach(function(tab){
    S.mainTab='recipes';
    const faux={target:{closest:function(sel){
      return sel==='[data-action]'?{dataset:{action:'main-tab',val:tab}}:null;}},
      preventDefault(){},stopPropagation(){}};
    G('_onActionClick')(faux);
    eq(S.mainTab,tab,tab+' ne repond pas');
  });
});
console.log('\n---- total '+pass+' ok, '+fail+' KO ----');
