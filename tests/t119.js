// Preparer un plat (15/11/2026, rapport de Liam) : quantite d'un ingredient modifiable apres l'ajout,
// la fenetre ne remonte plus en haut a chaque ajout
const {sb,docEl}=require('./sb.js');
const vm=require('vm');
const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
const prepa=()=>{X(`S.inv={frigo:[{id:'po',name:'Aiguillettes de poulet',qty:1950,unit:'g',mac100:{kcal:110,prot:23.5,gluc:0,lip:1.5}},
  {id:'fr',name:'Fromage râpé',qty:300,unit:'g',mac100:{kcal:342,prot:25,gluc:2,lip:26}}],congelateur:[],placards:[],epices:[]};S.dayMeals={};
  ouvrirPreparerPlat();_plat.nom='Pseudo Nuggets';_plat.parts=3;_plat.ings=[{id:'po',name:'Aiguillettes de poulet',qty:300},{id:'fr',name:'Fromage râpé',qty:90}];renderPlat()`);};

console.log('\n=== XCII. Preparer un plat : quantites modifiables, fenetre qui reste en place ===');
t('*** chaque ingredient ajoute a un champ de quantite (avant : un texte fige) ***',()=>{
  prepa();const h=docEl('plat-overlay').innerHTML;
  const c=(h.match(/<input id="plat-iq-0"[^>]*>/)||[''])[0];
  if(!/type="number"/.test(c)||!/value="300"/.test(c)||!/oninput="majQteIngPlat\(0,this\.value\)"/.test(c))throw new Error('champ : '+c);
  if(!/<span id="plat-ik-0"[^>]*>330 kcal<\/span>/.test(h))throw new Error('kcal de la ligne');
  if(!/<input id="plat-iq-1"[^>]*value="90"/.test(h))throw new Error('seconde ligne');
});
t('*** changer la quantite : ingredient, kcal de la ligne et resume suivent, sans nouveau rendu ***',()=>{
  prepa();let rendus=0;X('var __rp=renderPlat');sb.__n=()=>{rendus++;};X('renderPlat=function(){__n();return __rp.apply(this,arguments);}');
  try{
    X("majQteIngPlat(0,'600')");
    eq(X('_plat.ings[0].qty'),600);eq(docEl('plat-ik-0').textContent,'660 kcal');
    const r=docEl('plat-resume').innerHTML;if(r.indexOf('968 kcal')<0)throw new Error('plat entier : '+r.replace(/<[^>]+>/g,''));
    if(r.indexOf('323 kcal')<0)throw new Error('par part : '+r.replace(/<[^>]+>/g,''));
    eq(rendus,0,'fenetre redessinee a la saisie :');
  }finally{X('renderPlat=__rp');}
});
t('saisie a virgule acceptee ; champ vide, 0 ou texte pendant la frappe : la derniere quantite valable reste',()=>{
  prepa();X("majQteIngPlat(1,'45,5')");eq(X('_plat.ings[1].qty'),45.5);
  X("majQteIngPlat(1,'')");eq(X('_plat.ings[1].qty'),45.5);X("majQteIngPlat(1,'0')");eq(X('_plat.ings[1].qty'),45.5);
  X("majQteIngPlat(1,'abc')");eq(X('_plat.ings[1].qty'),45.5);X("majQteIngPlat(9,'50')");   /* ligne inconnue : ne leve pas */
});
t('*** le plat cree prend la quantite corrigee : stock retire et macros d\'une part ***',async()=>{
  prepa();X("majQteIngPlat(0,'600')");docEl('plat-nom').value='Pseudo Nuggets';await X('creerPlat()');
  eq(X("findItem('po').qty"),1350);eq(X("findItem('fr').qty"),210);
  const pl=X("Object.keys(S.inv).reduce((a,c)=>a.concat(S.inv[c]),[]).find(i=>i.plat)");if(!pl)throw new Error('plat absent');
  eq(Math.round(pl.macPiece.kcal),323);
});
t('*** un nouveau rendu garde le defilement et le volet « hors inventaire » ouvert ***',()=>{
  const i=src.indexOf('function renderPlat');const b=src.slice(i,src.indexOf('function _resumePlatHTML'));
  if(!/_cadre\.scrollTop/.test(b)||!/_c2\.scrollTop=_haut/.test(b))throw new Error('defilement non repris');
  if(b.indexOf('<details id="plat-libre"\'+(_detOuvert?\' open\':\'\')')<0)throw new Error('volet non repris');
  if(!/ov\.style\.display!=='none'/.test(b))throw new Error('une nouvelle ouverture doit repartir du haut');
});
t('*** choisir un plat dans l\'inventaire : en grammes, le reste s\'affiche en grammes ; en parts, en parts ***',()=>{
  X("S.inv={frigo:[{id:'pn',name:'Pseudo Nuggets',qty:3,unit:'parts',pieceG:99,macPiece:{kcal:323,prot:40,gluc:1,lip:14},plat:{creeLe:S.today,parts:3,poidsEstime:99,ings:[]}}],congelateur:[],placards:[],epices:[]};_invPick={};_invPickG={}");
  let h=X("_lignePick(findItem('pn'))");if(h.indexOf('reste 3 parts')<0)throw new Error('en parts : '+h.replace(/<[^>]+>/g,' '));
  X("_invPickG.pn=true");h=X("_lignePick(findItem('pn'))");
  if(h.indexOf('reste ≈ 297 g')<0||h.indexOf('reste 3 parts')>=0)throw new Error('en grammes : '+h.replace(/<[^>]+>/g,' '));
  X("findItem('pn').qty=1.5");if(X("_lignePick(findItem('pn'))").indexOf('reste ≈ 149 g')<0)throw new Error('part entamee');
  X("_invPickG={}");
});
t('*** « + Ajouter manuellement » : articles par rangement puis par ordre alphabetique (avant : ordre de saisie) ***',()=>{
  X("S.inv={frigo:[{id:'m',name:'Moutarde',qty:265,unit:'g'},{id:'c',name:'Crème légère',qty:500,unit:'ml'},{id:'z',name:'Épuisé',qty:0,unit:'g'},{id:'l',name:'Lait',qty:null,unit:'ml'},{id:'pl',name:'Bolognaise',qty:2.5,unit:'parts',pieceG:300,macPiece:{kcal:400,prot:30,gluc:30,lip:15},plat:{creeLe:S.today,parts:4,poidsEstime:300,ings:[]}}],congelateur:[],placards:[{id:'r',name:'Riz',qty:1000,unit:'g'},{id:'a',name:'Amandes',qty:410,unit:'g'}],epices:[]}");
  const h=X('_optionsInventaire({plats:true,qte:true})');
  const noms=(h.match(/<option value="[^"]*">[^<]*/g)||[]).map(x=>x.replace(/<[^>]+>/,''));
  eq(noms.join(' | '),'Bolognaise (2,5 parts) | Crème légère (500 ml) | Lait | Moutarde (265 g) | Amandes (410 g) | Riz (1000 g)');
  eq((h.match(/<optgroup label="/g)||[]).length,2,'rangements vides affiches :');
  if(src.indexOf('const opts = _optionsInventaire({plats:true,qte:true});')<0)throw new Error('liste non branchee');
  /* « Préparer un plat » garde sa liste : sans plats, sans quantites, avec la ligne vide */
  const p=X('_platOptionsStock()');if(p.indexOf('Bolognaise')>=0||p.indexOf('(500')>=0||p.indexOf('<option value="">Choisir')!==0)throw new Error('liste des plats changee');
});

(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' -> '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
