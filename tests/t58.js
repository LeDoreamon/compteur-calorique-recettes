const {sb,docEl}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
const IMG='data:image/jpeg;base64,QUJD';
let reponses={},puts=[];
sb.fetch=async(u,o)=>{
  const chemin=u.split('?')[0].replace(/.*\.app\//,'');
  if(o&&o.method==='PUT'){puts.push([chemin,o.body]);return {ok:true,status:200,json:async()=>null};}
  const r=reponses[chemin];return r?{ok:true,status:200,json:async()=>r}:{ok:true,status:200,json:async()=>null};
};
function prepa(){X("_loaded=true;ACTIVE_PROFILE='users/u1';S.mainTab='weight';S.mesures=[];S.weights=[];");reponses={};puts=[];
  X("_prog={profil:null,etat:'rien',minis:{},pleines:{},pose:'face',sel:[]};");}
const champ=(k,v)=>{docEl('mes-'+k).value=v;};

console.log('\n=== VIIIA. Mensurations ===');
t('*** enregistrer les mesures du jour ***',()=>{
  prepa();['taille','hanches','poitrine','bras','cuisse'].forEach(k=>champ(k,''));
  champ('taille','88,6');champ('bras','37.5');X('addMesure()');
  const m=X('S.mesures[0]');eq(m.d,X('S.today'));eq(m.taille,88.6);eq(m.bras,37.5);eq(m.hanches,undefined);
});
t('une seconde saisie le meme jour complete sans effacer',()=>{
  prepa();X("S.mesures=[{d:S.today,taille:90,bras:37}];");['taille','hanches','poitrine','bras','cuisse'].forEach(k=>champ(k,''));
  champ('taille','89');X('addMesure()');
  eq(X('S.mesures.length'),1);eq(X('S.mesures[0].taille'),89);eq(X('S.mesures[0].bras'),37);
});
t('valeur aberrante ou aucune valeur : refus explique',()=>{
  prepa();const msgs=[];const vrai=sb.alert;sb.alert=m=>msgs.push(m);
  try{['taille','hanches','poitrine','bras','cuisse'].forEach(k=>champ(k,''));X('addMesure()');champ('taille','8');X('addMesure()');}finally{sb.alert=vrai;}
  eq(X('S.mesures.length'),0);eq(msgs.length,2);
  if(msgs[1].indexOf('Tour de taille')<0)throw new Error(msgs[1]);
});
t('ecart du tour de taille sur ~30 jours',()=>{
  prepa();X("S.mesures=[{d:shiftDate(S.today,-40),taille:92},{d:shiftDate(S.today,-30),taille:91},{d:S.today,taille:88.5}];");
  const e=X("_ecartMesure(S.mesures,'taille',30)");eq(e.delta.toFixed(1),'-2.5');eq(e.jours,30);
});
t('*** les mesures partent avec l\'etat et reviennent au chargement ***',()=>{
  const i=src.indexOf('weights:S.weights||[],mesures:S.mesures||[]');if(i<0)throw new Error('absentes du payload');
  prepa();X("_applyState({_profile:ACTIVE_PROFILE,inv:{},dayMeals:{},mesures:[{d:'2026-09-01',taille:90},{d:'x',taille:1}]})");
  eq(X('S.mesures.length'),1,'date invalide filtree');
});
t('supprimer demande confirmation',()=>{
  prepa();X("S.mesures=[{d:'2026-09-01',taille:90}];");
  const vrai=sb.confirm;sb.confirm=()=>false;try{X("delMesure('2026-09-01')");}finally{sb.confirm=vrai;}
  eq(X('S.mesures.length'),1);X("delMesure('2026-09-01')");eq(X('S.mesures.length'),0);
});
t('la carte est dans le Bilan avec la courbe du tour de taille',()=>{
  prepa();X("S.mesures=[{d:shiftDate(S.today,-7),taille:90},{d:S.today,taille:89}];");
  const h=X('renderMesuresHTML()');if(h.indexOf('<svg')<0||h.indexOf('89,0')<0)throw new Error('courbe ou valeur absente');
  if(!/renderMesuresHTML\(\)\+renderProgresHTML\(\)/.test(src))throw new Error('absente du Bilan');
});

console.log('\n=== VIIIB. Photos de progression ===');
t('*** les vignettes se chargent a part, cles et images filtrees ***',async()=>{
  prepa();reponses['users/u1/progresMini.json']={'2026-09-01_face':IMG,'2026-09-02_dos':IMG,'x_face':IMG,'2026-09-03_face':'javascript:alert(1)'};
  await X('chargerProgres()');
  eq(X('_prog.etat'),'ok');eq(Object.keys(X('_prog.minis')).sort().join(),'2026-09-01_face,2026-09-02_dos');
});
t('les photos ne passent jamais par l\'etat synchronise',()=>{
  if(/progres:_prog|minis:_prog/.test(src.slice(src.indexOf('function _saveStateNow'),src.indexOf('function _saveStateNow')+6000)))throw new Error('dans l etat');
});
t('*** enregistrer : photo pleine et vignette, chacune a son chemin ***',async()=>{
  prepa();X("_prog.profil=ACTIVE_PROFILE;_prog.etat='ok';");
  await X('_enregistrerProgres')('2026-09-25_face',IMG,IMG);
  eq(puts.filter(p=>/progres/.test(p[0])).map(p=>p[0]).join(),'users/u1/progres/2026-09-25_face.json,users/u1/progresMini/2026-09-25_face.json');
  eq(X("_prog.minis['2026-09-25_face']"),IMG);
});
t('sans reseau : rien n\'est garde en local, message clair',async()=>{
  prepa();const vraiF=sb.fetch,msgs=[],vraiA=sb.alert;sb.fetch=async()=>{throw new Error('offline');};sb.alert=m=>msgs.push(m);
  try{await X('_enregistrerProgres')('2026-09-25_face',IMG,IMG);}finally{sb.fetch=vraiF;sb.alert=vraiA;}
  eq(X("_prog.minis['2026-09-25_face']"),undefined);if(!/réseau/.test(msgs[0]||''))throw new Error('message');
});
t('choisir deux photos charge les pleines et affiche la comparaison',async()=>{
  prepa();X("_prog.profil=ACTIVE_PROFILE;_prog.etat='ok';_prog.minis={'2026-08-01_face':'"+IMG+"','2026-09-01_face':'"+IMG+"'};");
  X("S.weights=[{d:'2026-08-01',w:85},{d:'2026-09-01',w:83}];S.mesures=[{d:'2026-08-01',taille:92},{d:'2026-09-01',taille:89}];");
  reponses['users/u1/progres/2026-08-01_face.json']=IMG;reponses['users/u1/progres/2026-09-01_face.json']=IMG;
  X("choisirProgres('2026-09-01_face');choisirProgres('2026-08-01_face');");
  await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
  eq(Object.keys(X('_prog.pleines')).length,2);
  const h=X('renderProgresHTML()');
  if(h.indexOf('En 31 jours : -2,0 kg')<0||h.indexOf('-3,0 cm de tour de taille')<0)throw new Error('bilan absent');
});
t('une troisieme selection remplace la plus ancienne',()=>{
  prepa();X("_prog.sel=[];choisirProgres('2026-08-01_face');choisirProgres('2026-08-08_face');choisirProgres('2026-08-15_face');");
  eq(X('_prog.sel').join(),'2026-08-08_face,2026-08-15_face');
});
t('supprimer efface les deux chemins',async()=>{
  prepa();X("_prog.profil=ACTIVE_PROFILE;_prog.etat='ok';_prog.minis={'2026-09-01_face':'"+IMG+"'};");
  X("supprimerProgres('2026-09-01_face')");await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
  eq(puts.filter(p=>/progres/.test(p[0])).map(p=>p[0]+'='+p[1]).join(),'users/u1/progres/2026-09-01_face.json=null,users/u1/progresMini/2026-09-01_face.json=null');
  eq(X("_prog.minis['2026-09-01_face']"),undefined);
});
t('changer de compte vide la galerie',async()=>{
  prepa();X("_prog.profil='users/autre';_prog.etat='ok';_prog.minis={'2026-09-01_face':'"+IMG+"'};");
  await X('chargerProgres()');eq(Object.keys(X('_prog.minis')).length,0);
});
t('*** export et import emportent les photos de progression, filtrees ***',()=>{
  const sv=X('_lireSauvegarde')(JSON.stringify({_format:2,state:{inv:{},dayMeals:{}},progres:{'2026-09-01_face':IMG,'bad':IMG},progresMini:{'2026-09-01_face':IMG}}));
  eq(Object.keys(sv.progres).join(),'2026-09-01_face');eq(Object.keys(sv.progresMini).join(),'2026-09-01_face');
  if(src.indexOf("obj.progres=progres;obj.progresMini=progresMini;")<0)throw new Error('export absent');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
