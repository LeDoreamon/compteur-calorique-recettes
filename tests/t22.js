const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');
function inv(){
  S.inv={frigo:[{id:'p',name:'Poulet',unit:'g',qty:500,mac100:{kcal:120,prot:23,gluc:0,lip:2}}],
         placards:[],congelateur:[],epices:[]};
  S.dayMeals[S.today]=[];
}
function hydrate(){
  const h=docEl('inv-items-section').innerHTML||'';const re=/<input\b([^>]*)>/g;let m;
  while((m=re.exec(h))){const a=m[1];const id=(a.match(/id="([^"]+)"/)||[])[1];if(!id)continue;
    const el=docEl(id);const v=(a.match(/value="([^"]*)"/)||[])[1];
    if(v!==undefined)el.value=v;el.checked=/\bchecked\b/.test(a);}
}

console.log('\n=== BZ. Deduction d\'inventaire a l\'ajout d\'un repas ===');
t('*** « Oui » par defaut ***',()=>{
  inv();sb.openAddMeal('text');
  eq(G('__useStock')(),true);
});
t('le bouton Oui est visuellement actif',()=>{
  inv();sb.openAddMeal('text');
  if(!/var\(--accent\)/.test(docEl('ms-yes').style.cssText||''))throw new Error('Oui non surligne');
});
t('photo et texte suivent le meme defaut',()=>{
  ['photo','text'].forEach(function(type){inv();sb.openAddMeal(type);eq(G('__useStock')(),true,type);});
});
t('on peut passer a Non',()=>{
  inv();sb.openAddMeal('text');G('setMealStock')(false);
  eq(G('__useStock')(),false);
});
t('le choix est reinitialise a chaque ouverture',()=>{
  inv();sb.openAddMeal('text');G('setMealStock')(false);
  sb.openAddMeal('text');
  eq(G('__useStock')(),true);
});
t('*** choisir l\'inventaire active la deduction ***',()=>{
  inv();sb.openAddMeal('text');G('setMealStock')(false);
  G('invAddMeal')();
  eq(G('__useStock')(),true);
});
t('*** le stock est bien deduit ***',()=>{
  inv();sb.openAddMeal('text');G('invAddMeal')();
  sb.invPickQty('p',200);sb.applyInvPick();
  docEl('addmeal-name').value='Test';
  hydrate();
  sb.confirmAddMealFinal();
  eq(sb.findItem('p').qty,300,'500 - 200');
});

console.log('\n=== CA. Plus aucun branchement par profil ===');
t('*** le code ne distingue plus de second profil ***',()=>{
  if(new RegExp(['mau','reen'].join(''),'i').test(src))throw new Error('reference restante');
});
t('l\'ecran de selection existe encore, masque',()=>{
  const i=src.indexOf('id="profile-screen"');
  if(i<0)throw new Error('ecran supprime : il doit rester pour la future connexion');
  if(!/display:none;/.test(src.slice(i,i+160)))throw new Error('ecran encore affiche au demarrage');
});
t('*** le demarrage passe par la session ***',()=>{
  if(!/try\{demarrerApp\(\);\}catch\(e\)\{\}/.test(src))throw new Error('aucun demarrage par la session');
});
t('le bouton de changement de profil a disparu',()=>{
  if(/backToProfileSelect/.test(src))throw new Error('encore present');
});
t('le libelle du profil suit les cibles reelles',()=>{
  if(!/\$\{_libObjectif\(\)\} · \$\{TARGETS\.kcal\} kcal/.test(src))
    throw new Error('libelle fige');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
