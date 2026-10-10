const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
const html=fs.readFileSync('index.html','utf8'),cat=fs.readFileSync('catalogue.js','utf8'),sw=fs.readFileSync('sw.js','utf8');
const sansChaines=s=>s.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g,'""');
console.log('\n=== LII. Dev : catalogue sorti de index.html ===');
t('*** catalogue.js charge AVANT le script principal ***',()=>{
  const i=html.indexOf('<script src="catalogue.js?v='),j=html.indexOf('<script>');
  if(i<0||j<0||i>j)throw new Error('ordre '+i+' / '+j);
});
t('*** la version du catalogue suit le build (pas de melange ancien/nouveau en cache) ***',()=>{
  const b=html.match(/const BUILD_ID='([^']+)'/)[1],v=html.match(/catalogue\.js\?v=([^"]+)"/)[1];
  if(v!==b)throw new Error('catalogue '+v+' / build '+b);
  if(!/catalogue\.js\?v=%s/.test(fs.readFileSync('outils/publier.py','utf8')))throw new Error('publier.py ne met pas a jour la version');
});
t('*** que des donnees : aucune fonction dans catalogue.js ***',()=>{if(/\bfunction\b|=>/.test(sansChaines(cat)))throw new Error('du code dans le catalogue');});
t('les donnees ne sont plus dans index.html (pas de doublon)',()=>{
  ['const RCP=[','const INV_DEFAULT=','const MEALS_DEFAULT='].forEach(d=>{
    if(html.indexOf(d)>=0)throw new Error(d+' encore dans index.html');
    if(cat.indexOf(d)<0)throw new Error(d+' absent de catalogue.js');});
});
t('le service worker ne bloque pas le fichier (mis en cache comme le reste)',()=>{if(/catalogue/.test(sw))throw new Error('regle particuliere inattendue');});
t('catalogue absent (reseau coupe) : message et bouton Recharger, pas de page figee',()=>{
  const i=html.indexOf("if(typeof RCP==='undefined'");
  if(i<0)throw new Error('pas de garde');
  const bloc=html.slice(i,i+900);
  if(!/location\.reload\(\)/.test(bloc)||!/throw new Error/.test(bloc))throw new Error('garde incomplete');
});
console.log('---- '+pass+' ok, '+fail+' KO');
