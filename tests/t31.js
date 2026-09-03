const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');
const ouvrir=G('ouvrirInfoMacro'),fermer=G('fermerInfoMacro');
const corps=()=>docEl('macroinfo-body').innerHTML;

S.inv={frigo:[],placards:[],congelateur:[],epices:[]};
function journee(){
  S.displayDate=S.today;
  S.dayMeals[S.today]=[
    {rid:'a',name:'Pâtes protéinées & aiguillettes',mult:1,macros:{kcal:1563,prot:117,gluc:156,lip:49}},
    {rid:'b',name:'Fromage blanc & framboises',mult:1,macros:{kcal:230,prot:17,gluc:30,lip:2}},
    {rid:'c',name:'Shaker clear whey',mult:1,macros:{kcal:102,prot:23,gluc:2,lip:0}}
  ];
}

console.log('\n=== DK. Ventilation par repas ===');
t('la fenetre s\'ouvre',()=>{
  journee();ouvrir('prot');
  eq(docEl('macroinfo-overlay').style.display,'flex');
  eq(docEl('macroinfo-title').textContent,'Protéines');
});
t('*** chaque repas contributeur est liste ***',()=>{
  journee();ouvrir('prot');
  const h=corps();
  ['Pâtes protéinées','Fromage blanc','Shaker'].forEach(function(n){
    if(!h.includes(n))throw new Error(n+' absent');
  });
});
t('*** les valeurs correspondent a la macro demandee ***',()=>{
  journee();ouvrir('prot');
  const h=corps();
  if(!/117 g/.test(h))throw new Error('117 g absent');
  if(!/23 g/.test(h))throw new Error('23 g absent');
  if(/1563/.test(h))throw new Error('affiche des kcal dans la vue proteines');
});
t('*** les repas sont classes par contribution decroissante ***',()=>{
  journee();ouvrir('prot');
  const h=corps();
  if(h.indexOf('Pâtes')>h.indexOf('Shaker'))throw new Error('ordre incorrect');
  if(h.indexOf('Shaker')>h.indexOf('Fromage blanc'))throw new Error('23 doit preceder 17');
});
t('le pourcentage de chaque repas est affiche',()=>{
  journee();ouvrir('prot');
  if(!/%/.test(corps()))throw new Error('pourcentages absents');
});
t('*** le total et la cible sont rappeles ***',()=>{
  journee();ouvrir('prot');
  const h=corps();
  if(!/157 \/ 175 g/.test(h))throw new Error('total attendu 157/175 : '+h.match(/[\d.]+ \/ \d+ g/));
});
t('le reste a couvrir est annonce',()=>{
  journee();ouvrir('prot');
  if(!/Reste 18 g/.test(corps()))throw new Error(corps().match(/Reste[^<]*/));
});
t('un depassement est annonce comme tel',()=>{
  journee();ouvrir('gluc');            // 188 sur 280 -> reste
  S.dayMeals[S.today][0].macros.gluc=300;
  ouvrir('gluc');
  if(!/Dépassement/.test(corps()))throw new Error(corps().match(/(Reste|Dépass)[^<]*/));
});
t('les quatre macros fonctionnent',()=>{
  journee();
  [['kcal','Calories'],['prot','Protéines'],['gluc','Glucides'],['lip','Lipides']].forEach(function(p){
    ouvrir(p[0]);
    eq(docEl('macroinfo-title').textContent,p[1],p[0]);
    if(/undefined|NaN/.test(corps()))throw new Error(p[0]+' : '+corps().slice(0,120));
  });
});

console.log('\n=== DL. Explication ===');
t('*** le texte descriptif est present ***',()=>{
  journee();ouvrir('prot');
  if(!/muscle/.test(corps()))throw new Error('explication absente');
});
t('*** aucune injonction dans les textes ***',()=>{
  const M=G('MACRO_INFOS');
  Object.keys(M).forEach(function(k){
    const txt=M[k].texte;
    if(/tu dois|il faut|obligatoire|impératif|évite de|ne mange pas/i.test(txt))
      throw new Error(k+' : '+txt);
  });
});
t('la cible est presentee comme un repere personnel',()=>{
  journee();ouvrir('prot');
  if(!/repère personnel, pas une norme/.test(corps()))throw new Error('cadrage absent');
});

console.log('\n=== DM. Cas limites ===');
t('journee sans repas',()=>{
  S.dayMeals={};S.displayDate=S.today;
  ouvrir('prot');
  if(!/Aucun repas/.test(corps()))throw new Error(corps().slice(0,100));
  if(/NaN|undefined/.test(corps()))throw new Error(corps().slice(0,100));
});
t('repas sans macros : ignore, pas de ligne vide',()=>{
  S.dayMeals[S.today]=[{rid:'x',name:'Vide',mult:1},
    {rid:'y',name:'Reel',mult:1,macros:{kcal:100,prot:10,gluc:5,lip:2}}];
  ouvrir('prot');
  if(/Vide/.test(corps()))throw new Error('repas sans macro liste');
  if(!/Reel/.test(corps()))throw new Error('repas reel absent');
});
t('cle inconnue : la fenetre ne s\'ouvre pas',()=>{
  fermer();
  ouvrir('nimportequoi');
  eq(docEl('macroinfo-overlay').style.display,'none');
});
t('la fenetre se ferme',()=>{
  journee();ouvrir('prot');
  fermer();
  eq(docEl('macroinfo-overlay').style.display,'none');
});
t('*** elle lit le jour affiche, pas forcement aujourd\'hui ***',()=>{
  const hier=sb.shiftDate(S.today,-1);
  S.dayMeals={};S.dayMeals[hier]=[{rid:'h',name:'Repas hier',mult:1,macros:{kcal:500,prot:40,gluc:50,lip:10}}];
  S.displayDate=hier;
  ouvrir('prot');
  if(!/Repas hier/.test(corps()))throw new Error('ne lit pas le jour affiche');
});

console.log('\n=== DN. Integration ===');
t('*** le i figure sur les trois barres et sur les calories ***',()=>{
  eq((src.match(/data-action="macro-info"/g)||[]).length,2,'1 dans macroBar + 1 sur les calories');
  ['prot','gluc','lip'].forEach(function(k){
    if(src.indexOf("m."+k+",TARGETS."+k)<0)throw new Error('barre '+k+' introuvable');
  });
  if(!/data-val="kcal"/.test(src))throw new Error('i des calories absent');
});
t('les trois barres passent bien leur cle',()=>{
  ["'prot'","'gluc'","'lip'"].forEach(function(k){
    if(!new RegExp("--[a-z0-9]+',"+k.replace(/'/g,"'")).test(src))throw new Error('cle '+k+' non transmise');
  });
});
t('le clic est cable',()=>{
  if(!/action==='macro-info'\)\{ouvrirInfoMacro\(el\.dataset\.val\)/.test(src))
    throw new Error('cablage absent');
});
t('*** le modal vit hors de #root ***',()=>{
  const iM=src.indexOf('id="macroinfo-overlay"');
  const iR=src.indexOf('<div id="root"');
  if(iM<0)throw new Error('modal absent');
  if(iM>iR)throw new Error('modal dans le contenu re-rendu');
});
t('la zone de tap reste petite',()=>{
  const i=src.indexOf('data-action="macro-info"');
  const b=src.slice(i-260,i+260);
  if(!/font-size:10px/.test(b))throw new Error('bouton trop grand');
});
t('fermeture par clic sur le fond',()=>{
  if(!/if\(event\.target===this\)fermerInfoMacro\(\)/.test(src))throw new Error('fermeture par le fond absente');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
