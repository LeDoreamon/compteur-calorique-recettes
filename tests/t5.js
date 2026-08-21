const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(name,fn){try{fn();console.log('  ok  '+name);pass++;}catch(e){console.log('  KO  '+name+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
function hydrate(cid){
  const h=docEl(cid).innerHTML||'';const re=/<input\b([^>]*)>/g;let m;
  while((m=re.exec(h))){
    const attrs=m[1];const id=(attrs.match(/id="([^"]+)"/)||[])[1];if(!id)continue;
    const el=docEl(id);const v=(attrs.match(/value="([^"]*)"/)||[])[1];
    if(v!==undefined)el.value=v;el.checked=/\bchecked\b/.test(attrs);
  }
}
const txt=()=>docEl('invpick-sum').innerHTML.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
function freshInv(){
  sb.S.inv={frigo:[
    {id:'b1',name:'Allumettes de bacon',qty:800,unit:'g',mac100:{kcal:130,prot:13.5,gluc:0.5,lip:8.5}},
    {id:'i1',name:'Poulet',qty:500,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}},
    {id:'i2',name:'Oeufs',qty:6,unit:'pcs',pieceG:55,macPiece:{kcal:78,prot:6.5,gluc:0.6,lip:5.3}},
    {id:'i3',name:'Ramen',qty:200,unit:'pcs',pkg:{size:100},mac100:{kcal:450,prot:9,gluc:60,lip:20}},
    {id:'i4',name:'Sel',qty:null,unit:'g',mac100:{kcal:0,prot:0,gluc:0,lip:0}}
  ],placards:[
    {id:'i5',name:'Riz',qty:1000,unit:'g',mac100:{kcal:350,prot:7,gluc:78,lip:1}}
  ]};
}
sb.S.dayMeals=sb.S.dayMeals||{};freshInv();
const invAddMeal=sb.invAddMeal||sb.window.invAddMeal;

console.log('\n=== R. Pied du selecteur : les 4 macros ===');
t('rien de selectionne',()=>{
  sb.openAddMeal('text');invAddMeal();
  if(!txt().includes('Rien de'))throw new Error(txt());
});
t('le cas de la capture : 10 g de bacon',()=>{
  sb.invPickQty('b1',10);
  const s=txt();
  // 10 g -> 13 kcal, 1,35 prot, 0,05 gluc, 0,85 lip
  if(!s.includes('13 kcal'))throw new Error('kcal: '+s);
  if(!s.includes('1,4 g prot.'))throw new Error('prot: '+s);
  if(!s.includes('0,1 g gluc.'))throw new Error('gluc: '+s);
  if(!s.includes('0,9 g lip.'))throw new Error('lip: '+s);
});
t('les 4 macros sont toutes presentes',()=>{
  const s=txt();
  ['kcal','prot.','gluc.','lip.'].forEach(k=>{if(!s.includes(k))throw new Error(k+' absent: '+s);});
});
t('le compteur d\'ingredients reste affiche',()=>{
  if(!txt().includes('1 ingrédient'))throw new Error(txt());
});
t('pluriel correct a 2 ingredients',()=>{
  sb.invPickQty('i1',100);
  if(!txt().includes('2 ingrédients'))throw new Error(txt());
});

console.log('\n=== S. Formatage des nombres ===');
t('valeur ronde sans decimale parasite',()=>{
  sb.openAddMeal('text');invAddMeal();
  sb.invPickQty('i1',100);   // 23 g prot pile
  const s=txt();
  if(!s.includes('23 g prot.'))throw new Error(s);
  if(s.includes('23,0'))throw new Error('decimale parasite: '+s);
});
t('separateur decimal francais (virgule)',()=>{
  sb.openAddMeal('text');invAddMeal();
  sb.invPickQty('i2',1);   // 6,5 g prot
  const s=txt();
  if(!s.includes('6,5 g prot.'))throw new Error(s);
  if(s.includes('6.5'))throw new Error('point au lieu de virgule: '+s);
});
t('zero affiche 0 et non 0,0',()=>{
  sb.openAddMeal('text');invAddMeal();
  sb.invPickQty('i5',100);   // riz : 0 lip? non, 1 lip. gluc 78, prot 7
  sb.invPickQty('i4',5);     // sel : tout a zero
  const s=txt();
  if(s.includes(',0 '))throw new Error('decimale zero parasite: '+s);
});

console.log('\n=== T. Coherence pied <-> repas enregistre ===');
function bout(sel){
  freshInv();sb.openAddMeal('text');invAddMeal();
  Object.keys(sel).forEach(k=>sb.invPickQty(k,sel[k]));
  const pied=txt();
  sb.applyInvPick();hydrate('inv-items-section');sb.recalcAddMealMacros();
  return {pied,kcal:+docEl('addmeal-kcal').value,prot:+docEl('addmeal-prot').value,
          gluc:+docEl('addmeal-gluc').value,lip:+docEl('addmeal-lip').value};
}
t('poulet 200g : pied et repas concordent',()=>{
  const r=bout({i1:200});
  eq(r.kcal,240,'kcal');eq(r.prot,46,'prot');eq(r.gluc,0,'gluc');eq(r.lip,4,'lip');
  if(!r.pied.includes('240 kcal')||!r.pied.includes('46 g prot.'))throw new Error(r.pied);
});
t('2 ramen (emballage) : pied et repas concordent',()=>{
  const r=bout({i3:2});
  eq(r.kcal,900,'kcal');eq(r.prot,18,'prot');eq(r.gluc,120,'gluc');eq(r.lip,40,'lip');
  if(!r.pied.includes('900 kcal')||!r.pied.includes('120 g gluc.'))throw new Error(r.pied);
});
t('3 oeufs (macPiece) : pied et repas concordent',()=>{
  const r=bout({i2:3});
  eq(r.kcal,234,'kcal');
  if(!r.pied.includes('234 kcal')||!r.pied.includes('19,5 g prot.'))throw new Error(r.pied);
});
t('combinaison : pied et repas concordent',()=>{
  const r=bout({i1:150,i5:80,i2:1});
  // kcal 180+280+78=538 ; prot 34,5+5,6+6,5=46,6 ; gluc 0+62,4+0,6=63 ; lip 3+0,8+5,3=9,1
  eq(r.kcal,538,'kcal');
  if(!r.pied.includes('538 kcal'))throw new Error(r.pied);
  if(!r.pied.includes('46,6 g prot.'))throw new Error(r.pied);
});

console.log('\n=== U. Robustesse ===');
t('article introuvable ignore sans casser',()=>{
  sb.openAddMeal('text');invAddMeal();
  sb.invPickQty('inexistant',50);sb.invPickQty('i1',100);
  if(!txt().includes('1 ingrédient'))throw new Error(txt());
});
t('article sans macros = 0 partout',()=>{
  sb.openAddMeal('text');invAddMeal();
  sb.invPickQty('i4',10);
  const s=txt();
  if(!s.includes('0 kcal')||!s.includes('0 g prot.'))throw new Error(s);
});
t('remise a zero vide le pied',()=>{
  sb.openAddMeal('text');invAddMeal();
  sb.invPickQty('i1',100);sb.invPickQty('i1',0);
  if(!txt().includes('Rien de'))throw new Error(txt());
});
t('pas de "undefined" ni "NaN" dans le pied',()=>{
  sb.openAddMeal('text');invAddMeal();
  sb.invPickQty('i1',150);sb.invPickQty('i2',2);sb.invPickQty('i3',1);
  const s=docEl('invpick-sum').innerHTML;
  if(/undefined|NaN/.test(s))throw new Error(s);
});

console.log('\n=== V. Rendu du selecteur ===');
t('overflow-x masque sur la liste',()=>{
  const fs=require('fs');const html=fs.readFileSync('index.html','utf8');
  if(!html.includes('overflow-y:auto;overflow-x:hidden'))throw new Error('non applique');
});
t('input quantite en box-sizing:border-box',()=>{
  sb.openAddMeal('text');invAddMeal();
  const h=docEl('invpick-list').innerHTML;
  if(!h.includes('box-sizing:border-box'))throw new Error('non applique');
});
t('le pied utilise flex-wrap (pas de debordement)',()=>{
  sb.invPickQty('i1',999);
  if(!docEl('invpick-sum').innerHTML.includes('flex-wrap:wrap'))throw new Error('pas de wrap');
});

console.log('\n---- '+pass+' ok, '+fail+' KO ----');
