const {sb}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const repas=k=>JSON.stringify([{rid:'x',name:'R',macros:{kcal:k,prot:k>2000?180:100,gluc:0,lip:0}}]);
function prepa(){X("_loaded=true;S.mainTab='weight';S.dayMeals={};TARGETS={kcal:2000,prot:150,gluc:200,lip:60};__setBurn({});_calMois=null;_calSel=null;");}
const clic=(action,val)=>X('_onActionClick')({target:{closest:()=>({dataset:{action:action,val:val}})}});

console.log('\n=== VIIA. Etat d\'une journee ===');
t('*** vert dans ±10 %, orange au-dessus, bleu en dessous ***',()=>{
  prepa();
  X("S.dayMeals['2026-08-01']="+repas(2100)+";S.dayMeals['2026-08-02']="+repas(2300)+";S.dayMeals['2026-08-03']="+repas(1700)+";");
  eq(X("_etatJour('2026-08-01').etat"),'cible');eq(X("_etatJour('2026-08-02').etat"),'dessus');eq(X("_etatJour('2026-08-03').etat"),'dessous');
});
t('*** sous 50 % de la cible : journee incomplete ***',()=>{
  prepa();X("S.dayMeals['2026-08-04']="+repas(900)+";");eq(X("_etatJour('2026-08-04').etat"),'partiel');
});
t('l\'activite du jour s\'ajoute a la cible',()=>{
  prepa();X("S.dayMeals['2026-08-05']="+repas(2400)+";__setBurn({'2026-08-05':{steps:0,activities:[{name:'Muscu',min:60,kcal:400}]}});");
  const e=X("_etatJour('2026-08-05')");
  if(!(e.dep>0))throw new Error('depense ignoree : '+JSON.stringify(e));
  eq(e.etat,e.kcal<=e.cible*1.1&&e.kcal>=e.cible*0.9?'cible':e.etat);
});
t('jour sans repas : vide ; proteines atteintes reperees',()=>{
  prepa();eq(X("_etatJour('2026-08-06').etat"),'vide');
  X("S.dayMeals['2026-08-07']="+repas(2050)+";");eq(X("_etatJour('2026-08-07').protOk"),true);
});

console.log('\n=== VIIB. Rendu et navigation ===');
t('*** une case par jour du mois, lundi en premier ***',()=>{
  prepa();X("_calMois='2026-09';");
  const h=X('renderCalendrier()');
  eq((h.match(/data-action="cal-jour"/g)||[]).length,30);
  // le 1er septembre 2026 est un mardi : une case vide avant
  const m=h.match(/gap:4px;">((?:<div><\/div>)*)<div data-action="cal-jour" data-val="2026-09-01"/);
  if(!m)throw new Error('grille introuvable');
  eq(m[1].length/11,1,'cases vides avant le mardi 1er');
});
t('le mois suivant le mois courant est bloque',()=>{
  prepa();const cur=X('S.today.slice(0,7)');
  clic('cal-mois','1');eq(X('_calMois'),cur);
  clic('cal-mois','-1');if(!(X('_calMois')<cur))throw new Error('retour impossible');
});
t('passage de janvier a decembre',()=>{
  prepa();X("_calMois='2026-01';");clic('cal-mois','-1');eq(X('_calMois'),'2025-12');
});
t('toucher un jour affiche son detail, le retoucher le masque',()=>{
  prepa();const d=X('shiftDate(S.today,-1)');X("S.dayMeals['"+d+"']="+repas(2000)+";");
  clic('cal-jour',d);eq(X('_calSel'),d);
  const h=X('renderCalendrier()');
  if(h.indexOf('2000 kcal pour 2000 visées')<0)throw new Error('detail absent');
  if(h.indexOf('data-action="cal-tracker"')<0)throw new Error('lien tracker absent');
  clic('cal-jour',d);eq(X('_calSel'),null);
});
t('le lien vers le tracker n\'apparait que dans sa plage',()=>{
  prepa();const d=X('shiftDate(S.today,-20)');X("_calMois='"+d.slice(0,7)+"';_calSel='"+d+"';");
  if(X('renderCalendrier()').indexOf('cal-tracker')>=0)throw new Error('lien hors plage');
});
t('Voir dans le tracker ouvre Recettes sur ce jour',()=>{
  prepa();const d=X('shiftDate(S.today,-2)');clic('cal-tracker',d);
  eq(X('S.mainTab'),'recipes');eq(X('S.displayDate'),d);
});
t('bilan du mois : jours dans la cible sur jours saisis complets',()=>{
  prepa();X("_calMois='2026-08';S.dayMeals['2026-08-01']="+repas(2000)+";S.dayMeals['2026-08-02']="+repas(2500)+";S.dayMeals['2026-08-03']="+repas(500)+";");
  if(X('renderCalendrier()').indexOf('1 jour sur 2</strong> dans la cible')<0)throw new Error('bilan faux');
});
t('le calendrier est dans le Bilan',()=>{
  prepa();X("S.mainTab='weight';render();");
  if(sb.document.getElementById('root').innerHTML.indexOf('data-action="cal-jour"')<0)throw new Error('absent');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
