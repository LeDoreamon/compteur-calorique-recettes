// Selecteur « Qu'as-tu utilise ? » en onglets, comme l'inventaire (28/10/2026, valide par Liam)
const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const S=sb.S;
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
const liste=()=>docEl('invpick-list').innerHTML,onglets=()=>docEl('invpick-tabs').innerHTML,choix=()=>docEl('invpick-choix').innerHTML;
const prepa=(pre)=>{
  Object.keys(LS).forEach(k=>delete LS[k]);
  S.inv={frigo:[{id:'poulet',name:'Poulet',qty:500,unit:'g',mac100:{kcal:120,prot:23,gluc:0,lip:2}},
      {id:'oeufs',name:'Œufs',qty:6,unit:'pcs',pieceG:55,macPiece:{kcal:78,prot:6.5,gluc:0.6,lip:5.3}},
      {id:'beurre',name:'Beurre',qty:0,unit:'g',mac100:{kcal:740,prot:1,gluc:1,lip:82}},
      {id:'lait',name:'Lait',qty:null,unit:'ml',mac100:{kcal:46,prot:3.3,gluc:4.8,lip:1.5}},
      {id:'chili',name:'Chili maison',qty:2,unit:'parts',plat:{creeLe:'2026-10-27',parts:3,poidsEstime:900,ings:[]},macPiece:{kcal:520,prot:40,gluc:45,lip:15},pieceG:300}],
    placards:[{id:'riz',name:'Riz',qty:1000,unit:'g',mac100:{kcal:350,prot:7,gluc:78,lip:1}},{id:'huile',name:'Huile d\'olive',qty:0.5,unit:'L',mac100:{kcal:900,prot:0,gluc:0,lip:100}}],
    congelateur:[],epices:[{id:'sel',name:'Sel',qty:null,unit:'g'}]};
  X('_addMealInvSuggestions='+JSON.stringify(pre||[]));
  (pre||[]).forEach((s,i)=>{docEl('inv-cb-'+i).checked=true;docEl('inv-qty-'+i).value=String(s.qty);});   /* cases de l'IA cochees */
  docEl('invpick-search').value='';
  X('openInvPick()');
};
const ordre=h=>(h.match(/id="pick-row-([a-z_]+)"/g)||[]).map(s=>s.slice(13,-1));

