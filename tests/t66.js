const {sb,docEl}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
console.log('\n=== XVI. Clarte des libelles (audit du 26/09) ===');
t('*** plus de jargon interne visible ***',()=>{
  const vis=src.replace(/\/\/[^\n]*/g,'').replace(/\/\*[\s\S]*?\*\//g,'');
  [/cimeti(è|\\u00e8)re/i,/salle d.attente/i,/P\/100kcal/,/TDEE estim/,/\(TDEE\)/,/Déficit\/j'/,/} urgents</,/Depuis dernière/,/🪦/].forEach(r=>{if(r.test(vis))throw new Error('encore present : '+r);});
});
t('le build n\'est plus dans l\'en-tete mais en bas des Reglages',()=>{
  const i=src.indexOf('<div class="apphead">'),b=src.slice(i,i+1500);if(/build 20/.test(b))throw new Error('build dans l\'en-tete');
  const s=src.indexOf('id="set-overlay"'),e=src.indexOf('<!-- Photo analysis modal -->');if(!/build 20\d\d/.test(src.slice(s,e)))throw new Error('build absent des Reglages');
});
t('*** un seul bloc de sauvegarde : dans les Reglages, plus dans le Bilan ***',()=>{
  if(/renderProgresHTML\(\)\+renderDataExport\(\)/.test(src))throw new Error('encore dans le Bilan');
  if(!/ex\.innerHTML=renderDataExport\(\)/.test(src))throw new Error('absent des Reglages');
  if(/📤 Export/.test(src))throw new Error('titre en double');
});
t('*** tendance : bleu en dessous comme le calendrier, gris pour une journee incomplete ***',()=>{
  X("TARGETS={kcal:2000,prot:150,gluc:200,lip:60};");
  const k=X('_kcalColor'),p=X('_protColor');
  eq(k(2000),'var(--green)');eq(k(2300),'var(--orange)');
  eq(k(1600),X('_COUL_DESSOUS'),'en dessous');eq(k(500),X('_COUL_GRIS'),'incomplete');eq(k(0),X('_COUL_GRIS'));
  eq(p(150),'var(--green)');eq(p(90),X('_COUL_DESSOUS'));eq(p(0),X('_COUL_GRIS'));
  if(!/bleu = en dessous/.test(src))throw new Error('legende');
});
t('*** modifier le profil affiche le seuil de pas reellement utilise ***',()=>{
  X("S.profil={prenom:'Liam',sexe:'H',naissance:'1995-01-01',taille:180,poids:84,objectif:'perte',activite:'2'};S.pasBase=9679;");
  const h=X('_secObjectif')(Object.assign({},X('S.profil'),{pas:X('pasBase()')}));
  if(!/value="9679"/.test(h))throw new Error('non prerempli');
  if(!/if\(!\(typeof p\.pas==='number'&&p\.pas>0\)&&pasBase\(\)>0\)p\.pas=pasBase\(\);/.test(src))throw new Error('regle absente');
  if(X("typeof S.profil.pas")!=='undefined')throw new Error('profil modifie a l\'ouverture');
});
t('nouveaux libelles presents',()=>{
  ['Déjà achetés','À ranger','Prot./100 kcal','cette semaine','Modifiable de J−7 à J+1','Dépense réelle estimée','Déficit/jour','à consommer</span>','Dernière pesée'].forEach(x=>{if(src.indexOf(x)<0)throw new Error(x+' absent');});
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
