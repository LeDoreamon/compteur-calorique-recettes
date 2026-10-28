// Inventaire, mode Modifier : les articles a 0 en bas de leur categorie, grises (28/10/2026, idee de Liam)
const {sb}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const S=sb.S;
const prepa=()=>{
  S.inv={frigo:[{id:'beurre',name:'Beurre',qty:0,unit:'g'},{id:'skyr',name:'Skyr',qty:4,unit:'pcs'},{id:'ail',name:'Ail',qty:0,unit:'pcs'},
    {id:'oeufs',name:'Œufs',qty:6,unit:'pcs'},{id:'citron',name:'Citron',qty:null,unit:'pcs'},{id:'jambon',name:'Jambon',qty:0,unit:'tranches'}],
    placards:[{id:'riz',name:'Riz',qty:0,unit:'g'}],congelateur:[],epices:[]};
  S.invSearch='';X('S.editMode=true');
};
/* ordre des articles d'une categorie dans le HTML rendu */
const ordre=(h,cat)=>{const bloc=h.split('data-cat="'+cat+'"')[1]||'';return (bloc.split('</div></div>')[0].match(/openItemDetail\('[a-z]+','([a-z_]+)'\)/g)||[]).map(s=>s.match(/,'([a-z_]+)'\)/)[1]);};

console.log('\n=== LXXIV. Inventaire : articles epuises en bas en mode Modifier ===');
t('*** mode Modifier : les articles a 0 en bas de leur categorie, chaque groupe par ordre alphabetique ***',()=>{
  prepa();const h=X('renderInvCats()');
  eq(ordre(h,'frigo').join(','),'citron,oeufs,skyr,ail,beurre,jambon','frigo');
});
t('grises (opacite) mais toujours modifiables : champ quantite, date, ✕',()=>{
  prepa();const h=X('renderInvCats()');
  const rangee=(h.match(/<div class="irow inv-vide"[^]*?✕<\/button>/)||[''])[0];
  if(!/opacity:\.5/.test(rangee))throw new Error('pas grise');
  if(!/updateInvQty\('frigo','ail',this\.value\)/.test(rangee))throw new Error('quantite non modifiable');
  if(!/deleteInvItem\('frigo','ail'\)/.test(rangee))throw new Error('✕ absent');
  if(/inv-vide[^>]*>[^]*?openItemDetail\('frigo','skyr'\)/.test(h.split('Épuisés')[0]))throw new Error('un article en stock est grise');
});
t('un intitule « Épuisés » par categorie, juste avant le premier article a 0',()=>{
  prepa();const h=X('renderInvCats()');
  eq((h.match(/class="inv-vides"/g)||[]).length,2,'frigo et placards');
  const f=h.split('data-cat="frigo"')[1];if(f.indexOf('Épuisés')>f.indexOf("'frigo','ail'"))throw new Error('intitule apres le premier article vide');
  X("S.inv.frigo.forEach(function(i){if(!i.qty&&i.qty!==null)i.qty=1;})");if(/Épuisés/.test(X('renderInvCats()').split('data-cat="placards"')[0]))throw new Error('intitule sans article vide');
});
t('« présent » sans quantite (∞) n\'est jamais compte comme vide',()=>{
  prepa();eq(X("_invVideArt({qty:null})"),false);eq(X("_invVideArt({qty:0})"),true);eq(X("_invVideArt({qty:0.5})"),false);
});
t('*** une quantite repasse en positif : l\'article remonte tout de suite avec les autres (et l\'inverse) ***',()=>{
  prepa();let rendus=0;const vrai=X('render');sb.__r=()=>{rendus++;};X('render=__r');
  try{
    X("updateInvQty('frigo','beurre','250')");eq(rendus,1,'rendu apres 0 -> 250');
    eq(ordre(X('renderInvCats()'),'frigo').join(','),'beurre,citron,oeufs,skyr,ail,jambon','beurre remonte');
    X("updateInvQty('frigo','skyr','3')");eq(rendus,1,'pas de rendu si l\'article reste en stock (la saisie n\'est pas coupee)');
    X("updateInvQty('frigo','skyr','0')");eq(rendus,2,'rendu apres 3 -> 0');
    eq(ordre(X('renderInvCats()'),'frigo').join(','),'beurre,citron,oeufs,ail,jambon,skyr','skyr descend');
  }finally{sb.__v=vrai;X('render=__v');}
});
t('le bouton +1 (un paquet) d\'un article epuise le fait remonter aussi',()=>{
  prepa();X("S.inv.frigo[0].pkg={size:250}");X("stepInvPkg('frigo','beurre',1)");
  eq(S.inv.frigo[0].qty,250);eq(ordre(X('renderInvCats()'),'frigo').join(','),'beurre,citron,oeufs,skyr,ail,jambon');
});
t('hors mode Modifier : rien ne change (articles a 0 masques, pas d\'intitule)',()=>{
  prepa();X('S.editMode=false');S.openCat={frigo:1,congelateur:1,placards:1,epices:1};const h=X('renderInvCats()');
  eq(ordre(h,'frigo').join(','),'citron,oeufs,skyr');if(/Épuisés|inv-vide/.test(h))throw new Error('trace du mode Modifier');
});
t('la recherche garde le meme ordre',()=>{
  prepa();S.invSearch='r';const h=X('renderInvCats()');
  eq(ordre(h,'frigo').join(','),'citron,skyr,beurre','recherche « r »');S.invSearch='';
});

console.log('---- '+pass+' ok, '+fail+' KO');
