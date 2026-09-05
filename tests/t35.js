const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const proches=G('articlesProches'),changer=G('changerArticleLigne');

function inv(){
  S.inv={frigo:[
    {id:'c1',name:'Compotes',qty:12,unit:'pc',macPiece:{kcal:51,prot:0.5,gluc:12,lip:0.5}},
    {id:'l1',name:'Lait sans lactose',qty:1000,unit:'ml',mac100:{kcal:46,prot:3.4,gluc:5,lip:1}},
    {id:'l2',name:'Lait chocolaté',qty:500,unit:'ml',mac100:{kcal:80,prot:3,gluc:12,lip:2}},
    {id:'p1',name:'Poulet',qty:500,unit:'g',mac100:{kcal:165,prot:31,gluc:0,lip:4}},
    {id:'v1',name:'Beurre',qty:0,unit:'g',mac100:{kcal:750,prot:1,gluc:1,lip:82}}
  ],placards:[
    {id:'c2',name:'Gourdes de compotes',qty:58,unit:'pcs',macPiece:{kcal:50,prot:0,gluc:12,lip:0}},
    {id:'b1',name:'Beurre de cacahuète',qty:300,unit:'g',mac100:{kcal:600,prot:25,gluc:12,lip:50}}
  ],congelateur:[],epices:[]};
}
inv();

console.log('\n=== EA. Detection des noms voisins ===');
t('*** compotes et gourdes de compotes se reconnaissent ***',()=>{
  const p=proches('c1').map(x=>x.id);
  if(p.indexOf('c2')<0)throw new Error('gourdes non detectees : '+p.join(','));
});
t('*** les deux laits se reconnaissent ***',()=>{
  eq(proches('l1').map(x=>x.id).join(','),'l2');
  eq(proches('l2').map(x=>x.id).join(','),'l1');
});
t('un article sans voisin n\'en trouve pas',()=>{
  eq(proches('p1').length,0,'Poulet ne devrait rien matcher');
});
t('*** un article epuise n\'est jamais propose ***',()=>{
  // Beurre est a 0 : il ne doit pas apparaitre comme voisin de « Beurre de cacahuète »
  if(proches('b1').some(x=>x.id==='v1'))throw new Error('article a zero propose');
});
t('les mots vides ne rapprochent pas',()=>{
  S.inv.frigo.push({id:'x1',name:'Yaourt nature',qty:4,unit:'pc',mac100:{kcal:60,prot:4,gluc:5,lip:2}});
  S.inv.frigo.push({id:'x2',name:'Fromage nature',qty:200,unit:'g',mac100:{kcal:100,prot:8,gluc:4,lip:6}});
  const p=proches('x1').map(x=>x.id);
  if(p.indexOf('x2')>=0)throw new Error('rapproches par « nature » seul');
  inv();
});
t('les mots courts ne comptent pas',()=>{
  S.inv.frigo.push({id:'y1',name:'The vert',qty:null,unit:'',mac100:{kcal:0,prot:0,gluc:0,lip:0}});
  S.inv.frigo.push({id:'y2',name:'Riz vert',qty:100,unit:'g',mac100:{kcal:350,prot:7,gluc:78,lip:1}});
  if(proches('y1').some(x=>x.id==='y2'))throw new Error('rapproches par « vert »');
  inv();
});
t('identifiant inconnu : aucune proposition',()=>eq(proches('fantome').length,0));

