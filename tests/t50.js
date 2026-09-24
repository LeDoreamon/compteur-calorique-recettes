const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const R=id=>sb.RCP.find(r=>r.id===id);
const C=id=>G('_composition')(R(id));
const ILL=r=>G('illustrationRecette')(r);

console.log('\n=== HA. Lecture des recettes ===');
t('*** avoine & fromage blanc : bol blanc, avoine et fraises ***',()=>{
  const c=C('liam_v6_avoine_fraises');eq(c.contenant,'bol');eq(c.fond,'blanc');
  if(c.garn.indexOf('avoine')<0||c.garn.indexOf('fraises')<0)throw new Error(c.garn);
});
t('porridge cacao : bol au fond cacao',()=>{const c=C('liam_v6_porridge_whey');eq(c.contenant+'/'+c.fond,'bol/cacao');});
t('*** Banania : une tasse, pas un shaker malgre la whey ***',()=>eq(C('liam_v6_bol_banania').contenant,'tasse'));
t('*** shaker : un shaker ***',()=>eq(C('liam_v6_shaker_whey').contenant,'shaker'));
t('soupe : bol de soupe',()=>{const c=C('liam_v6_soupe_potiron');eq(c.contenant+'/'+c.fond,'bol/soupe');});
t('*** ramen : bouillon, nouilles, poulet et oeuf ***',()=>{
  const c=C('liam_v6_ramen_poulet');eq(c.contenant+'/'+c.fond+'/'+c.base,'bol/ramen/nouilles');eq(c.prot.join(','),'poulet,oeuf');
});
t('*** un bouillon de poulet ne compte pas comme du poulet ***',()=>{
  const c=G('_composition')({name:'Soupe maison',used:[{n:'Bouillon poulet'},{n:'Carottes'}]});
  if(c.prot.indexOf('poulet')>=0)throw new Error('poulet vu dans le bouillon');
});
t('*** pates au thon : sauce tomate, pas de tomates cerises ***',()=>{
  const c=C('liam_v6_thon_pates');
  if(c.sauces.indexOf('sauce_tomate')<0)throw new Error('sauce absente');
  if(c.garn.indexOf('tomates')>=0)throw new Error('tomates cerises inventees');
});
t('*** poulet pane maison : pane seul, ni oeuf ni poulet en double ***',()=>{
  const c=C('liam_v6_poulet_pane_maison');eq(c.prot.join(','),'pane');eq(c.base,'frites');
});
t('karaage : karaage, pas des aiguillettes',()=>eq(C('liam_v6_karaage_riz').prot.join(','),'karaage'));
t('bolognaise : nappe sur pates completes',()=>{const c=C('liam_v6_bolo_completes');eq(c.base+'/'+c.nappe,'pates_completes/bolo');});
t('chili : nappe chili sur riz',()=>{const c=C('liam_v6_chili_riz');eq(c.base+'/'+c.nappe,'riz/chili');});
t('boulettes : creme en nappe',()=>{const c=C('liam_v6_boulettes_puree');eq(c.prot.join(','),'boulettes');if(c.sauces.indexOf('creme')<0)throw new Error(c.sauces);});
t('omelette : omelette, des de jambon, cancoillotte',()=>{
  const c=C('liam_v6_omelette_jambon');eq(c.prot.join(','),'omelette,jambon_des');if(c.sauces.indexOf('cancoillotte')<0)throw new Error(c.sauces);
});
t('steak ratatouille : lentilles, steak, ratatouille',()=>{const c=C('liam_v6_steak_ratatouille');eq(c.base+'/'+c.prot+'/'+c.garn,'lentilles/steak/ratatouille');});
t('l\'oignon ne s\'ajoute que s\'il n\'y a pas d\'autre garniture',()=>{
  if(C('liam_v6_saumon_riz').garn.indexOf('oignons')>=0)throw new Error('oignon en trop');
});
t('au plus 2 proteines et 3 garnitures',()=>{
  sb.RCP.forEach(r=>{const c=G('_composition')(r);if(c.prot.length>2||c.garn.length>3)throw new Error(r.id);});
});
t('le nom seul suffit (recette IA sans ingredients)',()=>{
  const c=G('_composition')({name:'Saumon grillé, riz & concombre',ai:true});
  eq(c.base+'/'+c.prot+'/'+c.garn,'riz/saumon/concombre');
});

