const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
const src=fs.readFileSync('index.html','utf8');
// Bloc du scanner uniquement
const iScan=src.indexOf('id="scan-overlay"');
const scan=src.slice(iScan,iScan+2200);

console.log('\n=== BR. Scanner : zones sures iOS ===');
t('*** l\'en-tete tient compte de l\'encoche ***',()=>{
  if(!/padding:calc\(16px \+ env\(safe-area-inset-top/.test(scan))
    throw new Error('padding haut sans safe-area');
});
t('le titre et le bouton Fermer sont dans cet en-tete',()=>{
  const i=scan.indexOf('safe-area-inset-top');
  const bloc=scan.slice(i,i+420);
  if(!bloc.includes('Scanner un produit'))throw new Error('titre hors zone protegee');
  if(!bloc.includes('stopScanner()'))throw new Error('bouton Fermer hors zone protegee');
});
t('les cotes sont proteges aussi (mode paysage)',()=>{
  if(!/safe-area-inset-left/.test(scan)||!/safe-area-inset-right/.test(scan))
    throw new Error('cotes non proteges');
});
t('*** le champ code-barres remonte au-dessus de la barre home ***',()=>{
  if(!/bottom:calc\(32px \+ env\(safe-area-inset-bottom/.test(scan))
    throw new Error('bas sans safe-area');
});
t('le message de statut remonte aussi',()=>{
  if(!/bottom:calc\(118px \+ env\(safe-area-inset-bottom/.test(scan))
    throw new Error('statut sans safe-area');
});
t('le degrade de l\'en-tete reste lisible',()=>{
  const i=scan.indexOf('safe-area-inset-top');
  if(!/linear-gradient\(rgba\(0,0,0,\.85\)/.test(scan))
    throw new Error('degrade non renforce');
});

console.log('\n=== BS. Barre de navigation : stabilite au defilement ===');
const iB=src.indexOf('.bnav { position: fixed');
const bnav=src.slice(iB,iB+700);
t('*** une couche de composition dediee est forcee ***',()=>{
  if(!/transform: translateZ\(0\)/.test(bnav))throw new Error('translateZ absent');
  if(!/-webkit-transform: translateZ\(0\)/.test(bnav))throw new Error('prefixe webkit absent');
});
t('will-change et backface sont poses',()=>{
  if(!/will-change: transform/.test(bnav))throw new Error('will-change absent');
  if(!/backface-visibility: hidden/.test(bnav))throw new Error('backface absent');
});
t('la barre garde son flou et sa position',()=>{
  if(!/backdrop-filter: blur\(18px\)/.test(bnav))throw new Error('flou perdu');
  if(!/position: fixed/.test(bnav))throw new Error('position perdue');
  if(!/bottom: 0/.test(bnav))throw new Error('ancrage perdu');
});
t('la marge basse pour la barre home est conservee',()=>{
  if(!/env\(safe-area-inset-bottom/.test(bnav))throw new Error('safe-area basse perdue');
});
t('le contenu garde sa reserve sous la barre',()=>{
  if(!/\.container \{ padding-bottom: calc\(96px \+ env\(safe-area-inset-bottom/.test(src))
    throw new Error('reserve du container perdue');
});

console.log('\n=== BT. Non-regression des autres zones sures ===');
t('viewport-fit=cover toujours declare',()=>{
  if(!/viewport-fit=cover/.test(src))throw new Error('absent');
});
t('l\'en-tete collant garde sa marge haute',()=>{
  if(!/padding: calc\(12px \+ env\(safe-area-inset-top, 0px\)\)/.test(src))
    throw new Error('en-tete collant modifie');
});
t('le toast du coach reste au-dessus de la barre',()=>{
  if(!/bottom: calc\(96px \+ env\(safe-area-inset-bottom/.test(src))
    throw new Error('toast modifie');
});
t('overscroll-behavior-y conserve sur le body',()=>{
  if(!/overscroll-behavior-y: contain/.test(src))throw new Error('perdu');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');

console.log('\n=== BU. Cadre de visee du scanner ===');
t('*** le scanner est exclu de l\'animation des modales ***',()=>{
  if(!/div\[id\$="-overlay"\]:not\(#scan-overlay\) > div \{ animation: modalIn/.test(src))
    throw new Error('exclusion absente : le transform du cadre serait ecrase');
});
t('l\'exclusion vaut aussi en mouvement reduit',()=>{
  const i=src.indexOf('prefers-reduced-motion');
  const bloc=src.slice(i,i+400);
  if(!/:not\(#scan-overlay\) > div \{ animation: none/.test(bloc))
    throw new Error('non exclu en mouvement reduit');
});
t('le cadre garde son centrage inline',()=>{
  const i=src.indexOf('id="scan-overlay"');
  const s=src.slice(i,i+2400);
  if(!/transform:translate\(-50%,-50%\)/.test(s))throw new Error('centrage perdu');
});
t('les vraies modales gardent leur animation',()=>{
  if(!/animation: modalIn \.68s/.test(src))throw new Error('animation supprimee');
  ['invpick-overlay','set-overlay','addmeal-overlay','cc-overlay'].forEach(function(id){
    if(!src.includes('id="'+id+'"'))throw new Error(id+' introuvable');
  });
});
t('pas de flou d\'arriere-plan sur le flux camera',()=>{
  if(!/#scan-overlay \{ -webkit-backdrop-filter: none; backdrop-filter: none; \}/.test(src))
    throw new Error('flou non neutralise');
});
t('un seul overlay porte l\'exception',()=>{
  const n=(src.match(/:not\(#scan-overlay\)/g)||[]).length;
  if(n!==2)throw new Error(n+' exclusions au lieu de 2');
});
console.log('\n---- total '+pass+' ok, '+fail+' KO ----');
