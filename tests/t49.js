const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');
const P=()=>G('PROGRAMME_SEANCES');

console.log('\n=== GR. Le programme ===');
t('*** les quatre seances du programme Haut/Bas ***',()=>{
  eq(P().map(s=>s.id).join(','),'hautA,basA,hautB,basB');
});
t('*** aucune seance ne contient de cardio ***',()=>{
  P().forEach(s=>{if(/\bcardio\b|\btapis\b|\bmarche\b|\bv[ée]lo\b|elliptique|\brameur\b/i.test(s.exos+s.nom))throw new Error(s.nom);});
});
t('le contenu reprend les exercices cles',()=>{
  const x=P().map(s=>s.exos).join(' ').toLowerCase();
  ['développé couché','squat','rowing','roumain','hip thrust','skull crusher','tractions'].forEach(k=>{
    if(x.indexOf(k)<0)throw new Error(k+' absent');});
});

console.log('\n=== GS. Estimation de la depense ===');
t('*** la depense suit le poids le plus recent ***',()=>{
  S.weights=[{d:'2026-09-01',w:110},{d:'2026-09-20',w:104}];
  const a=P()[0];
  eq(G('kcalSeance')(a),Math.round((a.met-1)*104*a.min/60));
});
t('*** Haut A a 104 kg : environ 310 kcal nettes ***',()=>{
  S.weights=[{d:'2026-09-20',w:104}];
  eq(G('kcalSeance')(P()[0]),312);
});
t('le bas du corps coute davantage que le haut',()=>{
  if(!(G('kcalSeance')(P()[1])>G('kcalSeance')(P()[0])))throw new Error('ordre inattendu');
});
t('*** une duree saisie est prise en compte ***',()=>{
  S.weights=[{d:'2026-09-20',w:104}];
  eq(G('kcalSeance')(P()[0],90),Math.round(3*104*1.5));
});
t('sans pesee, le poids du profil sert de repli, puis 80 kg',()=>{
  S.weights=[];S.profil={poids:95};eq(G('_poidsCourant')(),95);
  S.profil=null;eq(G('_poidsCourant')(),80);
});
t('*** estimation nette : le metabolisme de repos n\'est pas recompte ***',()=>{
  if(!/\(s\.met-1\)\*_poidsCourant\(\)/.test(src))throw new Error('MET brut utilise');
});

console.log('\n=== GT. Dans la fenetre de depense ===');
t('*** la section apparait pour ton profil ***',()=>{
  S.catalogue=null;S.weights=[{d:'2026-09-20',w:104}];
  G('renderProgramme')();
  eq(docEl('burn-programme').style.display,'block');
  const h=docEl('burn-programme').innerHTML;
  eq((h.match(/<option value="(hautA|basA|hautB|basB)"/g)||[]).length,4,'quatre seances');
  if(!/~312 kcal/.test(h))throw new Error('estimation absente du deroulant');
});
t('elle est masquee pour un autre compte',()=>{
  const av=G('__profil')();
  G('selectProfile')('users/AUTRE');S.catalogue=null;
  G('renderProgramme')();
  eq(docEl('burn-programme').style.display,'none');
  G('selectProfile')(av);
});
t('*** choisir une seance puis ajouter cree l\'activite ***',()=>{
  S.weights=[{d:'2026-09-20',w:104}];
  G('__burnActs')().length=0;
  G('renderProgramme')();
  docEl('burn-prog-sel').value='basA';
  G('renderProgramme')();
  docEl('burn-prog-min').value='55';
  G('ajouterSeanceProgramme')();
  const a=G('__burnActs')();
  eq(a.length,1);
  eq(a[0].name,'Muscu \u2014 Bas A \u2014 quadriceps');
  eq(a[0].min,55);eq(a[0].kcal,Math.round(4*104*55/60));
});
t('une duree absurde retombe sur la duree prevue',()=>{
  G('__burnActs')().length=0;
  docEl('burn-prog-sel').value='hautB';
  docEl('burn-prog-min').value='900';
  G('ajouterSeanceProgramme')();
  eq(G('__burnActs')()[0].min,60);
});
t('sans seance choisie, rien n\'est ajoute',()=>{
  G('__burnActs')().length=0;
  docEl('burn-prog-sel').value='';
  G('ajouterSeanceProgramme')();
  eq(G('__burnActs')().length,0);
});
t('le cardio reste a saisir a la main, section separee',()=>{
  const i=src.indexOf('id="burn-programme"');const j=src.indexOf('🏃 Activités');
  if(i<0||j<0||i>j)throw new Error('ordre des sections');
});

console.log('\n=== GU. Accueil ===');
t('*** le nom reel de l\'activite s\'affiche sur l\'accueil ***',()=>{
  S.inv={frigo:[],placards:[],congelateur:[],epices:[]};
  S.dayMeals[S.today]=[{rid:'x',name:'R',mult:1,macros:{kcal:2000,prot:60,gluc:100,lip:30}}];
  G('__setBurn')({[S.today]:{steps:0,activities:[{name:'Muscu \u2014 Haut A \u2014 poussée',min:60,kcal:312}]}});
  const h=G('renderAccueil')();
  if(h.indexOf('Haut A')<0)throw new Error('nom non affiche');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