console.log('\n=== HB. Le dessin ===');
t('*** chaque recette du catalogue a un SVG propre ***',()=>{
  sb.RCP.forEach(r=>{
    const s=ILL(r);
    if(!/^<svg viewBox="0 0 100 100"[^>]*>/.test(s)||!/<\/svg>$/.test(s))throw new Error(r.id+' enveloppe');
    if(/NaN|undefined|Infinity/.test(s))throw new Error(r.id+' valeur invalide');
    const o=(s.match(/<g[ >]/g)||[]).length,f=(s.match(/<\/g>/g)||[]).length;
    if(o!==f)throw new Error(r.id+' groupes '+o+'/'+f);
    if(s.length>14000)throw new Error(r.id+' trop lourd '+s.length);
  });
});
t('*** stable : meme recette, meme dessin ***',()=>{
  const r=R('liam_v6_saumon_riz');const a=ILL(r);
  G('_illuCache');for(const k in sb._illuCache)delete sb._illuCache[k];
  eq(ILL(r)===a,true,'dessin change apres vidage du cache');
});
t('deux recettes differentes, deux dessins differents',()=>{
  if(ILL(R('liam_v6_saumon_riz'))===ILL(R('liam_v6_steak_frites')))throw new Error('identiques');
});
t('*** aucun texte saisi n\'entre dans le SVG ***',()=>{
  const r={id:'x"><script>',name:'zzqq<img src=x onerror=alert(1)> poulet riz',used:[{n:'"><svg onload=alert(2)>'},null,{n:'tomates cerises'}]};
  const s=ILL(r);
  if(/zzqq|onerror|onload|alert|script|img/.test(s))throw new Error('texte injecte');
  if(!/<svg/.test(s))throw new Error('pas de dessin');
});
t('entrees vides ou abimees : pas de plantage',()=>{
  [{},{name:''},{name:null,used:null},{used:[{},{n:5}]},undefined].forEach(r=>{
    const s=ILL(r);if(!/<svg/.test(s)||/NaN|undefined/.test(s))throw new Error(JSON.stringify(r));
  });
});
t('recette inconnue : assiette neutre',()=>{
  const c=G('_composition')({name:'Truc bidule'});eq(c.contenant,'assiette');
});

console.log('\n=== HC. Dans l\'interface ===');
t('*** carte sans photo : illustration dans la vignette ***',()=>{
  sb.window.PHOTOS={};
  const h=G('renderCard')(R('liam_v6_saumon_riz'));
  if(h.indexOf('<svg viewBox="0 0 100 100"')<0)throw new Error('pas d\'illustration');
});
t('*** une photo passe toujours devant l\'illustration ***',()=>{
  const r=R('liam_v6_saumon_riz');
  sb.window.PHOTOS={[r.id]:'data:image/jpeg;base64,AAA'};
  sb.PHOTOS=sb.window.PHOTOS;
  const s0=S.openRec;S.openRec=null;
  const h=G('renderCard')(r);
  S.openRec=s0;sb.window.PHOTOS={};sb.PHOTOS={};
  if(h.indexOf('data:image/jpeg;base64,AAA')<0)throw new Error('photo absente');
  if(h.indexOf('<svg viewBox="0 0 100 100"')>=0)throw new Error('illustration en plus de la photo');
});
t('grande image depliee sans photo : 128 px',()=>{
  const src=fs.readFileSync('index.html','utf8');
  if(src.indexOf("height:${p?'170px':'128px'}")<0)throw new Error('hauteur');
});
t('pas de collision avec les helpers existants',()=>{
  const src=fs.readFileSync('index.html','utf8');
  ['_nf','_rc','_ci','_el','_g','_blob','_semis','_trait','_dessin','_placer','_bol','_assiette','_shaker','_tasse'].forEach(n=>{
    const k=(src.match(new RegExp('function '+n+'\\(','g'))||[]).length;
    if(k!==1)throw new Error(n+' defini '+k+' fois');
  });
});


console.log('\n=== HD. Epice en double ===');
let p2=0,f2=0;
function t2(n,f){try{f();console.log('  ok  '+n);p2++;}catch(e){console.log('  KO  '+n+' -> '+e.message);f2++;}}
t2('*** une epice deja dans les ingredients n\'est pas reproposee en optionnel ***',()=>{
  const h=G('renderIngredients')(R('liam_v6_saumon_riz'));
  if(/opt\. · Ail en poudre/.test(h))throw new Error('ail en double');
  if(!/Ail en poudre/.test(h))throw new Error('ail disparu');
});
console.log('\n---- '+(pass+p2)+' ok, '+(fail+f2)+' KO');
