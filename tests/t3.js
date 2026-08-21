const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(name,fn){try{fn();console.log('  ok  '+name);pass++;}catch(e){console.log('  KO  '+name+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}

console.log('\n=== H. itemMealMacros : non-regression sur tous les cas ===');
const cases=[
  ['grammes simple',{unit:'g',mac100:{kcal:100,prot:10,gluc:5,lip:2}},250,250],
  ['millilitres',{unit:'ml',mac100:{kcal:40,prot:0,gluc:10,lip:0}},500,200],
  ['unite absente = grammes',{mac100:{kcal:200,prot:0,gluc:0,lip:0}},50,100],
  ['macPiece prioritaire',{unit:'pcs',macPiece:{kcal:78,prot:6,gluc:1,lip:5},mac100:{kcal:140,prot:12,gluc:1,lip:10},pieceG:55},3,234],
  ['pkg.size',{unit:'pcs',pkg:{size:100},mac100:{kcal:450,prot:9,gluc:60,lip:20}},2,900],
  ['pieceG en repli (NOUVEAU)',{unit:'pcs',pieceG:50,mac100:{kcal:200,prot:0,gluc:0,lip:0}},2,200],
  ['pkg prioritaire sur pieceG',{unit:'pcs',pkg:{size:100},pieceG:50,mac100:{kcal:100,prot:0,gluc:0,lip:0}},1,100],
  ['gramsHint prioritaire sur pkg',{unit:'pcs',pkg:{size:100},mac100:{kcal:100,prot:0,gluc:0,lip:0}},1,300,300],
  ['rien de calculable = 0',{unit:'pcs',mac100:{kcal:100,prot:0,gluc:0,lip:0}},2,0],
  ['qty 0 = 0',{unit:'g',mac100:{kcal:100,prot:0,gluc:0,lip:0}},0,0],
  ['qty negative = 0',{unit:'g',mac100:{kcal:100,prot:0,gluc:0,lip:0}},-5,0],
  ['item null = 0',null,100,0],
];
cases.forEach(c=>{
  t('itemMealMacros: '+c[0],()=>{
    const r=sb.itemMealMacros(c[1],c[2],c[4]);
    eq(Math.round(r.kcal),c[3],'kcal');
  });
});

console.log('\n=== I. render() sur les onglets ===');
sb.S.inv={frigo:[{id:'i1',name:'Poulet',qty:500,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}}],
          placards:[{id:'i5',name:'Riz',qty:1000,unit:'g',mac100:{kcal:350,prot:7,gluc:78,lip:1}}]};
const ROOT=docEl('root');
['recipes','inventory','courses','weight'].forEach(tab=>{
  t('render onglet '+tab,()=>{
    sb.S.mainTab=tab;
    sb.render();
    if(!ROOT.innerHTML||ROOT.innerHTML.length<50)throw new Error('rendu vide');
  });
});
['breakfast','lunch','dinner','snack','dessert','urgent','favs'].forEach(mt=>{
  t('render onglet repas '+mt,()=>{
    sb.S.mainTab='recipes';sb.S.mealTab=mt;
    sb.render();
    if(!ROOT.innerHTML)throw new Error('rendu vide');
  });
});

console.log('\n=== J. Equilibre des balises ===');
t('<div> et </div> equilibres',()=>{
  sb.S.mainTab='recipes';sb.S.mealTab='lunch';sb.render();
  const h=ROOT.innerHTML;
  const o=(h.match(/<div/g)||[]).length,c=(h.match(/<\/div>/g)||[]).length;
  eq(o,c,'div ouvrants vs fermants');
});

console.log('\n=== K. Pas de \\uXXXX hors du <script> ===');
t('aucune sequence \\uXXXX litterale hors script',()=>{
  const fs=require('fs');
  const html=fs.readFileSync('index.html','utf8');
  const parts=html.split(/<script>[\s\S]*?<\/script>/);
  const bad=[];
  parts.forEach(p=>{const m=p.match(/\\u[0-9a-fA-F]{4}/g);if(m)bad.push(...m);});
  if(bad.length)throw new Error('trouve: '+[...new Set(bad)].join(', '));
});

console.log('\n---- '+pass+' ok, '+fail+' KO ----');
