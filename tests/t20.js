const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const src=fs.readFileSync('index.html','utf8');

console.log('\n=== BV. Lignes d\'ingredients : plus de debordement ===');
t('*** tout select en flex:1 porte min-width:0 ***',()=>{
  const sels=src.match(/<select[^>]*style="[^"]*flex:1[^"]*"/g)||[];
  if(!sels.length)throw new Error('aucun select trouve');
  const ko=sels.filter(s=>!/min-width:0/.test(s));
  if(ko.length)throw new Error(ko.length+' sans min-width:0 : '+ko[0].slice(0,90));
});
t('la croix de suppression ne peut pas etre comprimee',()=>{
  const i=src.indexOf("this.closest('[id^=cc-exrow-]')");
  const b=src.slice(i-60,i+320);
  if(!/flex-shrink:0/.test(b))throw new Error('flex-shrink absent');
});
t('le compteur de calories garde sa place',()=>{
  const i=src.indexOf('cc-exk-${idx}');
  if(!/flex-shrink:0/.test(src.slice(i,i+180)))throw new Error('flex-shrink absent');
});
t('le champ quantite est fige et en border-box',()=>{
  const i=src.indexOf('cc-exqty-${idx}');
  const b=src.slice(i,i+240);
  if(!/flex-shrink:0/.test(b))throw new Error('flex-shrink absent');
  if(!/box-sizing:border-box/.test(b))throw new Error('box-sizing absent');
});

console.log('\n=== BW. La croix existe et fonctionne ===');
t('*** chaque ligne ajoutee porte un bouton de suppression ***',()=>{
  const i=src.indexOf('function addCCExtra');
  const f=src.slice(i,i+1400);
  if(!/<button onclick="this\.closest\('\[id\^=cc-exrow-\]'\)\.remove\(\)/.test(f))
    throw new Error('bouton absent de la ligne generee');
});
t('la suppression met les totaux a jour',()=>{
  const i=src.indexOf("this.closest('[id^=cc-exrow-]').remove()");
  if(!/remove\(\);updateCCTotals\(\)/.test(src.slice(i,i+80)))
    throw new Error('totaux non recalcules apres suppression');
});
t('le bouton porte une infobulle',()=>{
  const i=src.indexOf("this.closest('[id^=cc-exrow-]')");
  if(!/title="Retirer cet ingrédient"/.test(src.slice(i-120,i+320)))
    throw new Error('infobulle absente');
});
t('addCCExtra ajoute bien une ligne au conteneur',()=>{
  const i=src.indexOf('function addCCExtra');
  const f=src.slice(i,i+1500);
  if(!/getElementById\('cc-extras'\)\.appendChild\(row\)/.test(f))
    throw new Error('ligne non ajoutee');
});
t('chaque ligne a un identifiant unique',()=>{
  const i=src.indexOf('function addCCExtra');
  if(!/const idx='x'\+Date\.now\(\)/.test(src.slice(i,i+240)))throw new Error('identifiant non unique');
});

console.log('\n=== BX. Non-regression des autres selecteurs ===');
t('les selects deja corriges le sont restes',()=>{
  ['cr-ing-sel','em-ing-sel','cc-sel-${i}'].forEach(function(id){
    const i=src.indexOf('id="'+id+'"');
    if(i<0)throw new Error(id+' introuvable');
    if(!/min-width:0/.test(src.slice(i,i+220)))throw new Error(id+' a perdu min-width:0');
  });
});
t('le modal de cuisson garde sa largeur maximale',()=>{
  const i=src.indexOf('id="cc-overlay"');
  if(!/max-width:420px/.test(src.slice(i,i+700)))throw new Error('max-width perdue');
});
t('le bouton Ajouter est toujours la',()=>{
  if(!/onclick="addCCExtra\(\)"/.test(src))throw new Error('bouton Ajouter perdu');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
