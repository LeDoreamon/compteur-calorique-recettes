// Ingredients a la couleur de leur rangement : pastilles de « Ce qu'il faut » et etapes surlignees (04/11/2026, idee de Liam)
const {sb,docEl}=require('./sb.js');
const vm=require('vm');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const S=sb.S;
const src=fs.readFileSync('index.html','utf8');
const prepa=()=>{
  S.inv={frigo:[{id:'poulet_t',name:'Aiguillettes de poulet',qty:500,unit:'g'},{id:'oeufs_t',name:'Oeufs',qty:6,unit:'pcs'}],
    congelateur:[{id:'fram_t',name:'Framboises surgelées',qty:300,unit:'g'}],
    placards:[{id:'riz_t',name:'Riz basmati',qty:1000,unit:'g'},{id:'soja_t',name:'Sauce soja sucrée',qty:200,unit:'ml'}],
    epices:[{id:'poivre_t',name:'Poivre',qty:null,unit:'g'}]};
};
const R={id:'t109_r',name:'Riz poulet',used:[{id:'riz_t',qty:80},{id:'poulet_t',qty:150},{id:'oeufs_t',qty:1},{id:'fram_t',qty:50},{id:'soja_t',qty:15},{id:'poivre_t',qty:1}],
  steps:['Cuire 80 g de riz basmati.','Saisir 150 g d\'aiguillettes de poulet, ajouter 1 œuf.','Servir avec 50 g de framboises surgelées, 15 ml de sauce soja sucrée et 1 g de poivre.']};
const etapes=r=>{sb.__r=r;return X('(function(){var g=_ingRecette(__r);return __r.steps.map(function(s){return _etapeSurlignee(g,s,__r.custom===true);});})()');};
const classe=(h,mot)=>{const m=h.match(new RegExp('<mark class="([^"]+)">[^<]*'+mot));return m?m[1]:null;};

