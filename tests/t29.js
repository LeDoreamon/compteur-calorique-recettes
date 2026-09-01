const {sb}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const src=fs.readFileSync('index.html','utf8');
const js=src.match(/<script>([\s\S]*?)<\/script>/)[1];
// Retire les commentaires de ligne pour ne tester que le code actif
const code=js.split('\n').filter(l=>!/^\s*\/\//.test(l)).join('\n');

console.log('\n=== DC. Migration du modele multimodal ===');
t('*** plus aucune reference active a qwen3.6 ***',()=>{
  if(/qwen3\.6/.test(code))throw new Error('encore utilise : '+(code.match(/.{0,60}qwen3\.6.{0,40}/)||[])[0]);
});
t('*** le modele de vision est bien qwen3.8-27b ***',()=>{
  if(!/const MODELE_VISION='qwen\/qwen3\.8-27b'/.test(src))throw new Error('constante absente ou differente');
});
t('l\'identifiant respecte le format Groq',()=>{
  const m=src.match(/const MODELE_VISION='([^']+)'/);
  if(!m)throw new Error('introuvable');
  if(!/^qwen\/qwen[\d.]+-\d+b$/.test(m[1]))throw new Error('format inattendu : '+m[1]);
});
t('un seul endroit definit le modele',()=>{
  eq((src.match(/MODELE_VISION=/g)||[]).length,1,'une seule definition');
  eq((src.match(/MODELE_VISION/g)||[]).length,2,'definition + usage');
});
t('le modele texte est inchange',()=>{
  if(!/hasImg\?MODELE_VISION:'openai\/gpt-oss-20b'/.test(src))throw new Error('aiguillage modifie');
  if(!/'openai\/gpt-oss-120b'/.test(src))throw new Error('modele 120b perdu');
});

console.log('\n=== DD. reasoning_effort ===');
t('*** la regle ne vise plus une version precise ***',()=>{
  if(/indexOf\('qwen3\.\d'\)>=0\)\{_body\.reasoning_effort/.test(code))
    throw new Error('condition liee a une version : muette apres migration');
  if(!/indexOf\('qwen'\)>=0\)\{_body\.reasoning_effort='none'/.test(code))
    throw new Error('regle qwen absente');
});
t('gpt-oss garde ses valeurs autorisees',()=>{
  if(!/\['low','medium','high'\]/.test(code))throw new Error('garde gpt-oss perdue');
});
t('les deux familles restent distinguees',()=>{
  const i=code.indexOf("indexOf('qwen')>=0){_body.reasoning_effort");
  const j=code.indexOf("indexOf('gpt-oss')>=0");
  if(i<0||j<0)throw new Error('branches introuvables');
  if(i>j)throw new Error('qwen teste apres gpt-oss : ordre a verifier');
});

console.log('\n=== DE. Coherence de l\'appel ===');
t('l\'aiguillage image/texte est preserve',()=>{
  if(!/hasImg=messages\.some/.test(code))throw new Error('detection d\'image perdue');
});
t('les images partent en image_url base64',()=>{
  if(!/type:'image_url',image_url:\{url:`data:\$\{p\.source\.media_type\};base64/.test(code))
    throw new Error('format d\'image modifie');
});
t('le commentaire documente la date de decommissionnement',()=>{
  if(!/14\/09\/2026/.test(src))throw new Error('date absente du commentaire');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
