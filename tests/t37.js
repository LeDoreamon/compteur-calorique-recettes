const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');
const backdrop=G('overlayBackdrop');

// Faux overlay + faux evenement de clic sur le fond
function overlay(touche){
  const el=docEl('item-overlay');
  el.dataset=el.dataset||{};
  el.dataset.touche=touche?'1':'';
  return el;
}
function clicFond(el){
  let ferme=false;
  backdrop({target:el},el,function(){ferme=true;});
  return ferme;
}

console.log('\n=== EH. Fermeture sans saisie ===');
t('*** aucune frappe : la fenetre se ferme directement ***',()=>{
  const vraiConfirm=sb.confirm;let demande=false;
  sb.confirm=function(){demande=true;return true;};
  try{
    const el=overlay(false);
    eq(clicFond(el),true,'devrait se fermer');
    eq(demande,false,'aucune question ne devait etre posee');
  }finally{sb.confirm=vraiConfirm;}
});
t('*** apres une frappe : la question est posee ***',()=>{
  const vraiConfirm=sb.confirm;let demande=false;
  sb.confirm=function(){demande=true;return true;};
  try{
    const el=overlay(true);
    clicFond(el);
    eq(demande,true,'la question aurait du etre posee');
  }finally{sb.confirm=vraiConfirm;}
});
t('refuser la question laisse la fenetre ouverte',()=>{
  const vraiConfirm=sb.confirm;
  sb.confirm=function(){return false;};
  try{eq(clicFond(overlay(true)),false,'la fenetre a ete fermee malgre le refus');}
  finally{sb.confirm=vraiConfirm;}
});
t('accepter la ferme',()=>{
  const vraiConfirm=sb.confirm;
  sb.confirm=function(){return true;};
  try{eq(clicFond(overlay(true)),true);}finally{sb.confirm=vraiConfirm;}
});
t('*** le drapeau est remis a zero apres fermeture ***',()=>{
  const vraiConfirm=sb.confirm;
  sb.confirm=function(){return true;};
  try{
    const el=overlay(true);
    clicFond(el);
    eq(el.dataset.touche,'','le drapeau survit a la fermeture');
  }finally{sb.confirm=vraiConfirm;}
});
t('un clic a l\'interieur ne ferme rien',()=>{
  const el=overlay(true);
  let ferme=false;
  backdrop({target:{autre:true}},el,function(){ferme=true;});
  eq(ferme,false,'un clic interne a ferme la fenetre');
});

console.log('\n=== EI. Mecanique de detection ===');
t('*** les frappes sont suivies, pas le contenu des champs ***',()=>{
  const i=src.indexOf('function overlayBackdrop');
  const b=src.slice(i,i+600);
  if(/querySelectorAll\('input\[type=text\]/.test(b))
    throw new Error('cherche encore du texte dans les champs pre-remplis');
  if(!/dataset\.touche==='1'/.test(b))throw new Error('ne lit pas le drapeau de frappe');
});
t('les evenements input et change sont ecoutes',()=>{
  if(!/addEventListener\('input',_marquerTouche,true\)/.test(src))throw new Error('input non ecoute');
  if(!/addEventListener\('change',_marquerTouche,true\)/.test(src))throw new Error('change non ecoute');
});
t('*** rouvrir une fenetre repart d\'une ardoise vierge ***',()=>{
  if(!/MutationObserver/.test(src))throw new Error('aucune remise a zero a l\'ouverture');
  const i=src.indexOf('MutationObserver');
  const b=src.slice(i,i+420);
  if(!/display!=='none'/.test(b))throw new Error('ne detecte pas l\'ouverture');
  if(!/dataset\.touche=''/.test(b))throw new Error('ne remet pas le drapeau a zero');
});
t('la remise a zero vise tous les overlays',()=>{
  const i=src.indexOf('MutationObserver');
  if(!/querySelectorAll\('div\[id\$="-overlay"\]'\)/.test(src.slice(i,i+700)))
    throw new Error('un seul overlay surveille');
});
t('le marquage remonte jusqu\'a l\'overlay parent',()=>{
  const i=src.indexOf('function _marquerTouche');
  const b=src.slice(i,i+420);
  if(!/parentNode/.test(b))throw new Error('ne remonte pas l\'arbre');
  if(!/\/-overlay\$\/\.test\(n\.id\)/.test(b))throw new Error('ne reconnait pas les overlays');
});
t('tout est protege par des try',()=>{
  const i=src.indexOf('function _marquerTouche');
  if(!/catch\(err\)\{\}/.test(src.slice(i,i+420)))throw new Error('marquage non protege');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
