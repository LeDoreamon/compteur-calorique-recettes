// Portions selon l'objectif : consigne de l'IA et portion proposee en prise de masse (11/10/2026)
const {sb,docEl}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
const S=sb.S;
const objectif=(o,kcal,prot)=>{X("S.profil={prenom:'T',objectif:'"+o+"'};TARGETS={kcal:"+kcal+",prot:"+prot+",gluc:300,lip:80};");};
const prepa=()=>{
  S.inv={frigo:[{id:'riz_t',name:'Riz test',qty:1000,unit:'g',mac100:{kcal:350,prot:7,gluc:77,lip:1}},
                {id:'oeuf_t',name:'Oeufs test',qty:12,unit:'pcs',pieceG:50,macPiece:{kcal:70,prot:6,gluc:0,lip:5}}],placards:[],congelateur:[],epices:[]};
  const r={id:'test_prise',name:'Riz aux œufs',slots:['lunch'],time:10,used:[{id:'riz_t',qty:100},{id:'oeuf_t',qty:2}]};
  X("for(var i=RCP.length-1;i>=0;i--)if(RCP[i].id==='test_prise')RCP.splice(i,1)");X('RCP').push(r);S.dayMeals={};
  return r;
};
console.log('\n=== LXV. Portions selon l\'objectif ===');
t('*** perte de poids : la regle fixe 550-700 kcal reste ; prise et maintien : portions calculees depuis la cible ***',()=>{
  objectif('perte',2300,170);eq(X('_consignePortions()'),'','perte : pas de consigne calculee');
  if(!/PORTIONS \(perte de poids\) : plat principal \(déjeuner, dîner\) entre 550 et 700 kcal/.test(src))throw new Error('regle perte perdue');
  objectif('prise',3200,175);const c=X('_consignePortions()');
  if(!/prise de masse, cible 3200 kcal\/jour\) : plat principal \(déjeuner, dîner\) entre 860 et 1060 kcal, petit-déjeuner entre 670 et 860, collation entre 260 et 480\. Au moins 49 g de protéines/.test(c))throw new Error(c);
  if(!/ne descends pas sous ces valeurs/.test(c))throw new Error('prise : portions franches');
  objectif('maintien',2600,150);const m=X('_consignePortions()');
  if(!/maintien, cible 2600 kcal\/jour\) : plat principal \(déjeuner, dîner\) entre 700 et 860 kcal/.test(m))throw new Error(m);
});
t('*** la consigne part bien dans l\'invite de generation des recettes ***',()=>{
  if(!/`:_consignePortions\(\)\}/.test(src))throw new Error('non branchee sur l\'invite');
});
t('*** prise de masse : portion proposee ×1,4 pour un plat calibre plus petit ***',()=>{
  const r=prepa();objectif('prise',2300,170);   /* 30 % de 2300 = 690 ; plat = 490 kcal -> ×1,4 */
  eq(X("recipeMacros(RCP.find(function(x){return x.id==='test_prise'})).kcal"),490,'kcal du plat');
  eq(X("_facteurPortion(RCP.find(function(x){return x.id==='test_prise'}))"),1.4);
});
t('aucune proposition en perte, en maintien, pour une collation ou un plat deja a la bonne taille',()=>{
  const r=prepa();const f=()=>X("_facteurPortion(RCP.find(function(x){return x.id==='test_prise'}))");
  objectif('perte',2300,170);eq(f(),0,'perte');
  objectif('maintien',2300,170);eq(f(),0,'maintien');
  objectif('prise',1700,170);eq(f(),0,'deja a la bonne taille (510/490)');
  objectif('prise',2300,170);r.slots=['snack'];eq(f(),0,'collation');
  r.slots=['lunch'];objectif('prise',6000,170);eq(f(),1.9,'plafond ×1,9 : ×2 voudrait dire deux portions');
});
t('*** proposee, pas imposee : les boutons habituels restent, la proposition est a part ***',()=>{
  const r=prepa();objectif('prise',2300,170);
  const h=X("renderCardBottom(RCP.find(function(x){return x.id==='test_prise'}))");
  if(h.indexOf('data-mult="1"')<0||h.indexOf('data-mult="2"')<0)throw new Error('boutons habituels absents');
  if(h.indexOf('data-mult="1.4"')<0)throw new Error('proposition absente');
  if(!/Portion prise de masse ×1,4 · ≈ 690 kcal/.test(h))throw new Error('libelle');
  if(!/tu vois et ajustes les quantités avant de valider/.test(h))throw new Error('explication');
  objectif('perte',2300,170);
  if(X("renderCardBottom(RCP.find(function(x){return x.id==='test_prise'}))").indexOf('Portion prise de masse')>=0)throw new Error('affichee en perte');
});
t('*** le clic lit bien 1,4 (et non 1) ***',()=>{
  if(!/action==='cook'\)\{handleCook\(val,parseFloat\(el\.dataset\.mult/.test(src))throw new Error('parseInt : 1,4 lu comme 1');
});
t('*** confirmation : quantites ×1,4 modifiables, articles a la piece arrondis ***',()=>{
  prepa();objectif('prise',2300,170);
  X("openConfirmCook('test_prise',1.4,S.today,false)");
  const c=X('_cc');eq(c.ings.map(g=>g.qty).join(','),'140,3','riz 140 g, 2,8 œufs -> 3');
  if(!/^×1,4 — Riz aux œufs$/.test(docEl('cc-title').textContent))throw new Error('titre : '+docEl('cc-title').textContent);
});
t('*** une portion agrandie est comptee en entier, le jour meme, sans portion du lendemain ***',()=>{
  prepa();objectif('prise',2300,170);
  X("openConfirmCook('test_prise',1.4,S.today,false)");
  X('_cc').ings.forEach((g,i)=>{docEl('cc-'+i).value=String(g.qty);});
  X('executeCook()');
  const j=S.dayMeals[S.today]||[];eq(j.length,1,'un repas');
  eq(j[0].macros.kcal,700,'140 g de riz (490) + 3 œufs (210)');
  eq(Object.keys(S.dayMeals).length,1,'rien le lendemain');
  eq(S.inv.frigo.find(i=>i.id==='riz_t').qty,860,'stock riz');eq(S.inv.frigo.find(i=>i.id==='oeuf_t').qty,9,'stock œufs');
});
t('×2 inchange : deux portions, la seconde le lendemain',()=>{
  prepa();objectif('perte',2300,170);
  X("openConfirmCook('test_prise',2,S.today,false)");
  X('_cc').ings.forEach((g,i)=>{docEl('cc-'+i).value=String(g.qty);});
  X('executeCook()');
  const jours=Object.keys(S.dayMeals).sort();eq(jours.length,2,'deux jours');
  eq(S.dayMeals[jours[0]][0].macros.kcal,490,'une portion par jour');
});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
