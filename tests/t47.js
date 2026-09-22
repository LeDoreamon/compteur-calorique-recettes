const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
async function t(n,f){try{await f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');
(async()=>{
console.log('\n=== GE. Sauvegarde complete ===');
await t('*** l\'export embarque etat, depense et photos ***',()=>{
  const i=src.indexOf('async function exportBackup');
  const b=src.slice(i,i+900);
  if(!/state:st/.test(b))throw new Error('etat absent');
  if(!/burn:_burnData/.test(b))throw new Error('depense absente');
  if(!/photos:PHOTOS/.test(b))throw new Error('photos absentes');
  if(!/_format:2/.test(b))throw new Error('version de format absente');
});
await t('la cle d\'API ne part jamais dans le fichier',()=>{
  const i=src.indexOf('async function exportBackup');
  if(!/delete st\.groqKey/.test(src.slice(i,i+900)))throw new Error('cle exportee');
});

console.log('\n=== GF. Lecture d\'une sauvegarde ===');
const lire=G('_lireSauvegarde');
await t('*** le format complet est lu ***',()=>{
  const sv=lire(JSON.stringify({_format:2,state:{inv:{frigo:[]},dayMeals:{'2026-09-01':[]}},
    burn:{'2026-09-01':{steps:9000}},photos:{a:'data:image/jpeg;base64,AAAA'}}));
  eq(Object.keys(sv.state.dayMeals).length,1);
  eq(sv.burn['2026-09-01'].steps,9000);
  eq(Object.keys(sv.photos).length,1);
});
await t('*** un ancien export (etat seul) reste lisible ***',()=>{
  const sv=lire(JSON.stringify({inv:{frigo:[]},dayMeals:{'2026-08-01':[]}}));
  eq(Object.keys(sv.state.dayMeals).length,1);
  eq(sv.burn,null);eq(sv.photos,null);
});
await t('un fichier etranger est refuse',()=>{
  let ok=false;try{lire(JSON.stringify({bonjour:1}));}catch(e){ok=/sauvegarde/.test(e.message);}
  if(!ok)throw new Error('fichier etranger accepte');
});
await t('un fichier corrompu est refuse',()=>{
  let ok=false;try{lire('{pas du json');}catch(e){ok=true;}
  if(!ok)throw new Error('accepte');
});
await t('*** une photo piegee dans la sauvegarde est ecartee ***',()=>{
  const sv=lire(JSON.stringify({_format:2,state:{inv:{},dayMeals:{}},
    photos:{ok:'data:image/png;base64,AAAA',ko:'x" onerror="alert(1)'}}));
  eq(Object.keys(sv.photos).join(','),'ok');
});

console.log('\n=== GG. Restauration ===');
await t('*** la restauration remet repas, depense et photos ***',async()=>{
  S.dayMeals={};G('__setBurn')({});
  await G('_restaurerSauvegarde')({
    state:{inv:{frigo:[{id:'p',name:'Poulet',qty:500,unit:'g',mac100:{kcal:165,prot:31,gluc:0,lip:4}}]},
           dayMeals:{'2026-09-01':[{rid:'x',name:'Repas restaure',mult:1,macros:{kcal:500,prot:40,gluc:40,lip:15}}]}},
    burn:{'2026-09-01':{steps:12000,activities:[]}},
    photos:{liam_v6_poulet_riz_soja:'data:image/jpeg;base64,AAAA'}});
  eq(S.dayMeals['2026-09-01'][0].name,'Repas restaure');
  eq(sb.findItem('p').qty,500);
  if(!sb.getBurn('2026-09-01'))throw new Error('depense non restauree');
  eq(G('photoRecette')('liam_v6_poulet_riz_soja'),'data:image/jpeg;base64,AAAA','photo non restauree');
});
await t('*** un nom piege est neutralise a la restauration ***',async()=>{
  await G('_restaurerSauvegarde')({state:{inv:{frigo:[{id:'z',name:'<img onerror=x>',qty:1,unit:'g',mac100:{kcal:1,prot:0,gluc:0,lip:0}}]},dayMeals:{}},burn:null,photos:null});
  if(/[<>]/.test(sb.findItem('z').name))throw new Error('non neutralise');
});
await t('l\'etat courant est mis de cote avant restauration',()=>{
  const i=src.indexOf('async function _restaurerSauvegarde');
  if(!/'\/filet'/.test(src.slice(i,i+500)))throw new Error('aucun filet');
});
await t('le bouton de restauration est present',()=>{
  if(!/onclick="importBackup\(\)"/.test(src))throw new Error('bouton absent');
  if(!/id="backup-file-input"/.test(src))throw new Error('champ de fichier absent');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
})();
