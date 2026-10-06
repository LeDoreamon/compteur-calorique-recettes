const {sb}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
const acc=()=>X('renderAccueil()');
console.log('\n=== XXXVII. Nutrition : rappel de pesee ===');
t('*** jamais pese : rappel affiche ***',()=>{X("S.today='2026-10-06';S.weights=[]");delete LS.dz_pesee_plus_tard;if(acc().indexOf('Pas encore de pesée')<0)throw new Error('absent');});
t('*** pese hier : pas de rappel ; il y a 2 jours : rappel ***',()=>{
  X("S.weights=[{d:'2026-10-05',w:80}]");if(/pesée il y a|Pas encore de pesée/.test(acc()))throw new Error('rappel trop tot');
  X("S.weights=[{d:'2026-10-04',w:80},{d:'2026-09-20',w:81}]");if(acc().indexOf('Dernière pesée il y a 2 jours')<0)throw new Error('absent a 2 jours');
});
t('une pesee future (saisie par erreur) ne masque pas le rappel',()=>{X("S.weights=[{d:'2026-10-20',w:80},{d:'2026-10-01',w:80}]");if(acc().indexOf('il y a 5 jours')<0)throw new Error('mauvais calcul');});
t('*** « Plus tard » : masque pour la journee seulement ***',()=>{
  X("S.weights=[]");X('peseePlusTard()');eq(LS.dz_pesee_plus_tard,'2026-10-06');if(acc().indexOf('Pas encore de pesée')>=0)throw new Error('encore affiche');
  X("S.today='2026-10-07'");if(acc().indexOf('Pas encore de pesée')<0)throw new Error('pas revenu le lendemain');X("S.today='2026-10-06'");
});
t('« Me peser » ouvre la pesee',()=>{delete LS.dz_pesee_plus_tard;X("S.weights=[]");if(acc().indexOf("menuAjoutAction('pesee')")<0)throw new Error('bouton');});
console.log('\n=== XXXVIII. Nutrition : journees trop basses ===');
function jour(d,k){X("S.dayMeals['"+d+"']=[{rid:'_x',name:'R',mult:1,macros:{kcal:"+k+",prot:50,gluc:50,lip:20}}]");}
function prepBas(sexe){X("S.today='2026-10-06';S.dayMeals={};S.weights=[{d:'2026-10-06',w:80}];TARGETS={kcal:2000,prot:150,gluc:200,lip:70};S.profil={prenom:'A',sexe:'"+sexe+"'}");delete LS.dz_bas_vu;}
t('*** homme : 2 jours sur 3 sous 1500 -> alerte ***',()=>{prepBas('H');jour('2026-10-05',1300);jour('2026-10-04',1400);jour('2026-10-03',2000);
  const h=acc();if(h.indexOf('Journées très basses')<0)throw new Error('absente');if(h.indexOf('sous 1500 kcal')<0)throw new Error('plancher');});
t('un seul jour bas : pas d\'alerte',()=>{prepBas('H');jour('2026-10-05',1300);jour('2026-10-04',1900);jour('2026-10-03',2000);if(acc().indexOf('Journées très basses')>=0)throw new Error('alerte a tort');});
t('*** journees sous 50 % de la cible = oublis de saisie, pas comptees ***',()=>{prepBas('H');jour('2026-10-05',600);jour('2026-10-04',800);if(acc().indexOf('Journées très basses')>=0)throw new Error('oublis comptes');});
t('sexe en minuscule (« h ») : plancher homme',()=>{prepBas('h');jour('2026-10-05',1300);jour('2026-10-04',1400);if(acc().indexOf('sous 1500 kcal')<0)throw new Error('minuscule ignoree');});
t('femme : plancher 1200',()=>{prepBas('F');jour('2026-10-05',1300);jour('2026-10-04',1300);if(acc().indexOf('Journées très basses')>=0)throw new Error('1300 > 1200');
  jour('2026-10-05',1100);jour('2026-10-04',1150);if(acc().indexOf('sous 1200 kcal')<0)throw new Error('absente');});
t('« Compris » masque pour la journee',()=>{X('joursBasVu()');if(acc().indexOf('Journées très basses')>=0)throw new Error('encore');});
console.log('\n=== XXXIX. Nutrition : proteines par repas ===');
function repas(slot,p){X("S.dayMeals[S.today]=(S.dayMeals[S.today]||[]).concat([{rid:'_y',name:'R',mult:1,slot:"+(slot?"'"+slot+"'":"null")+",macros:{kcal:400,prot:"+p+",gluc:40,lip:10}}])");}
t('*** proteines par repas affichees, repas principal faible signale ***',()=>{prepBas('H');repas('breakfast',12);repas('lunch',45);repas('snack',8);
  const h=acc();if(h.indexOf('Protéines par repas')<0)throw new Error('ligne absente');
  if(!/Petit-déj <strong style="color:var\(--orange\);">12 g/.test(h))throw new Error('petit-dej non signale');
  if(!/Déjeuner <strong style="color:var\(--green\);">45 g/.test(h))throw new Error('dejeuner');
  if(h.indexOf('ton petit déjeuner n’en a apporté que 12 g')<0)throw new Error('conseil');});
t('une collation seule : pas de ligne ; collation faible jamais signalee',()=>{prepBas('H');repas('snack',5);if(acc().indexOf('Protéines par repas')>=0)throw new Error('ligne pour une collation');});
t('tout au-dessus de 25 g : pas de conseil',()=>{prepBas('H');repas('breakfast',30);repas('dinner',40);if(acc().indexOf('Vise 25 à 40 g')>=0)throw new Error('conseil a tort');});
(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
