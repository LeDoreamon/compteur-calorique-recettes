const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu "'+b+'" obtenu "'+a+'"');}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');

console.log('\n=== BY. L\'unite est explicite ===');
t('*** plus aucun suffixe « k » isole dans le code ***',()=>{
  const restes=src.match(/\+'k'|\+'k<|\}k<|">0k</g)||[];
  if(restes.length)throw new Error(restes.length+' restants : '+restes.join(', '));
});
t('les valeurs initiales affichent « 0 kcal »',()=>{
  const n=(src.match(/>0 kcal</g)||[]).length;
  if(n<4)throw new Error('seulement '+n+' occurrences');
});
t('*** une ligne d\'inventaire affiche bien « N kcal » ***',()=>{
  S.inv={frigo:[{id:'p',name:'Pâtes protéinées',unit:'g',qty:1000,mac100:{kcal:369,prot:20,gluc:66,lip:2}}],
         placards:[],congelateur:[],epices:[]};
  sb.openAddMeal('text');G('invAddMeal')();
  sb.invPickQty('p',200);sb.applyInvPick();
  const h=docEl('inv-items-section').innerHTML;
  if(!/738 kcal/.test(h))throw new Error('valeur attendue absente : '+h.slice(0,300));
  if(/738k[^c]/.test(h))throw new Error('ancien format encore present');
});
t('la colonne a la place pour « 1234 kcal »',()=>{
  const i=src.indexOf('id="inv-k-${i}"');
  if(!/min-width:52px/.test(src.slice(i,i+200)))throw new Error('largeur non elargie');
});
t('la colonne ne peut pas etre comprimee',()=>{
  const i=src.indexOf('id="inv-k-${i}"');
  if(!/flex-shrink:0/.test(src.slice(i,i+200)))throw new Error('flex-shrink absent');
});
t('le recalcul ecrit le meme format',()=>{
  const i=src.indexOf("getElementById('inv-k-'+idx)");
  if(!/\+' kcal'/.test(src.slice(i,i+140)))throw new Error('format different au recalcul');
});
t('*** les lignes estimees suivent le meme format ***',()=>{
  if(!src.includes("+Math.round(m.kcal)+' kcal</span>'"))
    throw new Error('lignes estimees non alignees');
  const i=src.indexOf("+Math.round(m.kcal)+' kcal</span>'");
  if(!/min-width:52px/.test(src.slice(i-200,i)))throw new Error('largeur non elargie');
  if(!/flex-shrink:0/.test(src.slice(i-200,i)))throw new Error('flex-shrink absent');
});
t('le detail P/G/L reste inchange',()=>{
  S.voirMacrosIng=true;
  sb.openAddMeal('text');G('invAddMeal')();
  sb.invPickQty('p',200);sb.applyInvPick();
  const h=docEl('inv-items-section').innerHTML;
  if(!/P 40/.test(h))throw new Error('proteines absentes');
  if(!/G 132/.test(h))throw new Error('glucides absents');
  S.voirMacrosIng=false;
});
t('aucun NaN ni undefined dans la colonne',()=>{
  sb.openAddMeal('text');G('invAddMeal')();
  sb.invPickQty('p',0);sb.applyInvPick();
  const h=docEl('inv-items-section').innerHTML;
  if(/undefined kcal|NaN kcal/.test(h))throw new Error(h.slice(0,200));
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
