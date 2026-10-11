// Politique de securite du contenu (CSP, 11/10/2026) : stricte, et a jour des services appeles
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
const html=fs.readFileSync('index.html','utf8'),cat=fs.readFileSync('catalogue.js','utf8');
const m=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
const pol={};if(m)m[1].split(';').forEach(d=>{const p=d.trim().split(/\s+/);if(p[0])pol[p[0]]=p.slice(1);});
const hote=u=>u.replace(/^https:\/\//,'').split(/[/?'"`]/)[0];
console.log('\n=== LIX. Politique de securite du contenu ===');
t('*** la CSP est la, avant le premier script ***',()=>{
  if(!m)throw new Error('absente');
  const i=html.indexOf('Content-Security-Policy'),j=html.indexOf('<script');
  if(i<0||j<0||i>j)throw new Error('apres un script : sans effet sur lui');
});
t('*** pas d\'eval, pas de plugin, pas de base ni de formulaire detournables ***',()=>{
  if((pol['script-src']||[]).indexOf("'unsafe-eval'")>=0)throw new Error("'unsafe-eval' autorise");
  if((pol['object-src']||[]).join()!=="'none'")throw new Error('object-src');
  if((pol['base-uri']||[]).join()!=="'none'")throw new Error('base-uri');
  if((pol['form-action']||[]).join()!=="'none'")throw new Error('form-action');
  if((pol['default-src']||[]).join()!=="'self'")throw new Error('default-src');
  ['connect-src','img-src','script-src'].forEach(d=>{if((pol[d]||[]).some(x=>x==='*'||x==='https:'||x==='http:'))throw new Error(d+' trop large');});
});
t('*** chaque service appele par fetch() est autorise, et rien de plus ***',()=>{
  const appeles=new Set();
  (html.match(/fetch\(\s*['`]https:\/\/[^'`?]+/g)||[]).forEach(s=>appeles.add(hote(s.replace(/fetch\(\s*['`]/,''))));
  const fb=html.match(/const FB\s*=\s*'(https:\/\/[^']+)'/);if(fb)appeles.add(hote(fb[1]));
  const ok=new Set((pol['connect-src']||[]).filter(x=>/^https:/.test(x)).map(hote));
  const manque=[...appeles].filter(h=>!ok.has(h)),enTrop=[...ok].filter(h=>!appeles.has(h));
  if(manque.length)throw new Error('appele mais bloque : '+manque.join(', '));
  if(enTrop.length)throw new Error('autorise sans raison : '+enTrop.join(', '));
});
t('les images externes (liens Wikimedia) sont autorisees, plus data: et blob: pour les photos',()=>{
  const img=pol['img-src']||[];
  ['data:','blob:','https://commons.wikimedia.org','https://upload.wikimedia.org'].forEach(x=>{if(img.indexOf(x)<0)throw new Error(x+' absent');});
  const hotes=new Set((html+cat).match(/https:\/\/[a-z0-9.-]+\.(?:jpe?g|png|webp|svg)|https:\/\/(?:commons|upload)\.wikimedia\.org/g)||[]);
  [...hotes].forEach(h=>{if(img.indexOf('https://'+hote(h))<0)throw new Error('image bloquee : '+h);});
});
t('le lecteur de codes-barres reste chargeable (meme origine, sans eval)',()=>{
  if(!/s\.src='zxing\.min\.js(\?v=\d+)?'/.test(html))throw new Error('chargement de zxing introuvable');
  const z=fs.readFileSync('zxing.min.js','utf8');
  if(/\beval\(|new Function\(|\bFunction\(/.test(z))throw new Error('zxing evalue du code : la CSP le bloquerait');
});
console.log('---- '+pass+' ok, '+fail+' KO');
