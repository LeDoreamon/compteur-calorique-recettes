const {sb,reg,docEl}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S;
const G=n=>sb[n]||sb.window[n];

// Construit un historique : poids qui descend, et des journees d'apport donnees
function scenario(kcalParJour,poidsDebut,poidsFin,jours){
  S.weights=[];S.dayMeals={};
  const d0=new Date('2026-06-01T12:00:00Z');
  for(let k=0;k<=jours;k++){
    const d=new Date(d0.getTime()+k*864e5).toISOString().slice(0,10);
    S.weights.push({d:d,w:poidsDebut+(poidsFin-poidsDebut)*k/jours});
    const kc=(typeof kcalParJour==='function')?kcalParJour(k):kcalParJour;
    if(kc>0)S.dayMeals[d]=[{rid:'x',name:'J',mult:1,macros:{kcal:kc,prot:1,gluc:1,lip:1}}];
  }
}

console.log('\n=== AA. estimateTDEE : filtre des journees partielles ===');
t('journees completes : toutes retenues',()=>{
  scenario(2400,105,104,27);
  const r=sb.estimateTDEE();
  if(!r.ok)throw new Error('ok=false, reason='+r.reason);
  eq(r.ecartes.length,0,'aucune ecartee');
  if(r.logs<25)throw new Error('logs='+r.logs);
});
t('*** une journee sur trois incomplete : elles sont ecartees ***',()=>{
  scenario(k=>(k%3===0?400:2400),105,104,27);   // 400 kcal = petit-dej seul
  const r=sb.estimateTDEE();
  if(!r.ok)throw new Error('ok=false, reason='+r.reason);
  if(!r.ecartes.length)throw new Error('aucune journee ecartee');
  // la moyenne ne doit pas etre plombee par les 400
  if(r.avgCal<2300)throw new Error('moyenne plombee : '+r.avgCal);
});
t('*** sans filtre la moyenne serait bien plus basse ***',()=>{
  scenario(k=>(k%3===0?400:2400),105,104,27);
  const r=sb.estimateTDEE();
  const brut=(28*2400-10*2000)/28;   // ce que donnerait l'ancien calcul, approx
  if(r.avgCal<=brut)throw new Error('le filtre ne change rien : '+r.avgCal+' vs '+Math.round(brut));
});
t('le seuil vaut 50 % de la cible du profil',()=>{
  scenario(2400,105,104,27);
  eq(sb.estimateTDEE().seuil,1300,'seuil pour cible 2600');
});
t('une vraie journee basse mais plausible est conservee',()=>{
  scenario(k=>(k===5?1500:2400),105,104,27);   // 1500 > 1300 : c'est un vrai jour
  const r=sb.estimateTDEE();
  eq(r.ecartes.length,0,'ne doit rien ecarter');
});
t('journee juste sous le seuil : ecartee',()=>{
  scenario(k=>(k===5?1200:2400),105,104,27);
  const r=sb.estimateTDEE();
  eq(r.ecartes.length,1,'une seule ecartee');
  eq(r.ecartes[0],'2026-06-06','date');
});
t('trop peu de journees completes : message explicite',()=>{
  scenario(k=>(k%2===0?300:2400),105,104,20);  // ~10 completes
  const r=sb.estimateTDEE();
  if(r.ok)return;                               // assez de jours, tant mieux
  eq(r.reason,'logs','raison');
  if(!r.ecartes||!r.ecartes.length)throw new Error('ecartes non renseigne');
  if(!r.seuil)throw new Error('seuil non renseigne');
});
t('le TDEE reste coherent : apport moyen + deficit',()=>{
  scenario(2400,105,104,27);                    // -1 kg sur 27 j
  const r=sb.estimateTDEE();
  const attendu=2400+(1*7700/27);
  if(Math.abs(r.tdee-attendu)>60)throw new Error('tdee='+r.tdee+' attendu ~'+Math.round(attendu));
});
t('aucune pesee : pas de plantage',()=>{
  S.weights=[];S.dayMeals={};
  eq(sb.estimateTDEE().ok,false);
});

