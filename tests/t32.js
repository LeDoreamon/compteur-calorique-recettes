const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');
function hydrate(){
  const h=docEl('inv-items-section').innerHTML||'';const re=/<input\b([^>]*)>/g;let m;
  while((m=re.exec(h))){const a=m[1];const id=(a.match(/id="([^"]+)"/)||[])[1];if(!id)continue;
    const el=docEl(id);const v=(a.match(/value="([^"]*)"/)||[])[1];
    if(v!==undefined)el.value=v;el.checked=/\bchecked\b/.test(a);}
}
function poser(items){
  // Le faux DOM garde ses champs d'un test a l'autre : on les vide, sinon une
  // valeur laissee par le test precedent serait relue comme une correction.
  for(var k=0;k<8;k++){docEl('free-nom-'+k).value='';docEl('free-qty-'+k).value='';}
  S.inv={frigo:[],placards:[],congelateur:[],epices:[]};
  sb.openAddMeal('text');G('manualAddMeal')();
  G('__setFree')(items.map(x=>{
    const q=x.q,m={kcal:x.kcal,prot:x.prot,gluc:x.gluc,lip:x.lip};
    return {n:x.n,qty:q,baseQty:q,unit:x.u,m:m,
            pu:q>0?{kcal:m.kcal/q,prot:m.prot/q,gluc:m.gluc/q,lip:m.lip/q}:null};
  }));
  sb.renderInvSuggestions([]);hydrate();sb.recalcAddMealMacros();
}
const repas=()=>[
  {n:'Poulet grillé',q:180,u:'g',kcal:306,prot:46,gluc:0,lip:13},
  {n:'Purée de courge',q:200,u:'g',kcal:105,prot:3,gluc:18,lip:2},
  {n:'Muffins salés',q:120,u:'g',kcal:260,prot:9,gluc:21,lip:14}
];

console.log('\n=== DO. Lignes estimees visibles sans inventaire ===');
t('*** la section reste affichee en mode « Non » ***',()=>{
  poser(repas());G('setInvMode')(false);
  eq(docEl('inv-items-section').style.display,'block','masquee alors qu il y a des lignes');
});
t('sans lignes estimees, le mode « Non » masque la section',()=>{
  G('__setFree')([]);G('setInvMode')(false);
  eq(docEl('inv-items-section').style.display,'none');
});
t('le mode « Oui » affiche toujours la section',()=>{
  G('setInvMode')(true);
  eq(docEl('inv-items-section').style.display,'block');
});

