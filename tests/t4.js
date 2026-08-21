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
function freshInv(){
  sb.S.inv={frigo:[
    {id:'i1',name:'Poulet',qty:500,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}},
    {id:'i2',name:'Oeufs',qty:6,unit:'pcs',pieceG:55,macPiece:{kcal:78,prot:6.5,gluc:0.6,lip:5.3}},
    {id:'i3',name:'Ramen',qty:200,unit:'pcs',pkg:{size:100},mac100:{kcal:450,prot:9,gluc:60,lip:20}},
    {id:'i8',name:'Pain',qty:10,unit:'pcs',pieceG:50,mac100:{kcal:260,prot:9,gluc:50,lip:2}}
  ],placards:[
    {id:'i5',name:'Riz',qty:1000,unit:'g',mac100:{kcal:350,prot:7,gluc:78,lip:1}}
  ]};
}
sb.S.dayMeals=sb.S.dayMeals||{};
freshInv();

console.log('\n=== L. Nouvelle entree : bouton depuis l\'ecran d\'entree ===');
t('invAddMeal existe',()=>{if(typeof sb.invAddMeal!=='function'&&typeof sb.window.invAddMeal!=='function')throw new Error('non defini');});
const invAddMeal=sb.invAddMeal||sb.window.invAddMeal;
t('invAddMeal ouvre directement le selecteur',()=>{
  sb.openAddMeal('text');
  invAddMeal();
  eq(docEl('invpick-overlay').style.display,'flex','selecteur ouvert');
});
t('le mode inventaire est actif d\'office',()=>{
  eq(docEl('inv-pick-btn').style.display,'block','bouton picker visible');
});
t('le repas demarre vide',()=>{
  eq(docEl('addmeal-kcal').value,0,'kcal de depart');
});
t('la liste est peuplee',()=>{
  const h=docEl('invpick-list').innerHTML;
  if(!h.includes('Poulet')||!h.includes('Riz'))throw new Error('articles absents');
});
t('le bouton HTML appelle bien invAddMeal()',()=>{
  const fs=require('fs');const html=fs.readFileSync('index.html','utf8');
  if(!html.includes('onclick="invAddMeal()"'))throw new Error('bouton absent du HTML');
  if(!html.includes('Composer depuis mon inventaire'))throw new Error('libelle absent');
});

console.log('\n=== M. Sortie du selecteur sans rien choisir ===');
t('retour a l\'ecran d\'entree',()=>{
  sb.openAddMeal('text');invAddMeal();
  sb.closeInvPick?sb.closeInvPick():sb.window.closeInvPick();
  eq(docEl('addmeal-input').style.display,'block','ecran entree visible');
  eq(docEl('addmeal-confirm').style.display,'none','ecran confirm masque');
});
t('avec une selection, on reste sur l\'ecran de confirmation',()=>{
  sb.openAddMeal('text');invAddMeal();
  sb.invPickQty('i1',200);sb.applyInvPick();
  eq(docEl('addmeal-confirm').style.display,'block','confirm visible');
  eq(docEl('addmeal-input').style.display,'none','entree masquee');
});

console.log('\n=== N. Calculs via la nouvelle entree ===');
function viaInv(sel){
  freshInv();sb.openAddMeal('text');invAddMeal();
  Object.keys(sel).forEach(k=>sb.invPickQty(k,sel[k]));
  const picker=docEl('invpick-sum').innerHTML;
  sb.applyInvPick();hydrate('inv-items-section');sb.recalcAddMealMacros();
  return {picker,kcal:Number(docEl('addmeal-kcal').value)};
}
t('poulet 200g = 240 kcal',()=>{eq(viaInv({i1:200}).kcal,240);});
t('3 oeufs = 234 kcal',()=>{eq(viaInv({i2:3}).kcal,234);});
t('2 ramen (emballage 100g) = 900 kcal',()=>{eq(viaInv({i3:2}).kcal,900);});
t('2 pains (pieceG 50) = 260 kcal',()=>{eq(viaInv({i8:2}).kcal,260);});
t('combinaison poulet+riz+oeuf',()=>{
  // 200g poulet=240, 100g riz=350, 1 oeuf=78 -> 668
  eq(viaInv({i1:200,i5:100,i2:1}).kcal,668);
});
t('picker et repas annoncent le meme total',()=>{
  const r=viaInv({i3:2,i1:100});   // 900 + 120 = 1020
  const kp=(r.picker.match(/([0-9]+) kcal/)||[])[1];
  eq(r.kcal,kp,'repas vs picker');
});

