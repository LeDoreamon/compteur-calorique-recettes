// Dates limites dans « Qu'as-tu utilisé ? » (06/11/2026, demande de Liam)
const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const S=sb.S;
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
const J=n=>X('shiftDate(getToday(),'+n+')');
const prepa=()=>{
  Object.keys(LS).forEach(k=>delete LS[k]);
  S.inv={frigo:[{id:'gno',name:'Gnocchi a poêler extra raclette',qty:340,unit:'g',dlc:J(3)},
      {id:'creme',name:'Crème fraîche légère',qty:1200,unit:'g',dlc:J(10)},
      {id:'jambon',name:'Jambon blanc',qty:310,unit:'g',dlc:J(40)},
      {id:'lait',name:'Lait sans lactose',qty:null,unit:'ml'},
      {id:'chorizo',name:'Dés de chorizo',qty:120,unit:'g',dlc:J(-2)},
      {id:'oeufs',name:'Oeufs',qty:18,unit:'pcs',dlc:J(-5)},
      {id:'chili',name:'Chili maison',qty:2,unit:'parts',dlc:J(2),plat:{creeLe:J(-1),parts:3,poidsEstime:900,ings:[]},macPiece:{kcal:520,prot:40,gluc:45,lip:15},pieceG:300}],
    placards:[],congelateur:[],epices:[]};
  X('_addMealInvSuggestions=[]');docEl('invpick-search').value='';X("openInvPick();choisirOngletPick('frigo')");
};
const ligne=id=>{const h=docEl('invpick-list').innerHTML;const i=h.indexOf('id="pick-row-'+id+'"');if(i<0)return null;const j=h.indexOf('id="pick-row-',i+10);return h.slice(i,j<0?h.length:j);};
const pastille=id=>{const m=(ligne(id)||'').match(/<span class="pk-dlc" style="background:([^;]+);color:([^;]+);">([^<]*)<\/span>/);return m?{bg:m[1],color:m[2],txt:m[3]}:null;};

console.log('\n=== LXXXIV. Dates limites dans « Qu\'as-tu utilise ? » ===');
t('*** moins de 7 jours : pastille rouge « DLC 3j ⚠ », sous le nom ***',()=>{
  prepa();const p=pastille('gno');if(!p)throw new Error(ligne('gno'));
  eq(p.txt,'DLC 3j ⚠');eq(p.color,'var(--red)');
  if(!/<span class="pk-nom"><span class="pk-n">Gnocchi a poêler extra raclette<\/span><span class="pk-dlc"/.test(ligne('gno')))throw new Error('place');
});
t('*** 7 a 14 jours : orange ; date depassee : « DLC Expiré » ***',()=>{
  prepa();eq(pastille('creme').txt,'DLC 10j');eq(pastille('creme').color,'var(--orange)');
  eq(pastille('chorizo').txt,'DLC Expiré');
});
t('plus de 14 jours ou pas de date : rien, comme dans la liste de l\'inventaire',()=>{
  prepa();eq(pastille('jambon'),null,'40 jours');eq(pastille('lait'),null,'sans date');
});
t('*** œufs : la marge de 14 jours de l\'inventaire compte aussi ici ***',()=>{
  prepa();eq(pastille('oeufs').txt,'DLC 9j','date du carton -5 j + 14 j');
});
t('plat maison : sa date aussi',()=>{
  prepa();eq(pastille('chili').txt,'DLC 2j ⚠');if(ligne('chili').indexOf('🍳 Chili maison')<0)throw new Error('nom du plat');
});
t('*** recherche dans tout l\'inventaire : pastilles gardees ***',()=>{
  prepa();docEl('invpick-search').value='g';X('renderInvPick()');eq(pastille('gno').txt,'DLC 3j ⚠');
});
t('*** saisir une quantite ne redessine pas la liste (le clavier reste ouvert), la pastille reste ***',()=>{
  prepa();const avant=docEl('invpick-list').innerHTML;X("invPickQty('gno','340')");
  eq(docEl('invpick-list').innerHTML,avant,'liste redessinee');eq(pastille('gno').txt,'DLC 3j ⚠');
});
t('nom long : coupe proprement sur une ligne, la pastille en dessous ne le raccourcit pas',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!/\.pick-row \.pk-n \{ display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; \}/.test(src))throw new Error('ellipse du nom');
  if(!/\.pick-row \.pk-dlc \{ display: inline-block;[^}]*font-size: 11px;/.test(src))throw new Error('pastille');
});

console.log('---- '+pass+' ok, '+fail+' KO');
