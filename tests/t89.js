const {sb,docEl}=require('./sb.js');
const vm=require('vm'),fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const html=fs.readFileSync('index.html','utf8');
const INV=require('./data/inv.json');const fr=[];
Object.values(INV).forEach(it=>{fr.push({id:it.id,name:it.n,unit:it.u,qty:(it.q===-1?null:it.q)});});
console.log('\n=== LIII. Dev : rendu plus leger, clics ===');

t('*** voisins a zero : mots-cles calcules une fois par article, pas par paire ***',()=>{
  sb.S.inv={frigo:fr.map(o=>Object.assign({},o)),placards:[],congelateur:[],epices:[]};
  X('var _vraiMC=_motsCles,_nMC=0;_motsCles=function(n){_nMC++;return _vraiMC(n);};');
  try{X('paires0k()');const n=X('_nMC');if(n>fr.length)throw new Error(n+' appels pour '+fr.length+' articles');}
  finally{X('_motsCles=_vraiMC;');}
});
t('voisins a zero : meme resultat qu\'avant (un plein, un vide, mot commun)',()=>{
  sb.S.inv={frigo:[{id:'a',name:'Lait demi-écrémé',qty:0,unit:'ml'},{id:'b',name:'Lait sans lactose',qty:500,unit:'ml'},
    {id:'c',name:'Beurre doux',qty:0,unit:'g'},{id:'d',name:'Jambon blanc',qty:4,unit:'tranches'},{id:'e',name:'Lait d\'avoine',qty:1000,unit:'ml'}],placards:[],congelateur:[],epices:[]};
  sb.S.paires0k={};
  const p=X('paires0k()').map(x=>x.plein.it.id+'>'+x.vide.it.id).sort().join(' ');
  eq(p,'b>a e>a');
});
t('diagnostic : date limite depassee toujours reperee (date du jour calculee une fois)',()=>{
  sb.S.inv={frigo:[{id:'x',name:'Yaourt',qty:2,unit:'pots',dlc:'2001-01-01'},{id:'y',name:'Skyr',qty:1,unit:'pots',dlc:'2999-01-01'}],placards:[],congelateur:[],epices:[]};
  eq(X('invIssues()').expires.map(e=>e.it.id).join(','),'x');
});
t('*** date du profil : un seul formateur par fuseau, et le bon jour apres changement de fuseau ***',()=>{
  const tz0=sb.S.tz;
  X('var _vraiDTF=Intl.DateTimeFormat,_nDTF=0;Intl.DateTimeFormat=function(a,b){_nDTF++;return new _vraiDTF(a,b);};_fmtProfil={tz:null,f:null};');
  try{
    sb.S.tz='Europe/Paris';for(let i=0;i<50;i++)X('getToday()');
    eq(X('_nDTF'),1,'formateurs');
    const attendu=tz=>X("new _vraiDTF('en-CA',{timeZone:'"+tz+"',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())");   /* horloge du bac a sable */
    ['Pacific/Kiritimati','Pacific/Pago_Pago','Europe/Paris'].forEach(tz=>{sb.S.tz=tz;eq(X('getToday()'),attendu(tz),tz);});
    eq(X('_nDTF'),4,'un par changement de fuseau');
  }finally{X('Intl.DateTimeFormat=_vraiDTF;_fmtProfil={tz:null,f:null};');sb.S.tz=tz0;}
});
t('*** clics delegues : chaque data-action a son traitement, aucun traitement orphelin ***',()=>{
  const utilises=new Set((html.match(/data-action="[a-z-]+"/g)||[]).map(s=>s.slice(13,-1)));
  /* boutons generes par navBtn('prev-day'…) */
  (html.match(/navBtn\('([a-z-]+)'/g)||[]).forEach(s=>utilises.add(s.slice(8,-1)));
  const f=html.slice(html.indexOf('function _onActionClick('),html.indexOf('ROOT.addEventListener(\'click\',_onActionClick)'));
  const traites=new Set((f.match(/action==='([a-z-]+)'/g)||[]).map(s=>s.slice(10,-1)));
  const sans=[...utilises].filter(a=>!traites.has(a)),morts=[...traites].filter(a=>!utilises.has(a));
  if(sans.length)throw new Error('sans traitement : '+sans.join(', '));
  if(morts.length)throw new Error('traitement jamais declenche : '+morts.join(', '));
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
