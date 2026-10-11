// Photos de recettes : jamais d'image cassee (11/10/2026, porridge et omelette sans image)
const {sb}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
console.log('\n=== LX. Photos de recettes : pas d\'image cassee ===');
t('*** liens Wikimedia en largeur standard (sinon Wikimedia les limite et l\'image casse) ***',()=>{
  const std=X('WM_LARGEURS');
  Object.values(X('LIENS_IMAGES')).forEach(u=>{const w=+(u.match(/width=(\d+)/)||[])[1];if(std.indexOf(w)<0)throw new Error('largeur non standard : '+u);});
  eq(X("_wm('a.jpg',333)").split('width=')[1],'500','largeur inconnue ramenee a 500');
  eq(X("_wm('a.jpg',960)").split('width=')[1],'960','largeur standard gardee');
});
t('*** chaque photo de recette affichee a un repli (onerror) : carte, recette depliee, accueil ***',()=>{
  const brutes=(src.match(/<img src="\$\{_?p[h]?\}"|<img src="'\+p\+'"/g)||[]);
  if(brutes.length)throw new Error(brutes.length+' image(s) de recette sans repli');
  eq((src.match(/_imgRecette\(/g)||[]).length,4,'appels (definition + 3 affichages)');
  if(!/onerror="_imgEchec\(this\)"/.test(X("_imgRecette('https://x/y.jpg','')")))throw new Error('pas de onerror');
});
t('*** un lien qui echoue est ecarte : la vignette dessinee prend la place ***',async()=>{
  X("LIENS_IMAGES['test_img']='https://commons.wikimedia.org/x.jpg';_liensCasses={};PHOTOS={};");
  eq(X("photoRecette('test_img')"),'https://commons.wikimedia.org/x.jpg','lien utilise d\'abord');
  let rendus=0;const r0=sb.render;X('var __r=render;render=function(){__r.__n=(__r.__n||0)+1;};');
  const img={style:{},getAttribute:()=> 'https://commons.wikimedia.org/x.jpg'};
  X('_imgEchec')(img);X('_imgEchec')(img);
  eq(img.style.visibility,'hidden','image masquee tout de suite');
  await new Promise(r=>setTimeout(r,120));
  rendus=X('__r.__n||0');X('render=__r;');
  eq(rendus,1,'un seul rendu');
  eq(X("photoRecette('test_img')"),'null','la vignette remplace le lien');
});
t('photo de l\'utilisateur illisible : masquee, sans rien ecarter ni boucler',async()=>{
  X("_liensCasses={};");
  const img={style:{},getAttribute:()=> 'data:image/jpeg;base64,AAAA'};
  X('_imgEchec')(img);
  eq(img.style.visibility,'hidden');eq(Object.keys(X('_liensCasses')).length,0);
});
t('message de fin de suppression du compte chaleureux',()=>{
  if(!/on espère te revoir bientôt/.test(src))throw new Error('absent');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
