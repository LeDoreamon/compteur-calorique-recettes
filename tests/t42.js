const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');

console.log('\n=== EZ. Stockage des photos ===');
t('*** les photos vivent hors de l\'etat principal ***',()=>{
  const i=src.indexOf('var payload=JSON.stringify({');
  const b=src.slice(i,i+1400);
  if(/PHOTOS/.test(b))throw new Error('les photos partent avec l\'etat a chaque enregistrement');
});
t('*** elles ont leur propre noeud ***',()=>{
  if(!/ACTIVE_PROFILE\+'\/photos/.test(src))throw new Error('aucun noeud dedie');
});
t('la cle de photo est assainie',()=>{
  const i=src.indexOf('function photoRecette');
  if(!/_cleFB\(id\)/.test(src.slice(i,i+160)))throw new Error('cle brute');
});
t('une photo absente renvoie null',()=>{
  eq(G('photoRecette')('inexistante'),null);
});
t('une photo posee est retrouvee',()=>{
  sb.window.PHOTOS={'liam_v6_poulet_riz_soja':'data:image/jpeg;base64,AAA'};
  eq(G('photoRecette')('liam_v6_poulet_riz_soja'),'data:image/jpeg;base64,AAA');
  sb.window.PHOTOS={};
});

console.log('\n=== FA. Vignette par defaut ===');
t('*** une recette sans photo recoit une vignette ***',()=>{
  const v=G('_vignetteDefaut')({name:'Poulet curry-coco & riz'},22);
  if(!/linear-gradient/.test(v))throw new Error('pas de fond');
  if(/undefined|NaN/.test(v))throw new Error(v.slice(0,120));
});
t('la vignette est stable pour un meme nom',()=>{
  const a=G('_vignetteDefaut')({name:'Test'},22);
  const b=G('_vignetteDefaut')({name:'Test'},22);
  eq(a,b,'deux rendus differents pour le meme nom');
});
t('deux noms donnent deux teintes differentes',()=>{
  const a=G('_vignetteDefaut')({name:'Poulet'},22);
  const b=G('_vignetteDefaut')({name:'Saumon'},22);
  if(a===b)throw new Error('teintes identiques');
});
t('*** le pictogramme colle au plat ***',()=>{
  const cas=[['Pâtes au thon','\ud83c\udf5d'],['Poulet karaage','\ud83c\udf57'],
             ['Saumon poêlé','\ud83d\udc1f'],['Omelette jambon','\ud83c\udf73'],
             ['Shaker clear whey','\ud83e\udd64'],['Soupe potiron','\ud83c\udf72']];
  cas.forEach(function(c){
    const v=G('_vignetteDefaut')({name:c[0]},22);
    if(v.indexOf(c[1])<0)throw new Error(c[0]+' : pictogramme inattendu');
  });
});
t('un nom inconnu recoit un pictogramme neutre',()=>{
  const v=G('_vignetteDefaut')({name:'Truc bidule'},22);
  if(v.indexOf('\ud83c\udf7d')<0)throw new Error('pas de repli');
});
t('un nom vide ne casse rien',()=>{
  const v=G('_vignetteDefaut')({},22);
  if(/undefined|NaN/.test(v))throw new Error(v.slice(0,100));
});

console.log('\n=== FB. Affichage dans les recettes ===');
t('*** la carte porte une vignette ***',()=>{
  if(!/width:52px;height:52px/.test(src))throw new Error('vignette absente de la carte');
});
t('*** la recette depliee montre une grande image ***',()=>{
  if(!/height:\$\{p\?'170px':'96px'\}/.test(src))throw new Error('grande image absente');
});
t('*** le bouton photo n\'apparait qu\'une fois depliee ***',()=>{
  const iBody=src.indexOf('class="rbody');
  const iBtn=src.indexOf('choisirPhotoRecette(');
  if(iBtn<0)throw new Error('bouton absent');
  if(iBtn<iBody)throw new Error('bouton present dans l\'en-tete replie');
});
t('le bouton ne replie pas la recette au clic',()=>{
  const i=src.indexOf('choisirPhotoRecette(');
  if(!/event\.stopPropagation\(\)/.test(src.slice(i-60,i+40)))
    throw new Error('le clic remonterait au toggle');
});
t('le retrait n\'est propose que s\'il y a une photo',()=>{
  const i=src.indexOf('retirerPhotoRecette(');
  if(i<0)throw new Error('retrait absent');
  const b=src.slice(i-160,i);
  if(!/p\?/.test(b))throw new Error('retrait propose sans photo');
});
t('le retrait demande confirmation',()=>{
  const i=src.indexOf('function retirerPhotoRecette');
  if(!/confirm\(/.test(src.slice(i,i+160)))throw new Error('aucune confirmation');
});

console.log('\n=== FC. Traitement de l\'image ===');
t('*** l\'image est redimensionnee avant stockage ***',()=>{
  const i=src.indexOf('function _photoVersDataUrl');
  const b=src.slice(i,i+800);
  if(!/L=480/.test(b))throw new Error('pas de redimensionnement');
  if(!/toDataURL\('image\/jpeg',0\.72\)/.test(b))throw new Error('pas de compression');
});
t('les erreurs de lecture sont traitees',()=>{
  const i=src.indexOf('function _photoVersDataUrl');
  const b=src.slice(i,i+900);
  if(!/img\.onerror/.test(b))throw new Error('image illisible non geree');
  if(!/fr\.onerror/.test(b))throw new Error('fichier illisible non gere');
});
t('le champ de fichier est hors du contenu re-rendu',()=>{
  const iInp=src.indexOf('id="photo-recette-input"');
  const iRoot=src.indexOf('<div id="root"');
  if(iInp<0)throw new Error('champ absent');
  if(iInp>iRoot)throw new Error('champ dans #root, detruit a chaque rendu');
});
t('il n\'accepte que des images',()=>{
  const i=src.indexOf('id="photo-recette-input"');
  if(!/accept="image\/\*"/.test(src.slice(i,i+120)))throw new Error('filtre absent');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
