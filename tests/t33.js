const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');

console.log('\n=== DV. Modaux : hauteur et zones sures ===');
const MODAUX=['item-overlay','wait-overlay','shopitem-overlay'];
t('*** chaque modal a une hauteur max et defile ***',()=>{
  MODAUX.forEach(function(id){
    const i=src.indexOf('id="'+id+'"');
    const j=src.indexOf('<div style="',i+10);
    const inn=src.slice(j,j+520);
    if(!/max-height:/.test(inn))throw new Error(id+' sans hauteur max');
    if(!/overflow-y:auto/.test(inn))throw new Error(id+' sans defilement');
  });
});
t('*** la marge haute tient compte de l\'encoche ***',()=>{
  MODAUX.forEach(function(id){
    const i=src.indexOf('id="'+id+'"');
    const ov=src.slice(i,i+430);
    if(!/env\(safe-area-inset-top/.test(ov))throw new Error(id+' sans marge haute');
  });
});
t('la marge basse aussi',()=>{
  MODAUX.forEach(function(id){
    const i=src.indexOf('id="'+id+'"');
    if(!/env\(safe-area-inset-bottom/.test(src.slice(i,i+430)))throw new Error(id+' sans marge basse');
  });
});
t('la hauteur max deduit les zones sures',()=>{
  const i=src.indexOf('id="item-overlay"');
  const j=src.indexOf('<div style="',i+10);
  if(!/max-height:calc\(100vh - 40px - env\(safe-area-inset-top/.test(src.slice(j,j+520)))
    throw new Error('calcul incomplet');
});
t('aucun modal centre ne reste sans defilement',()=>{
  const re=/id="([a-z0-9-]*overlay)"([^>]*)>\s*<div style="([^"]*)"/g;let m,ko=[];
  while((m=re.exec(src))){
    if(m.group===undefined){}
    const nom=m[1],inn=m[3];
    if(nom==='scan-overlay')continue;
    if(!/max-height/.test(inn)||!/overflow-y|flex-direction:column/.test(inn))ko.push(nom);
  }
  if(ko.length)throw new Error(ko.join(', '));
});
t('la croix de fermeture reste dans la zone sure',()=>{
  const i=src.indexOf('id="item-overlay"');
  const bloc=src.slice(i,i+1400);
  if(!/closeItemDetail/.test(bloc))throw new Error('bouton de fermeture introuvable');
  const iPad=bloc.indexOf('safe-area-inset-top');
  const iBtn=bloc.indexOf('closeItemDetail',bloc.indexOf('<div style="'));
  if(iPad<0||iPad>iBtn)throw new Error('marge posee apres le bouton');
});

console.log('\n=== DW. Ajouter un article depuis le haut ===');
t('*** le bouton apparait en mode edition ***',()=>{
  S.inv={frigo:[],placards:[],congelateur:[],epices:[]};
  S.editMode=true;S.mainTab='inventory';
  const h=G('renderInv')();
  if(!/Ajouter un article/.test(h))throw new Error('bouton absent');
});
t('*** il est place avant la liste des categories ***',()=>{
  S.editMode=true;
  const h=G('renderInv')();
  const iBtn=h.indexOf('Ajouter un article');
  const iList=h.indexOf('id="inv-list"');
  if(iBtn<0||iList<0)throw new Error('reperes introuvables');
  if(iBtn>iList)throw new Error('le bouton est sous la liste');
});
t('il disparait hors mode edition',()=>{
  S.editMode=false;
  if(/Ajouter un article/.test(G('renderInv')()))throw new Error('affiche a tort');
  S.editMode=true;
});
t('le bouton du bas est conserve',()=>{
  S.editMode=true;
  const h=G('renderInvCats')();
  if(!/openAddItem\('frigo'\)/.test(h))throw new Error('bouton du bas perdu');
});

console.log('\n=== DX. Choix de la destination ===');
t('*** le formulaire propose les quatre categories ***',()=>{
  const i=src.indexOf('id="ai-cat"');
  if(i<0)throw new Error('selecteur absent');
  const bloc=src.slice(i,i+420);
  ['frigo','congelateur','placards','epices'].forEach(function(c){
    if(!new RegExp('value="'+c+'"').test(bloc))throw new Error(c+' absent');
  });
});
t('changer le selecteur change la destination',()=>{
  if(!/onchange="_aic=this\.value"/.test(src))throw new Error('non relie a _aic');
});
t('*** ouvrir depuis une categorie pre-selectionne la bonne ***',()=>{
  G('openAddItem')('epices');
  eq(docEl('ai-cat').value,'epices');
  G('openAddItem')('congelateur');
  eq(docEl('ai-cat').value,'congelateur');
});
t('ouvrir sans categorie retombe sur le frigo',()=>{
  G('openAddItem')();
  eq(docEl('ai-cat').value,'frigo');
});
t('le scan reste accessible depuis le formulaire',()=>{
  const i=src.indexOf('id="ai-overlay"');
  if(!/openScanner\(\)/.test(src.slice(i,i+1400)))throw new Error('bouton scanner perdu');
});
t('le selecteur ne deborde pas',()=>{
  const i=src.indexOf('id="ai-cat"');
  const b=src.slice(i,i+320);
  if(!/min-width:0/.test(b))throw new Error('min-width:0 absent');
  if(!/box-sizing:border-box/.test(b))throw new Error('box-sizing absent');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
