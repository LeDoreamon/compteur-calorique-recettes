const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const INV=require('./data/inv.json');const fr=[];
Object.values(INV).forEach(it=>{const o={id:it.id,name:it.n,unit:it.u,qty:(it.q===-1?null:it.q),mac100:it.m?{kcal:it.m[0],prot:it.m[1],gluc:it.m[2],lip:it.m[3]}:null};if(it.piece)o.macPiece={kcal:it.piece[0],prot:it.piece[1],gluc:it.piece[2],lip:it.piece[3]};if(it.pieceG)o.pieceG=it.pieceG;fr.push(o);});
const remettre=()=>{sb.S.inv={frigo:fr.map(o=>Object.assign({},o)),placards:[],congelateur:[],epices:[]};};remettre();
const R=id=>sb.RCP.find(r=>r.id===id);
const etapes=r=>{const g=X('_ingRecette')(r);return (r.steps||[]).map(s=>X('_etapeSurlignee')(g,s));};
const lisible=h=>h.replace(/<mark class="ing-hl">/g,'[').replace(/<\/mark>/g,']');
const N=s=>X('_ingNorm')(s).n.replace(/[^a-z0-9]+/g,' ').trim();
console.log('\n=== LI. Ingredients surlignes dans les etapes ===');
t('*** catalogue : chaque ingredient est surligne au moins une fois ***',()=>{
  const manque=[];
  sb.RCP.filter(r=>r.profile==='liam'&&r.slots&&r.slots.length).forEach(r=>{
    const g=X('_ingRecette')(r),html=etapes(r).join(' ');
    const marks=[...html.matchAll(/<mark class="ing-hl">([^<]*)<\/mark>/g)].map(m=>N(m[1]));
    g.forEach(x=>{if(!marks.some(m=>m===N(x.nom)||x.morceaux.some(k=>m.indexOf(k)===0)))manque.push(r.id+' : '+x.nom);});
  });
  if(manque.length)throw new Error(manque.join(' | '));
});
t('*** le nom exact de la fiche remplace la mention ***',()=>{
  const e=etapes(R('liam_v6_omelette_jambon')).map(lisible);
  eq(e[0],"Poêler 75 g d'[allumettes de jambon] avec 50 g d'[oignons émincés], 4 min.");
  eq(e[2],"À mi-cuisson, déposer 40 g de [St Morêt léger] au centre.");
});
t('*** aucun reste du texte d\'origine apres le nom (huile d\'olive, flocons d\'avoine, pates 21 g) ***',()=>{
  const tout=['liam_v6_mozza_tomates','liam_v6_avoine_fraises','liam_v6_boulettes_puree','liam_v6_poulet_pane_maison'].map(id=>etapes(R(id)).map(lisible).join(' | ')).join(' || ');
  ["] d'olive","] d'avoine","] g de protéines","sauce [Honey","]-"].forEach(x=>{if(tout.indexOf(x)>=0)throw new Error('reste : '+x+' dans '+tout);});
});
t('*** « riz » va au riz, pas au vinaigre de riz ***',()=>{
  const e=etapes(R('liam_v8_poulet_chili_doux')).map(lisible).join(' | ');
  if(e.indexOf('[Riz Oiseaux Célestes]')<0||e.indexOf('[vinaigre de riz]')<0)throw new Error(e);
});
t('mention au singulier : le mot du texte reste (1 œuf), surligne',()=>{const e=lisible(etapes(R('liam_v6_ramen_poulet'))[1]);if(e.indexOf('Pocher 1 [œuf]')<0)throw new Error(e);});
t('nom propre : majuscules gardees ; nom commun : minuscule en milieu de phrase',()=>{
  const e=etapes(R('liam_v8_pates_poulet_parmesan')).map(lisible).join(' | ');
  if(e.indexOf('[Parmigiano Reggiano]')<0||e.indexOf('de [pâtes complètes]')<0)throw new Error(e);
});
t('*** le nom suit l\'inventaire : article renomme = nouveau nom dans les etapes ***',()=>{
  const it=sb.S.inv.frigo.find(o=>o.id==='cx_ms8y6yk4');it.name='Saumon frais Label Rouge';
  try{const e=etapes(R('liam_v6_saumon_riz')).map(lisible).join(' | ');if(e.indexOf('[Saumon frais Label Rouge]')<0)throw new Error(e);}finally{remettre();}
});
t('*** recette perso : mentions surlignees aussi ***',()=>{
  const r={id:'cust_x',custom:true,steps:['Poêler le saumon 4 min.','Ajouter le St Morêt et les tomates cerises crues.'],used:[{id:'cx_ms8y6yk4',n:'Saumon',qty:120},{id:'cx_ms8yjwau',n:'St Morêt léger',qty:30},{id:'cx_ms8z08jd',n:'Tomates cerises',qty:100}]};
  const e=etapes(r).map(lisible).join(' | ');
  eq(e,'Poêler le [saumon] 4 min. | Ajouter le [St Morêt léger] et les [tomates cerises] crues.');
});
t('*** affichage : les etapes de la carte depliee sont surlignees ***',()=>{
  X("S.openRec='liam_v6_omelette_jambon'");const h=X("renderCard(RCP.find(function(r){return r.id==='liam_v6_omelette_jambon'}))");X('S.openRec=null');
  if(h.indexOf('<mark class="ing-hl">St Morêt léger</mark>')<0)throw new Error('pas de surlignage');
});
t('*** editeur perso : toucher un ingredient insere son nom complet a l\'emplacement du curseur ***',()=>{
  X("openCustRec(null,{name:'Test',rows:[{id:'cx_ms8yjwau',name:'St Morêt léger',qty:30}]})");
  if(docEl('cr-inserer').innerHTML.indexOf('crInsererIng(0)')<0)throw new Error('pastilles absentes');
  const ta=docEl('cr-steps');ta.value='Tartiner le pain.';ta.selectionStart=ta.selectionEnd=9;   /* apres « Tartiner » */
  X('crInsererIng(0)');eq(ta.value,'Tartiner St Morêt léger le pain.');
  X('closeCustRec()');
});
t('sans ingredient : texte inchange',()=>{eq(X("_etapeSurlignee([],'Cuire 5 min.')"),'Cuire 5 min.');});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