console.log('\n=== LXXV. Selecteur « Qu\'as-tu utilise ? » en onglets ===');
t('*** quatre onglets, une categorie a la fois, Frigo par defaut ***',()=>{
  prepa();eq((onglets().match(/onclick="choisirOngletPick\('/g)||[]).length,4,'onglets');
  if(!/class="inv-onglet on"[^>]*>(?:(?!<\/button>)[^])*Frigo/.test(onglets()))throw new Error('Frigo pas actif');
  if(/pick-row-riz/.test(liste()))throw new Error('Placards melanges au Frigo');
  X("choisirOngletPick('placards')");eq(ordre(liste()).join(','),'huile,riz','Placards');
  X("choisirOngletPick('congelateur')");if(!/Rien en stock ici/.test(liste()))throw new Error('onglet vide');
});
t('nombre par onglet : articles proposables (plats compris, epuises non choisis exclus)',()=>{
  prepa();const n=c=>(onglets().match(new RegExp("choisirOngletPick\\('"+c+"'\\)[^]*?<span class=\"io-n\">(\\d+)</span>"))||[])[1];
  eq(n('frigo'),4,'poulet, oeufs, lait, chili (pas le beurre a 0)');eq(n('placards'),2);eq(n('congelateur'),0);eq(n('epices'),1);
});
t('*** plats maison en tete de leur categorie, puis ordre alphabetique ***',()=>{
  prepa();eq(ordre(liste()).join(','),'chili,lait,oeufs,poulet');
});
t('*** ouverture sur l\'onglet ou l\'IA a deja coche, sinon le dernier utilise ***',()=>{
  prepa([{id:'riz',name:'Riz',qty:80,unit:'g'}]);if(!/pick-row-riz/.test(liste()))throw new Error('pas sur Placards');
  prepa();X("choisirOngletPick('epices')");eq(LS.dz_pick_onglet,'epices','retenu');
  X('_addMealInvSuggestions=[]');X('openInvPick()');if(!/pick-row-sel/.test(liste()))throw new Error('dernier onglet non repris');
});
t('*** pastille verte : nombre d\'articles choisis par onglet, mise a jour a la saisie sans redessiner la liste ***',()=>{
  prepa();const avant=liste();
  X("invPickQty('poulet','150')");X("invPickQty('oeufs','2')");
  if(liste()!==avant)throw new Error('liste redessinee (le clavier se fermerait)');
  if(!/choisirOngletPick\('frigo'\)[^>]*><span class="io-al io-sel"[^>]*>2</.test(onglets()))throw new Error('pastille Frigo '+onglets());
  if(/choisirOngletPick\('placards'\)[^>]*><span class="io-al/.test(onglets()))throw new Error('pastille sur Placards');
  X("invPickQty('poulet','0')");if(!/io-sel[^>]*>1</.test(onglets()))throw new Error('pastille non mise a jour');
});
t('*** « Dans ton repas » : ce qui est choisi dans tous les onglets, un toucher ouvre son onglet ***',()=>{
  prepa();eq(choix(),'','rien de choisi : pas de ligne');
  X("invPickQty('poulet','150')");X("choisirOngletPick('placards')");X("invPickQty('huile','0.5')");X("invPickQtyPlat('chili','1')");
  const c=choix();if(!/Dans ton repas/.test(c))throw new Error('titre');
  ['Poulet<b>150 g</b>','Huile d’olive<b>0,5 L</b>','Chili maison<b>1 part</b>'].forEach(x=>{if(c.replace("'",'’').indexOf(x)<0&&c.indexOf(x.replace('’',"'"))<0)throw new Error('puce '+x+' : '+c);});
  if(!/pick-row-huile/.test(liste()))throw new Error('on reste sur Placards');
  docEl('invpick-search').value='riz';X("allerArticlePick('poulet')");
  eq(docEl('invpick-search').value,'','recherche videe');if(!/pick-row-poulet/.test(liste()))throw new Error('onglet Frigo non ouvert');
});
t('*** la recherche couvre tout l\'inventaire, groupee par categorie, sans onglets ***',()=>{
  prepa();docEl('invpick-search').value='i';X('renderInvPick()');
  eq(onglets(),'','onglets masques');const h=liste();
  if(!/class="pick-grp"[^>]*>[^]*Frigo/.test(h)||!/pick-grp[^>]*>[^]*Placards/.test(h))throw new Error('groupes');
  eq(ordre(h).join(','),'chili,lait,huile,riz','resultats (plat en tete du Frigo)');
});
t('lignes choisies surlignees ; au-dela du stock : en rouge',()=>{
  prepa([{id:'poulet',name:'Poulet',qty:800,unit:'g'}]);const h=liste();
  if(!/id="pick-row-poulet" class="pick-row on trop"/.test(h))throw new Error(h.slice(0,300));
  if(!/id="pick-row-oeufs" class="pick-row"/.test(h))throw new Error('non choisi surligne');
  if(!/id="pick-row-chili" class="pick-row plat"/.test(h))throw new Error('plat');
});
t('epuise : masque, sauf s\'il est deja choisi',()=>{
  prepa();if(/pick-row-beurre/.test(liste()))throw new Error('beurre a 0 visible');
  prepa([{id:'beurre',name:'Beurre',qty:10,unit:'g'}]);if(!/pick-row-beurre/.test(liste()))throw new Error('beurre choisi masque');
});
t('quantites a la francaise : « reste 900 g », virgule',()=>{
  prepa();X("choisirOngletPick('placards')");const h=liste();
  if(h.indexOf('reste 0,5 L')<0||h.indexOf('reste 1000 g')<0)throw new Error(h);
  X("choisirOngletPick('frigo')");if(liste().indexOf('reste ∞')<0||liste().indexOf('reste 2 parts')<0)throw new Error('illimite / parts');
});
t('hauteur fixe : les onglets ne bougent pas quand on passe d\'un onglet long a un court',()=>{
  const src=require('fs').readFileSync('index.html','utf8');const m=src.match(/<div id="invpick-overlay"[^>]*>\s*<div style="([^"]*)"/);
  if(!m||!/(^|;)height:86vh/.test(m[1]))throw new Error('hauteur suivant le contenu');
});
t('« Ajouter au repas » reprend ce qui est choisi dans tous les onglets',()=>{
  prepa();X("invPickQty('poulet','150')");X("choisirOngletPick('placards')");X("invPickQty('riz','80')");X('applyInvPick()');
  eq(X("_addMealInvSuggestions.map(function(s){return s.id+':'+s.qty;}).sort().join(',')"),'poulet:150,riz:80');
});

console.log('---- '+pass+' ok, '+fail+' KO');
