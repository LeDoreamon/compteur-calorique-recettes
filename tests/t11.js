const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];

// Rejoue la fiche article : on remplit les champs puis on enregistre
function fiche({unit,pieceG,pkgSize,pkgCount,qty,mac}){
  S.inv={frigo:[{id:'z1',name:'Pizzas De la Mama',qty:qty,unit:unit,
                 pieceG:pieceG,pkg:pkgSize?{size:pkgSize}:undefined,
                 mac100:mac||{kcal:240,prot:10,gluc:28,lip:9}}],
         placards:[],congelateur:[],epices:[]};
  G('openItemDetail')('frigo','z1');
  docEl('item-kcal').value=(mac||{kcal:240}).kcal;docEl('item-prot').value=10;
  docEl('item-gluc').value=28;docEl('item-lip').value=9;
  docEl('item-unit').value=unit;
  docEl('item-pieceg').value=pieceG||'';
  docEl('item-pkg-size').value=pkgSize||'';
  docEl('item-pkg-count').value=pkgCount||'';
  docEl('item-dlc').value='';
  G('saveItemDetail')();
  return sb.findItem('z1');
}

console.log('\n=== AE. Le cas des pizzas ===');
t('*** 467 x 2 en pieces ne donne plus 934 pieces ***',()=>{
  const it=fiche({unit:'pcs',pieceG:467,pkgSize:467,pkgCount:2,qty:2});
  if(it.qty===934)throw new Error('toujours 934 pieces');
  eq(it.qty,2,'quantite');
});
t('le poids d\'une unite est conserve',()=>{
  const it=fiche({unit:'pcs',pieceG:467,pkgSize:467,pkgCount:2,qty:2});
  eq(it.pieceG,467,'pieceG');
});
t('pkg est retire sur une unite denombrable',()=>{
  const it=fiche({unit:'pcs',pieceG:467,pkgSize:467,pkgCount:2,qty:2});
  if(it.pkg)throw new Error('pkg encore present : '+JSON.stringify(it.pkg));
});
t('les macros d\'une unite restent justes',()=>{
  const it=fiche({unit:'pcs',pieceG:467,pkgSize:467,pkgCount:2,qty:2});
  eq(Math.round(sb.itemMealMacros(it,1).kcal),1121,'1 pizza');
  eq(Math.round(sb.itemMealMacros(it,2).kcal),2242,'2 pizzas');
});

console.log('\n=== AF. Non-regression : articles au poids ===');
t('467 x 2 en grammes donne bien 934 g',()=>{
  const it=fiche({unit:'g',pkgSize:467,pkgCount:2,qty:0});
  eq(it.qty,934,'quantite');
  eq(it.pkg.size,467,'pkg conserve');
});
t('les macros au poids restent justes',()=>{
  const it=fiche({unit:'g',pkgSize:467,pkgCount:2,qty:0});
  eq(Math.round(sb.itemMealMacros(it,100).kcal),240,'100 g');
});
t('un pkg existant devient pieceG au passage en pieces',()=>{
  // cas des ramen : unit pcs, pkg.size 100, aucun pieceG
  S.inv={frigo:[{id:'z2',name:'Ramen',qty:2,unit:'pcs',pkg:{size:100},
                 mac100:{kcal:450,prot:9,gluc:60,lip:20}}],placards:[],congelateur:[],epices:[]};
  G('openItemDetail')('frigo','z2');
  docEl('item-kcal').value=450;docEl('item-prot').value=9;
  docEl('item-gluc').value=60;docEl('item-lip').value=20;
  docEl('item-unit').value='pcs';docEl('item-pieceg').value='';
  docEl('item-pkg-size').value='';docEl('item-pkg-count').value='';
  docEl('item-dlc').value='';
  G('saveItemDetail')();
  const it=sb.findItem('z2');
  eq(it.pieceG,100,'pieceG repris depuis pkg');
  eq(Math.round(sb.itemMealMacros(it,1).kcal),450,'macros preservees');
});

console.log('\n=== AG. Boutons de paquet ===');
t('stepInvPkg n\'agit plus sur une unite denombrable',()=>{
  S.inv={frigo:[{id:'z3',name:'X',qty:5,unit:'pcs',pkg:{size:100},mac100:{kcal:100,prot:1,gluc:1,lip:1}}],
         placards:[],congelateur:[],epices:[]};
  G('stepInvPkg')('frigo','z3',1);
  eq(sb.findItem('z3').qty,5,'quantite inchangee');
});
t('stepInvPkg fonctionne toujours au poids',()=>{
  S.inv={frigo:[{id:'z4',name:'Y',qty:500,unit:'g',pkg:{size:100},mac100:{kcal:100,prot:1,gluc:1,lip:1}}],
         placards:[],congelateur:[],epices:[]};
  G('stepInvPkg')('frigo','z4',1);
  eq(sb.findItem('z4').qty,600,'+1 paquet');
  G('stepInvPkg')('frigo','z4',-1);
  eq(sb.findItem('z4').qty,500,'-1 paquet');
});

console.log('\n=== AH. Diagnostic des quantites douteuses ===');
t('*** les pizzas a 934 pcs sont signalees ***',()=>{
  S.inv={frigo:[{id:'z5',name:'Pizzas De la Mama',qty:934,unit:'pcs',pieceG:467,
                 mac100:{kcal:240,prot:10,gluc:28,lip:9}}],placards:[],congelateur:[],epices:[]};
  const d=sb.invIssues();
  if(!d.suspects||!d.suspects.length)throw new Error('non detecte');
  eq(d.suspects[0].paquets,2,'nombre suggere');
});
t('les ramen a 200 pcs sont signales',()=>{
  S.inv={frigo:[{id:'z6',name:'Ramen',qty:200,unit:'pcs',pkg:{size:100},
                 mac100:{kcal:450,prot:9,gluc:60,lip:20}}],placards:[],congelateur:[],epices:[]};
  const d=sb.invIssues();
  if(!d.suspects.length)throw new Error('non detecte');
  eq(d.suspects[0].paquets,2,'nombre suggere');
});
t('un stock normal n\'est pas signale',()=>{
  S.inv={frigo:[
    {id:'a',name:'Oeufs',qty:10,unit:'pcs',pieceG:55,macPiece:{kcal:78,prot:6,gluc:1,lip:5},mac100:{kcal:140,prot:12,gluc:1,lip:10}},
    {id:'b',name:'Riz',qty:1000,unit:'g',mac100:{kcal:350,prot:7,gluc:78,lip:1}},
    {id:'c',name:'Compotes',qty:16,unit:'pc',pieceG:100,mac100:{kcal:60,prot:0,gluc:14,lip:0}}
  ],placards:[],congelateur:[],epices:[]};
  const d=sb.invIssues();
  if(d.suspects.length)throw new Error('faux positif : '+d.suspects.map(x=>x.it.name).join(', '));
});
t('le diagnostic s\'affiche sans casser',()=>{
  S.inv={frigo:[{id:'z7',name:'Pizzas',qty:934,unit:'pcs',pieceG:467,mac100:{kcal:240,prot:10,gluc:28,lip:9}}],
         placards:[],congelateur:[],epices:[]};
  S.diagOpen=1;
  const html=G('renderInvDiag')();
  if(!html.includes('934'))throw new Error('quantite absente');
  if(/undefined|NaN/.test(html))throw new Error('rendu invalide');
  const o=(html.match(/<div/g)||[]).length,c=(html.match(/<\/div>/g)||[]).length;
  eq(o,c,'balises div');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