console.log('\n=== EB. Rendu de la ligne ambigue ===');
function poser(sugg){
  sb.openAddMeal('text');G('manualAddMeal')();G('setInvMode')(true);
  G('__setSugg')(sugg);
  sb.renderInvSuggestions(G('__getSugg')());
  return docEl('inv-items-section').innerHTML;
}
t('*** une ligne ambigue devient une liste de choix ***',()=>{
  const h=poser([{id:'c1',name:'Compotes',qty:1,baseQty:1,unit:'pc'}]);
  if(!/changerArticleLigne\(0,/.test(h))throw new Error('pas de liste de choix');
  if(!/Gourdes de compotes/.test(h))throw new Error('le voisin n\'est pas propose');
});
t('l\'article retenu est celui qui est selectionne',()=>{
  const h=poser([{id:'c1',name:'Compotes',qty:1,baseQty:1,unit:'pc'}]);
  if(!/value="c1" selected/.test(h))throw new Error('mauvaise selection');
});
t('*** une ligne sans ambiguite reste du texte simple ***',()=>{
  const h=poser([{id:'p1',name:'Poulet',qty:100,baseQty:100,unit:'g'}]);
  if(/changerArticleLigne/.test(h))throw new Error('liste affichee sans raison');
  if(!/>Poulet</.test(h))throw new Error('nom absent');
});
t('*** une ligne choisie a la main n\'est jamais remise en question ***',()=>{
  const h=poser([{id:'c1',name:'Compotes',qty:1,baseQty:1,unit:'pc',src:'pick'}]);
  if(/changerArticleLigne/.test(h))throw new Error('le choix manuel est conteste');
});
t('un avertissement resume le nombre de lignes concernees',()=>{
  const h=poser([{id:'c1',name:'Compotes',qty:1,baseQty:1,unit:'pc'},
                 {id:'l1',name:'Lait sans lactose',qty:200,baseQty:200,unit:'ml'}]);
  if(!/2 lignes correspondent/.test(h))throw new Error('avertissement absent ou mal accorde');
});
t('accord au singulier pour une seule ligne',()=>{
  const h=poser([{id:'c1',name:'Compotes',qty:1,baseQty:1,unit:'pc'}]);
  if(!/Une ligne correspond/.test(h))throw new Error('accord incorrect');
});
t('aucun avertissement sans ambiguite',()=>{
  const h=poser([{id:'p1',name:'Poulet',qty:100,baseQty:100,unit:'g'}]);
  if(/nom voisin/.test(h))throw new Error('avertissement affiche a tort');
});

console.log('\n=== EC. Choisir un autre article ===');
t('*** changer d\'article met la ligne a jour ***',()=>{
  poser([{id:'c1',name:'Compotes',qty:2,baseQty:2,unit:'pc'}]);
  changer(0,'c2');
  const s=G('__getSugg')()[0];
  eq(s.id,'c2');eq(s.name,'Gourdes de compotes');
});
t('*** les macros suivent le nouvel article ***',()=>{
  poser([{id:'l1',name:'Lait sans lactose',qty:200,baseQty:200,unit:'ml'}]);
  const h=docEl('inv-items-section').innerHTML;
  if(!/92 kcal/.test(h))throw new Error('macros initiales : '+(h.match(/\d+ kcal/)||[]));
  changer(0,'l2');
  const h2=docEl('inv-items-section').innerHTML;
  if(!/160 kcal/.test(h2))throw new Error('macros non recalculees : '+(h2.match(/\d+ kcal/)||[]));
});
t('*** une fois tranchee, la ligne ne repose plus la question ***',()=>{
  poser([{id:'c1',name:'Compotes',qty:2,baseQty:2,unit:'pc'}]);
  changer(0,'c2');
  const h=docEl('inv-items-section').innerHTML;
  if(/changerArticleLigne/.test(h))throw new Error('la liste est encore proposee');
  if(/nom voisin/.test(h))throw new Error('avertissement toujours affiche');
});
t('l\'unite est reprise du nouvel article',()=>{
  poser([{id:'c1',name:'Compotes',qty:2,baseQty:2,unit:'pc'}]);
  changer(0,'c2');
  eq(G('__getSugg')()[0].unit,'pcs');
});
t('un identifiant invalide ne casse rien',()=>{
  poser([{id:'c1',name:'Compotes',qty:2,baseQty:2,unit:'pc'}]);
  changer(0,'inexistant');changer(0,'');changer(99,'c2');
  eq(G('__getSugg')()[0].id,'c1');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
