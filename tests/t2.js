const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(name,fn){try{fn();console.log('  ok  '+name);pass++;}catch(e){console.log('  KO  '+name+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}

// Hydrate le faux DOM a partir du HTML genere : lit id=, value=, checked
function hydrate(containerId){
  const h=docEl(containerId).innerHTML||'';
  const re=/<input\b([^>]*)>/g;let m;
  while((m=re.exec(h))){
    const attrs=m[1];
    const id=(attrs.match(/id="([^"]+)"/)||[])[1];
    if(!id)continue;
    const el=docEl(id);
    const v=(attrs.match(/value="([^"]*)"/)||[])[1];
    if(v!==undefined)el.value=v;
    el.checked=/\bchecked\b/.test(attrs);
  }
}

sb.S.inv={frigo:[
  {id:'i1',name:'Poulet',qty:500,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}},
  {id:'i2',name:'Oeufs',qty:6,unit:'pcs',pieceG:55,macPiece:{kcal:78,prot:6.5,gluc:0.6,lip:5.3}},
  {id:'i3',name:'Ramen instantanes',qty:200,unit:'pcs',pkg:{size:100},mac100:{kcal:450,prot:9,gluc:60,lip:20}},
  {id:'i7',name:'Yaourt',qty:4,unit:'pcs',mac100:{kcal:60,prot:4,gluc:5,lip:2}}
],placards:[
  {id:'i5',name:'Riz',qty:1000,unit:'g',mac100:{kcal:350,prot:7,gluc:78,lip:1}}
]};

function parcours(sel){
  sb.openAddMeal('text');sb.manualAddMeal();sb.setInvMode(true);sb.openInvPick();
  Object.keys(sel).forEach(k=>sb.invPickQty(k,sel[k]));
  const picker=docEl('invpick-sum').innerHTML;
  sb.applyInvPick();
  hydrate('inv-items-section');
  sb.recalcAddMealMacros();
  return {picker,kcal:Number(docEl('addmeal-kcal').value),
          html:docEl('inv-items-section').innerHTML};
}

console.log('\n=== 1. Bug d\'unite ===');
t("applyInvPick doit poser une unite sur chaque ligne",()=>{
  sb.openAddMeal('text');sb.manualAddMeal();sb.setInvMode(true);sb.openInvPick();
  sb.invPickQty('i1',150);sb.applyInvPick();
  sb.__getSugg().forEach(s=>{if(s.unit===undefined)throw new Error('unit absente sur '+s.name);});
});
t("le rendu ne doit pas contenir 'undefined'",()=>{
  const h=docEl('inv-items-section').innerHTML;
  if(h.includes('undefined'))throw new Error("'undefined' affiche a l'ecran");
});

console.log('\n=== 2. Coherence picker <-> repas (grammes) ===');
t("poulet 150g + riz 80g",()=>{
  const r=parcours({i1:150,i5:80});
  if(!r.picker.includes('460'))throw new Error('picker='+r.picker);
  eq(r.kcal,460,'repas');
});

console.log('\n=== 3. Coherence sur macPiece (oeufs) ===');
t("2 oeufs : picker annonce 156",()=>{
  const r=parcours({i2:2});
  if(!r.picker.includes('156'))throw new Error('picker='+r.picker);
});
t("2 oeufs : le repas doit dire pareil",()=>{
  const r=parcours({i2:2});
  eq(r.kcal,156,'repas');
});

console.log('\n=== 4. Coherence sur pkg.size (ramen) ===');
t("1 ramen : picker annonce 450",()=>{
  const r=parcours({i3:1});
  if(!r.picker.includes('450'))throw new Error('picker='+r.picker);
});
t("1 ramen : le repas doit dire pareil",()=>{
  const r=parcours({i3:1});
  eq(r.kcal,450,'repas');
});

console.log('\n=== 5. Piece sans macPiece ni pkg (yaourt) ===');
t("2 yaourts : picker vs repas coherents",()=>{
  const r=parcours({i7:2});
  const kp=(r.picker.match(/([0-9]+) kcal/)||[])[1];
  eq(r.kcal,kp,'repas vs picker ('+r.picker.replace(/<[^>]+>/g,'')+')');
});

console.log('\n---- '+pass+' ok, '+fail+' KO ----');