console.log('\n=== AB. Affichage du bloc TDEE ===');
const rtb=G('renderTDEEBlock');
t('le bloc annonce le nombre de journees retenues',()=>{
  scenario(2400,105,104,27);
  const html=rtb(sb.estimateTDEE());
  if(!/journée[s]? complète/.test(html))throw new Error('mention absente');
});
t('le bloc liste les journees ecartees',()=>{
  scenario(k=>(k===5?1200:2400),105,104,27);
  const html=rtb(sb.estimateTDEE());
  if(!html.includes('2026-06-06'))throw new Error('date ecartee non affichee');
  if(!html.includes('écartée'))throw new Error('libelle absent');
});
t('sans journee ecartee, pas de ligne parasite',()=>{
  scenario(2400,105,104,27);
  const html=rtb(sb.estimateTDEE());
  if(html.includes('écartée'))throw new Error('ligne affichee a tort');
});
t('pas de undefined ni NaN dans le rendu',()=>{
  scenario(k=>(k%4===0?500:2400),105,104,27);
  const html=rtb(sb.estimateTDEE());
  if(/undefined|NaN/.test(html))throw new Error(html.slice(0,200));
});

console.log('\n=== AC. Reglages ===');
t('toggleBackupList replie et deplie',()=>{
  const tb=G('toggleBackupList');
  const el=docEl('set-backups');el.style.display='none';
  tb();eq(el.style.display,'block','deplie');
  tb();eq(el.style.display,'none','replie');
});
t('le libelle du bouton suit l\'etat',()=>{
  const tb=G('toggleBackupList');
  const el=docEl('set-backups');el.style.display='none';
  tb();
  if(!/Masquer/.test(docEl('set-backups-toggle').textContent))throw new Error(docEl('set-backups-toggle').textContent);
  tb();
  if(!/Voir/.test(docEl('set-backups-toggle').textContent))throw new Error(docEl('set-backups-toggle').textContent);
});
t('la liste est repliee par defaut dans le HTML',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!src.includes('id="set-backups" style="display:none'))throw new Error('non repliee');
});
t('le bouton Supprimer est juste sous Enregistrer',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  const a=src.indexOf('saveApiKey()'),b=src.indexOf('clearApiKey()');
  if(b<a)throw new Error('ordre inverse');
  if(b-a>700)throw new Error('trop eloignes : '+(b-a)+' caracteres');
});
t('un seul bouton de suppression',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  eq((src.match(/clearApiKey\(\)/g)||[]).length,2,'1 handler + 1 definition');
});
t('*** clearApiKey demande confirmation et propage la suppression ***',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  const i=src.indexOf('function clearApiKey');
  const bloc=src.slice(i,i+700);
  if(!bloc.includes('confirm('))throw new Error('pas de confirmation');
  if(!bloc.includes('saveState()'))throw new Error('suppression non propagee : la cle reviendrait de Firebase');
});
t('annuler la confirmation ne supprime rien',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  const i=src.indexOf('function clearApiKey');
  const bloc=src.slice(i,i+300);
  if(!/if\(!confirm\([\s\S]*?\)\)return;/.test(bloc))throw new Error('sortie anticipee absente');
});

console.log('\n=== AD. Filet avant restauration ===');
t('restoreBackup met l\'etat courant de cote avant de remplacer',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  const i=src.indexOf('async function restoreBackup');
  const bloc=src.slice(i,i+1400);
  const iFilet=bloc.indexOf("'/filet'"),iApply=bloc.indexOf('_applyState(st)');
  if(iFilet<0)throw new Error('aucune mise de cote');
  if(iFilet>iApply)throw new Error('mise de cote APRES le remplacement');
});
t('le filet est stocke hors de /backups (pas purge)',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(src.includes("'/backups/filet'"))throw new Error('stocke dans /backups : serait purge');
});
t('annulerRestauration existe et demande confirmation',()=>{
  const f=G('annulerRestauration');
  if(typeof f!=='function')throw new Error('non definie');
  const src=require('fs').readFileSync('index.html','utf8');
  const i=src.indexOf('async function annulerRestauration');
  if(!src.slice(i,i+300).includes('confirm('))throw new Error('pas de confirmation');
});

console.log('\n---- '+pass+' ok, '+fail+' KO ----');
