const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
function hydrate(cid){
  const h=docEl(cid).innerHTML||'';const re=/<input\b([^>]*)>/g;let m;
  while((m=re.exec(h))){const a=m[1];const id=(a.match(/id="([^"]+)"/)||[])[1];if(!id)continue;
    const el=docEl(id);const v=(a.match(/value="([^"]*)"/)||[])[1];
    if(v!==undefined)el.value=v;el.checked=/\bchecked\b/.test(a);}
}
function inv(){S.inv={frigo:[
  {id:'p',name:'Poulet',unit:'g',qty:500,mac100:{kcal:120,prot:23,gluc:0,lip:2}},
  {id:'r',name:'Riz',unit:'g',qty:1000,mac100:{kcal:350,prot:7,gluc:78,lip:1}}],
  placards:[],congelateur:[],epices:[]};}
inv();S.dayMeals={};

console.log('\n=== BC. Bug des "0k" sur les lignes du selecteur ===');
t('*** une ligne du selecteur affiche ses vraies calories ***',()=>{
  sb.openAddMeal('text');G('invAddMeal')();
  sb.invPickQty('p',200);sb.applyInvPick();
  const h=docEl('inv-items-section').innerHTML;
  if(/>0k</.test(h))throw new Error('affiche 0k');
  if(!h.includes('240k'))throw new Error('240k attendu : '+h.slice(0,400));
});

console.log('\n=== BD. Icone oeil ===');
t('les macros sont masquees par defaut',()=>{
  S.voirMacrosIng=false;
  sb.openAddMeal('text');G('invAddMeal')();
  sb.invPickQty('p',200);sb.applyInvPick();
  if(/>P 46</.test(docEl('inv-items-section').innerHTML))throw new Error('affichees a tort');
});
t('*** l\'oeil deplie les trois macros ***',()=>{
  G('toggleIngMacros')();
  const h=docEl('inv-items-section').innerHTML;
  if(!/P 46/.test(h))throw new Error('prot absente : '+h.slice(0,500));
  if(!/G 0/.test(h))throw new Error('gluc absente');
  if(!/L 4/.test(h))throw new Error('lip absente');
});
t('l\'oeil se referme',()=>{
  G('toggleIngMacros')();
  if(/P 46/.test(docEl('inv-items-section').innerHTML))throw new Error('toujours affichees');
});
t('le choix est persiste',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!src.includes('S.voirMacrosIng=!S.voirMacrosIng'))throw new Error('non memorise');
});

console.log('\n=== BE. Lignes estimees hors inventaire ===');
function poserEstimes(items){
  sb.openAddMeal('text');sb.manualAddMeal();
  G('__setFree')(items.map(x=>{
    const q=x.q,m={kcal:x.kcal,prot:x.prot,gluc:x.gluc,lip:x.lip};
    return {n:x.n,qty:q,baseQty:q,unit:x.u,m:m,
            pu:q>0?{kcal:m.kcal/q,prot:m.prot/q,gluc:m.gluc/q,lip:m.lip/q}:null};
  }));
  sb.renderInvSuggestions([]);
  hydrate('inv-items-section');
  sb.recalcAddMealMacros();
}
t('les lignes estimees s\'affichent',()=>{
  poserEstimes([{n:'Pâtes',q:200,u:'g',kcal:320,prot:11,gluc:64,lip:2},
                {n:'Gorgonzola',q:30,u:'g',kcal:105,prot:6,gluc:0,lip:9}]);
  const h=docEl('inv-items-section').innerHTML;
  if(!h.includes('Pâtes'))throw new Error('absente');
  if(!h.includes('Gorgonzola'))throw new Error('absente');
});
t('*** elles portent une couleur distincte ***',()=>{
  const h=docEl('inv-items-section').innerHTML;
  if(!/var\(--blue\)/.test(h))throw new Error('pas de couleur distincte');
  if(!/hors inventaire/i.test(h))throw new Error('mention absente');
});
t('*** leur quantite est modifiable ***',()=>{
  const h=docEl('inv-items-section').innerHTML;
  if(!/id="free-qty-0"/.test(h))throw new Error('champ absent');
  if(/id="free-qty-0"[^>]*disabled/.test(h))throw new Error('champ desactive');
});
t('*** les totaux incluent les lignes estimees ***',()=>{
  eq(+docEl('addmeal-kcal').value,425,'320+105');
  eq(+docEl('addmeal-prot').value,17,'11+6');
});
t('*** changer une quantite recalcule proportionnellement ***',()=>{
  docEl('free-qty-0').value=100;      // 200 -> 100 g de pates
  sb.recalcAddMealMacros();
  eq(+docEl('addmeal-kcal').value,265,'160+105');
});
t('quantite a zero : la ligne ne compte plus',()=>{
  docEl('free-qty-0').value=0;docEl('free-qty-1').value=0;
  sb.recalcAddMealMacros();
  eq(+docEl('addmeal-kcal').value,0);
});