console.log('\n=== LXXXII. Ingredients a la couleur de leur rangement ===');
t('*** rangement d\'un article : frigo, congelateur, placards, epices ; hors inventaire : rien ***',()=>{
  prepa();
  eq(X("_catIngredient(findItem('poulet_t'))"),'frigo');eq(X("_catIngredient(findItem('fram_t'))"),'congelateur');
  eq(X("_catIngredient(findItem('riz_t'))"),'placards');eq(X("_catIngredient(findItem('poivre_t'))"),'epices');
  eq(X("_catIngredient(null)"),null);eq(X("_catIngredient({id:'x',name:'Copie'})"),null,'objet hors inventaire');
});
t('*** etapes : chaque ingredient surligne a la couleur de son rangement ***',()=>{
  prepa();const e=etapes(R).join(' | ');
  eq(classe(e,'riz basmati'),'ing-hl ing-placards');eq(classe(e,'aiguillettes'),'ing-hl ing-frigo');eq(classe(e,'œuf'),'ing-hl ing-frigo');
  eq(classe(e,'framboises'),'ing-hl ing-congelateur');eq(classe(e,'sauce soja'),'ing-hl ing-placards');eq(classe(e,'poivre'),'ing-hl ing-epices');
});
t('ingredient retire de l\'inventaire : surligne en neutre (pas de rangement)',()=>{
  prepa();S.inv.congelateur=[];const e=etapes(Object.assign({},R,{used:R.used.map(u=>u.id==='fram_t'?{id:'fram_t',n:'Framboises surgelées',qty:50}:u)})).join(' | ');
  eq(classe(e,'framboises surgelées'),'ing-hl');
});
t('*** recette perso (crochets) : meme couleur ; passage entre crochets hors de la liste : neutre ***',()=>{
  prepa();const e=etapes({custom:true,used:[{id:'soja_t',qty:15}],steps:['Napper de [sauce soja] et d\'un peu de [sel].']})[0];
  eq(classe(e,'sauce soja'),'ing-hl ing-placards');eq(classe(e,'sel'),'ing-hl');
});
t('*** « Ce qu\'il faut » : pastilles a la couleur du rangement ***',()=>{
  prepa();sb.__r=R;const h=X('renderIngredients(__r)');
  ['<span class="ing-puce ing-placards">80g · Riz basmati</span>','<span class="ing-puce ing-frigo">150g · Aiguillettes de poulet</span>',
   '<span class="ing-puce ing-congelateur">50g · Framboises surgelées</span>','<span class="ing-puce ing-epices">1g · Poivre</span>'].forEach(x=>{if(h.indexOf(x)<0)throw new Error(x+' : '+h.slice(0,600));});
});
t('*** manquant (rouge ⚠) et interchangeable (🔄) gardent leur style ***',()=>{
  prepa();S.inv.frigo[0].qty=100;S.inv.frigo[1].name='Oeufs';
  sb.__r=Object.assign({},R,{used:[{id:'poulet_t',qty:150},{id:'riz_t',qty:80,flex:true},{id:'absent_t',n:'Truffe',qty:5}]});const h=X('renderIngredients(__r)');
  if(!/color:var\(--red\)[^>]*>150g · Aiguillettes de poulet ⚠/.test(h))throw new Error('stock insuffisant');
  if(!/color:var\(--orange\)[^>]*>🔄 80g · Riz basmati/.test(h))throw new Error('interchangeable');
  if(!/>5 · Truffe ⚠/.test(h))throw new Error('absent');
  if(/ing-puce/.test(h))throw new Error('couleur de rangement sur une pastille rouge ou orange');
});
t('pastille : article recree sous le meme nom retrouve par son nom, comme les etapes et « cuisinable »',()=>{
  prepa();S.inv.placards[0].id='riz_nouveau';sb.__r={id:'x',used:[{id:'riz_t',n:'Riz basmati',qty:80}],steps:[]};
  const h=X('renderIngredients(__r)');if(h.indexOf('<span class="ing-puce ing-placards">80g · Riz basmati</span>')<0)throw new Error('signale manquant a tort : '+h);
});
t('*** legende : seulement les rangements presents, dans l\'ordre de l\'inventaire ***',()=>{
  prepa();sb.__r=R;let h=X('renderIngredients(__r)');
  const lib=s=>((s.match(/<div class="ing-legende"[^>]*>(.*?)<\/div>/)||[])[1]||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  eq(lib(h),'Frigo Congél. Placards Épices');
  if(!/<i class="ing-pt" style="background:var\(--blue\);"><\/i>Frigo/.test(h))throw new Error('pastille de couleur');
  sb.__r={id:'y',used:[{id:'riz_t',qty:80},{id:'soja_t',qty:15}],steps:[]};h=X('renderIngredients(__r)');eq(lib(h),'Placards');
  sb.__r={id:'z',used:[{id:'absent_t',n:'Truffe',qty:5}],steps:[]};h=X('renderIngredients(__r)');if(/ing-legende/.test(h))throw new Error('legende sans rangement');
});
t('*** couleurs lisibles : texte sur son fond teinte >= 4,5:1, et quatre teintes distinctes ***',()=>{
  const rgb=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16));
  const L=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]);};
  const bg2=rgb('#17110D'),vus=[];
  ['frigo','congelateur','placards','epices'].forEach(c=>{
    const m=src.match(new RegExp('\\.ing-'+c+' \\{ background: rgba\\((\\d+),(\\d+),(\\d+),([.\\d]+)\\); color: (#[0-9A-Fa-f]{6}); \\}'));if(!m)throw new Error('style '+c);
    const a=+m[4],fond=[+m[1],+m[2],+m[3]].map((v,i)=>v*a+bg2[i]*(1-a)),tx=rgb(m[5]);
    const r=(Math.max(L(tx),L(fond))+0.05)/(Math.min(L(tx),L(fond))+0.05);if(r<4.5)throw new Error(c+' : '+r.toFixed(2));
    if(vus.indexOf(m[5].toUpperCase())>=0)throw new Error('couleur en double');vus.push(m[5].toUpperCase());
  });
});
t('editeur de recette perso : les ingredients a inserer gardent la couleur de leur rangement',()=>{
  if(!/onclick="crInsererIng\('\+i\+'\)" class="'\+_clsIng\(_catIngredient\(findItem\(g\.id\)\)\)\+'"/.test(src))throw new Error('editeur');
});

console.log('---- '+pass+' ok, '+fail+' KO');