console.log('\n=== O. NON-REGRESSION : suggestions IA en grammes ===');
t('suggestion IA 200g sur article en pieces+emballage',()=>{
  freshInv();sb.openAddMeal('text');sb.manualAddMeal();sb.setInvMode(true);
  // Ce que produit le parseur IA : quantite en GRAMMES meme si l'article est en pieces
  sb.__setSugg([{id:'i3',name:'Ramen',qty:200,unit:'g',baseQty:200,
                 m:{kcal:900,prot:18,gluc:120,lip:40}}]);
  sb.renderInvSuggestions(sb.__getSugg());
  hydrate('inv-items-section');
  sb.recalcAddMealMacros();
  // 200 g a 450 kcal/100g = 900. Sans garde-fou : 200*100=20000g -> 90000 kcal
  eq(Number(docEl('addmeal-kcal').value),900,'kcal');
});
t('suggestion IA 150g sur article en grammes',()=>{
  freshInv();sb.openAddMeal('text');sb.manualAddMeal();sb.setInvMode(true);
  sb.__setSugg([{id:'i1',name:'Poulet',qty:150,unit:'g',baseQty:150,m:{kcal:180,prot:34,gluc:0,lip:3}}]);
  sb.renderInvSuggestions(sb.__getSugg());hydrate('inv-items-section');sb.recalcAddMealMacros();
  eq(Number(docEl('addmeal-kcal').value),180,'kcal');
});
t('suggestion IA en pieces sur article macPiece',()=>{
  freshInv();sb.openAddMeal('text');sb.manualAddMeal();sb.setInvMode(true);
  sb.__setSugg([{id:'i2',name:'Oeufs',qty:2,unit:'pc',baseQty:2,m:{kcal:156,prot:13,gluc:1,lip:11}}]);
  sb.renderInvSuggestions(sb.__getSugg());hydrate('inv-items-section');sb.recalcAddMealMacros();
  eq(Number(docEl('addmeal-kcal').value),156,'kcal');
});

console.log('\n=== P. Deduction du stock a la validation ===');
function valider(sel){
  freshInv();sb.openAddMeal('text');invAddMeal();
  Object.keys(sel).forEach(k=>sb.invPickQty(k,sel[k]));
  sb.applyInvPick();hydrate('inv-items-section');
  docEl('addmeal-name').value='Test';
  sb.confirmAddMealFinal();
  return sb.findItem;
}
t('poulet : 500 - 200 = 300 g',()=>{valider({i1:200});eq(sb.findItem('i1').qty,300);});
t('oeufs : 6 - 2 = 4 pieces',()=>{valider({i2:2});eq(sb.findItem('i2').qty,4);});
t('*** ramen (pieces+emballage) : 200 - 3 = 197 ***',()=>{valider({i3:3});eq(sb.findItem('i3').qty,197);});
t('*** pain (pieceG) : 10 - 2 = 8 ***',()=>{valider({i8:2});eq(sb.findItem('i8').qty,8);});
t('pas de stock negatif',()=>{valider({i1:9999});eq(sb.findItem('i1').qty,0);});
t('le repas est bien enregistre au tracker',()=>{
  valider({i1:200});
  const d=sb.S.dayMeals[sb.S.today]||[];
  if(!d.length)throw new Error('aucun repas ajoute');
});

console.log('\n=== Q. Nettoyage du doublon ===');
t('le bloc Description/Photo a disparu',()=>{
  const fs=require('fs');const html=fs.readFileSync('index.html','utf8');
  const n=(html.match(/openAddMeal\('photo'\)/g)||[]).length;
  // il doit rester exactement 1 occurrence : celle du modal (bouton Photo interne)
  if(n>1)throw new Error(n+" occurrences de openAddMeal('photo') restantes");
});
t('le gros bouton d\'entree est conserve',()=>{
  const fs=require('fs');const html=fs.readFileSync('index.html','utf8');
  if(!html.includes('Ajouter un repas libre (texte ou photo)'))throw new Error('bouton principal perdu');
});

console.log('\n---- '+pass+' ok, '+fail+' KO ----');