console.log('\n=== BF. Melange inventaire + estime ===');
t('les deux sections coexistent sans se melanger',()=>{
  inv();
  sb.openAddMeal('text');G('invAddMeal')();
  sb.invPickQty('p',200);sb.applyInvPick();
  G('__setFree')([{n:'Sauce cantine',qty:50,baseQty:50,unit:'g',
                   m:{kcal:100,prot:1,gluc:5,lip:9},pu:{kcal:2,prot:0.02,gluc:0.1,lip:0.18}}]);
  sb.renderInvSuggestions(sb.__getSugg());
  hydrate('inv-items-section');
  sb.recalcAddMealMacros();
  const h=docEl('inv-items-section').innerHTML;
  if(!h.includes('Poulet'))throw new Error('ligne inventaire perdue');
  if(!h.includes('Sauce cantine'))throw new Error('ligne estimee perdue');
  eq(+docEl('addmeal-kcal').value,340,'240 + 100');
});
t('l\'en-tete distingue les deux origines',()=>{
  const h=docEl('inv-items-section').innerHTML;
  if(!/Depuis l'inventaire/.test(h))throw new Error('en-tete inventaire absent');
  if(!/hors inventaire/i.test(h))throw new Error('en-tete estime absent');
});

console.log('\n=== BG. Enregistrement et re-edition ===');
t('*** les lignes estimees partent avec le repas ***',()=>{
  docEl('addmeal-name').value='Pâtes cantine';
  sb.confirmAddMealFinal();
  const d=S.dayMeals[S.today]||[];
  if(!d.length)throw new Error('repas non enregistre');
  const ings=d[d.length-1].ings||[];
  const ia=ings.filter(x=>x.src==='ia');
  if(!ia.length)throw new Error('lignes estimees absentes de ings');
  eq(ia[0].n,'Sauce cantine');
});
t('les lignes d\'inventaire gardent leur marque',()=>{
  const d=S.dayMeals[S.today];
  const ings=d[d.length-1].ings||[];
  if(!ings.filter(x=>x.src==='inv').length)throw new Error('marque inv absente');
});
t('*** le stock n\'a bouge que pour l\'inventaire ***',()=>{
  eq(sb.findItem('p').qty,300,'500 - 200');
});
t('_emMkRow conserve l\'origine',()=>{
  const r=G('_emMkRow')({id:null,n:'X',qty:50,unit:'g',src:'ia',kcal:100,prot:1,gluc:5,lip:9});
  eq(r.src,'ia');
  if(!r._pu)throw new Error('macros par unite absentes');
  eq(Math.round(r._pu.kcal*100)/100,2,'100/50');
});
t('une ligne sans src est consideree inventaire',()=>{
  eq(G('_emMkRow')({id:'p',qty:100,unit:'g',kcal:120}).src,'inv');
});
t('*** le delta de stock ignore les lignes estimees ***',()=>{
  inv();
  G('_emApplyStockDelta')(
    [{id:null,oq:50},{id:'p',oq:100}],
    [{id:null,qty:200,src:'ia'},{id:'p',qty:150,src:'inv'}]);
  eq(sb.findItem('p').qty,450,'500 - 50 de delta');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