console.log('\n=== DP. Chaque ligne est corrigeable ===');
t('*** le nom de chaque ligne est un champ de saisie ***',()=>{
  poser(repas());
  const h=docEl('inv-items-section').innerHTML;
  [0,1,2].forEach(function(i){
    if(!new RegExp('id="free-nom-'+i+'"').test(h))throw new Error('ligne '+i+' non editable');
  });
});
t('les noms estimes sont pre-remplis',()=>{
  const h=docEl('inv-items-section').innerHTML;
  ['Poulet grillé','Purée de courge','Muffins salés'].forEach(function(n){
    if(!h.includes(n))throw new Error(n+' absent');
  });
});
t('*** chaque ligne a un bouton de recalcul ***',()=>{
  eq((docEl('inv-items-section').innerHTML.match(/reestimerLigne\(/g)||[]).length,3);
});
t('*** chaque ligne a un bouton de suppression ***',()=>{
  eq((docEl('inv-items-section').innerHTML.match(/supprimerLigneEstimee\(/g)||[]).length,3);
});
t('un nom avec guillemets ne casse pas le rendu',()=>{
  poser([{n:'Gratin "dauphinois" & légumes',q:150,u:'g',kcal:260,prot:9,gluc:21,lip:14}]);
  const h=docEl('inv-items-section').innerHTML;
  if(/undefined/.test(h))throw new Error('rendu casse');
  if(!h.includes('Gratin'))throw new Error('nom absent');
});

console.log('\n=== DQ. Correction du nom ===');
t('*** corriger un nom le conserve au recalcul ***',()=>{
  poser(repas());
  docEl('free-nom-2').value='Gratins dauphinois aux légumes';
  sb.recalcAddMealMacros();
  eq(G('__getFree')()[2].n,'Gratins dauphinois aux légumes');
});
t('un nom vide ne remplace pas l ancien',()=>{
  poser(repas());
  docEl('free-nom-0').value='   ';
  sb.recalcAddMealMacros();
  eq(G('__getFree')()[0].n,'Poulet grillé');
});
t('la correction survit a la suppression d une autre ligne',()=>{
  poser(repas());
  docEl('free-nom-2').value='Gratins de légumes';
  G('supprimerLigneEstimee')(1);
  const f=G('__getFree')();
  eq(f.length,2);eq(f[1].n,'Gratins de légumes','correction perdue');
});

console.log('\n=== DR. Suppression ===');
t('*** retirer une ligne la fait disparaitre ***',()=>{
  poser(repas());G('supprimerLigneEstimee')(1);
  const f=G('__getFree')();
  eq(f.length,2);eq(f[0].n,'Poulet grillé');eq(f[1].n,'Muffins salés');
});
t('*** le total est recalcule apres suppression ***',()=>{
  poser(repas());
  eq(+docEl('addmeal-kcal').value,671,'306+105+260');
  G('supprimerLigneEstimee')(2);
  eq(+docEl('addmeal-kcal').value,411,'306+105');
});
t('index inexistant : sans effet',()=>{
  poser(repas());G('supprimerLigneEstimee')(99);
  eq(G('__getFree')().length,3);
});
t('tout supprimer remet le total a zero',()=>{
  poser(repas());
  G('supprimerLigneEstimee')(0);G('supprimerLigneEstimee')(0);G('supprimerLigneEstimee')(0);
  eq(G('__getFree')().length,0);eq(+docEl('addmeal-kcal').value,0);
});

console.log('\n=== DS. Recalcul par l IA ===');
t('reestimerLigne est asynchrone',()=>{
  const f=G('reestimerLigne');
  if(typeof f!=='function')throw new Error('non definie');
  if(f.constructor.name!=='AsyncFunction')throw new Error('devrait etre async');
});
t('*** elle ne remplace qu une seule ligne ***',()=>{
  const i=src.indexOf('async function reestimerLigne');
  const b=src.slice(i,i+1800);
  if(!/_addMealFreeItems\[i\]=\{/.test(b))throw new Error('ne cible pas la ligne');
  if(/_addMealFreeItems=\[\]/.test(b))throw new Error('ecrase toutes les lignes');
});
t('un nom vide bloque le recalcul',()=>{
  const i=src.indexOf('async function reestimerLigne');
  if(!/if\(!nom\)\{alert/.test(src.slice(i,i+700)))throw new Error('garde absente');
});
t('un seul recalcul a la fois',()=>{
  const i=src.indexOf('async function reestimerLigne');
  if(!/_ligneEnCours>=0\)return/.test(src.slice(i,i+700)))throw new Error('concurrence possible');
});
t('l etat est restaure meme en cas d echec',()=>{
  const i=src.indexOf('async function reestimerLigne');
  const b=src.slice(i,i+2100);
  if(!/finally\{/.test(b))throw new Error('pas de finally');
  if(!/_ligneEnCours=-1/.test(b))throw new Error('indicateur non remis a zero');
});
t('le prompt reclame quantite et unite',()=>{
  const i=src.indexOf('async function reestimerLigne');
  const b=src.slice(i,i+1700);
  if(!/"q":number/.test(b))throw new Error('quantite absente du schema');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');

console.log('\n=== DT. Lecture de la reponse IA ===');
t('*** la reponse de callAI est assemblee avant extraction ***',()=>{
  const i=src.indexOf('async function reestimerLigne');
  const b=src.slice(i,i+2200);
  if(/extractJSON\(rep\)/.test(b))
    throw new Error("l'objet de reponse est passe tel quel a extractJSON");
  if(!/rep\.content\)\?rep\.content\.map/.test(b))
    throw new Error('les blocs de la reponse ne sont pas assembles');
  if(!/extractJSON\(txt\)/.test(b))throw new Error('extraction sur autre chose que le texte');
});
t('l\'appel suit la meme forme que les autres appels de l\'app',()=>{
  const i=src.indexOf('async function reestimerLigne');
  const b=src.slice(i,i+1900);
  if(!/callAI\(\[\{role:'user',content:dem\}\],400,sys,null,0,7\)/.test(b))
    throw new Error('signature differente des autres appels');
});
t('une reponse vide ne plante pas',()=>{
  const i=src.indexOf('async function reestimerLigne');
  const b=src.slice(i,i+2200);
  if(!/rep&&rep\.content/.test(b))throw new Error('pas de garde sur la reponse');
});

console.log('\n=== DU. Zones tactiles ===');
t('*** les deux boutons sont nettement ecartes ***',()=>{
  poser(repas());
  const h=docEl('inv-items-section').innerHTML;
  const iSup=h.indexOf('supprimerLigneEstimee(0)');
  const bloc=h.slice(iSup-200,iSup+400);
  const m=bloc.match(/margin-left:(\d+)px/g)||[];
  if(!/margin-left:14px/.test(bloc))throw new Error('ecart insuffisant entre recalcul et suppression');
});
t('*** les cibles sont assez grandes pour le doigt ***',()=>{
  const h=docEl('inv-items-section').innerHTML;
  const iRe=h.indexOf('reestimerLigne(0)');
  const b1=h.slice(iRe,iRe+400);
  if(!/padding:7px 9px/.test(b1))throw new Error('bouton de recalcul trop petit');
  const iSu=h.indexOf('supprimerLigneEstimee(0)');
  const b2=h.slice(iSu,iSu+400);
  if(!/padding:7px 8px/.test(b2))throw new Error('bouton de suppression trop petit');
});
t('le bouton de recalcul est visuellement distinct',()=>{
  const h=docEl('inv-items-section').innerHTML;
  const i=h.indexOf('reestimerLigne(0)');
  if(!/rgba\(111,191,115/.test(h.slice(i,i+400)))throw new Error('pas de fond distinctif');
});
t('*** la suppression demande confirmation ***',()=>{
  const i=src.indexOf('function supprimerLigneEstimee');
  const b=src.slice(i,i+420);
  if(!/if\(!confirm\(/.test(b))throw new Error('aucune confirmation');
  if(!/Retirer/.test(b))throw new Error('message peu explicite');
});
t('le nom de la ligne figure dans la confirmation',()=>{
  const i=src.indexOf('function supprimerLigneEstimee');
  if(!/f\.n\|\|'cette ligne'/.test(src.slice(i,i+420)))throw new Error('nom absent du message');
});
t('refuser la confirmation ne supprime rien',()=>{
  poser(repas());
  const vrai=sb.confirm;
  sb.confirm=function(){return false;};
  try{G('supprimerLigneEstimee')(1);}finally{sb.confirm=vrai;}
  eq(G('__getFree')().length,3,'la ligne a ete supprimee malgre le refus');
});
console.log('\n---- total '+pass+' ok, '+fail+' KO ----');
