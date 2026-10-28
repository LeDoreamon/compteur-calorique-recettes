// Inventaire en onglets, recherche globale, « À consommer vite », mode Modifier compact (28/10/2026, valide par Liam)
const {sb}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const S=sb.S;
const J=n=>X("shiftDate(getToday(),"+n+")");
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
const prepa=()=>{
  Object.keys(LS).forEach(k=>delete LS[k]);
  S.inv={
    frigo:[{id:'poulet',name:'Blanc de poulet',qty:600,unit:'g',dlc:J(3)},{id:'skyr',name:'Skyr',qty:4,unit:'pcs',dlc:J(30)},{id:'creme',name:'Crème',qty:200,unit:'g',dlc:J(10)},
      {id:'jambon',name:'Jambon',qty:0,unit:'tranches',dlc:J(1)},{id:'pl',name:'Lasagnes',qty:2,unit:'parts',plat:{creeLe:J(0),parts:2},dlc:J(1)},{id:'av',name:'Avocats',qty:2,unit:'pcs',urgent:true}],
    congelateur:[{id:'pois',name:'Petits pois',qty:500,unit:'g'}],
    placards:[{id:'riz',name:'Riz basmati',qty:1000,unit:'g',pkg:{size:500}},{id:'pates',name:'Pâtes',qty:0,unit:'g'},{id:'biscuit',name:'Biscuits',qty:3,unit:'pcs',dlc:J(-2)}],
    epices:[{id:'sel',name:'Sel',qty:null,unit:''}]};
  S.invSearch='';S.invTab=undefined;S.invDlcSort=false;S.waiting=[];X('S.editMode=false');
};
const vis=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');

console.log('\n=== LXXV. Inventaire en onglets ===');
t('*** quatre onglets, frigo par defaut, nombre d\'articles en stock (plats maison et articles a 0 exclus) ***',()=>{
  prepa();const h=X('renderInvCats()');
  eq((h.match(/data-action="inv-tab"/g)||[]).length,4);
  const n=c=>(h.match(new RegExp('data-val="'+c+'"[^>]*>(?:<span class="io-al"[^>]*>\\d+</span>)?<span class="io-sym">[^<]*</span><span class="io-lib">[^<]*</span><span class="io-n">(\\d+)</span>'))||[])[1];
  eq(n('frigo'),4,'poulet, skyr, creme, avocats');eq(n('congelateur'),1);eq(n('placards'),2);eq(n('epices'),1,'« présent » compte');
  if(!/class="inv-onglet on"[^>]*data-val|data-val="frigo" class="inv-onglet on"/.test(h))throw new Error('frigo pas actif');
});
t('*** une seule categorie affichee a la fois ***',()=>{
  prepa();let h=X('renderInvCats()');
  if(h.indexOf('Blanc de poulet')<0||h.indexOf('Riz basmati')>=0)throw new Error('frigo seul attendu');
  X("S.invTab='placards'");h=X('renderInvCats()');if(h.indexOf('Riz basmati')<0||h.indexOf('Blanc de poulet')>=0)throw new Error('placards seuls attendus');
});
t('pastille rouge : perissable marque ou date < 7 jours / depassee, articles en stock seulement',()=>{
  prepa();const h=X('renderInvCats()');
  eq((h.match(/data-val="frigo"[^>]*><span class="io-al"[^>]*>(\d+)</)||[])[1],2,'poulet (3 j) + avocats ; pas le jambon a 0 ni le plat');
  eq((h.match(/data-val="placards"[^>]*><span class="io-al"[^>]*>(\d+)</)||[])[1],1,'biscuits depasses');
  if(/data-val="congelateur"[^>]*><span class="io-al"/.test(h))throw new Error('pastille sans raison');
});
t('*** l\'onglet choisi est retenu (par appareil) ***',()=>{
  prepa();X("choisirOngletInv('congelateur')");eq(X('S.invTab'),'congelateur');eq(LS.dz_inv_onglet,'congelateur');
  S.invTab=undefined;eq(X('_invOnglet()'),'congelateur','relu depuis l\'appareil');
  X("choisirOngletInv('nimporte')");eq(X('_invOnglet()'),'congelateur','categorie inconnue ignoree');
});
t('*** la recherche couvre tout l\'inventaire, groupee par categorie, sans onglets ***',()=>{
  prepa();S.invSearch='i';const h=X('renderInvCats()');
  if(/data-action="inv-tab"/.test(h))throw new Error('onglets pendant la recherche');
  ['Riz basmati','Biscuits','Petits pois'].forEach(n=>{if(h.indexOf(n)<0)throw new Error(n+' absent');});
  if(!/Recherche dans tout l.inventaire/.test(h))throw new Error('mention');
  S.invSearch='zzz';if(!/Aucun article ne correspond/.test(X('renderInvCats()')))throw new Error('aucun resultat');
});
t('onglet sans rien en stock : message clair',()=>{
  prepa();S.inv.congelateur=[];X("S.invTab='congelateur'");if(!/Rien en stock dans le congélateur\./.test(X('renderInvCats()')))throw new Error('message');
});
t('*** dates limites : affichees a 14 jours ou moins (et depassees), masquees au-dela ***',()=>{
  prepa();let v=vis(X('renderInvCats()'));
  if(!/Blanc de poulet .*DLC 3j/.test(v))throw new Error('3 j');if(!/Crème .*DLC 10j/.test(v))throw new Error('10 j');
  if(/DLC \d\dj/.test(v.replace(/DLC 10j/,'')))throw new Error('date lointaine affichee (skyr : 30 j + 14 j de tolerance)');
  X("S.invTab='placards'");if(!/DLC Expiré/.test(vis(X('renderInvCats()'))))throw new Error('depassee masquee');
});

console.log('\n=== LXXVI. Mode Modifier compact ===');
t('*** une ligne par article : nom, quantite, date en pastille (jj/mm) qui ouvre le calendrier, ✕ ***',()=>{
  prepa();X('S.editMode=true');const h=X('renderInvCats()');
  const l=(h.match(/<div class="irow ied"[^]*?openItemDetail\('frigo','poulet'\)[^]*?✕<\/button><\/span>/)||[''])[0];
  if(!l)throw new Error('ligne compacte absente');
  const d=J(3);if(l.indexOf('>'+d.slice(8,10)+'/'+d.slice(5,7)+'<input type="date" value="'+d+'"')<0)throw new Error('pastille de date : '+l);
  if(/updateInvQty\('frigo','poulet',this\.value\)/.test(l)===false)throw new Error('quantite');
  if(/× \d+ ?g/.test(vis(l)))throw new Error('detail des paquets en mode Modifier');
});
t('sans date : pastille 📅 ; un paquet garde −1 / +1',()=>{
  prepa();X('S.editMode=true');X("S.invTab='placards'");const h=X('renderInvCats()');
  if(!/openItemDetail\('placards','riz'\)[^]*?stepInvPkg\('placards','riz',1\)[^]*?>📅<input type="date" value=""/.test(h))throw new Error(h.slice(0,400));
});
t('*** changer une date en mode Modifier l\'enregistre (avant : rien n\'etait sauve) ***',()=>{
  prepa();let n=0;const vrai=X('saveState');sb.__s=()=>{n++;};X('saveState=__s');
  try{X("updateInvDlc('frigo','skyr','2026-12-01')");eq(n,1,'saveState');eq(S.inv.frigo[1].dlc,'2026-12-01');}finally{sb.__v=vrai;X('saveState=__v');}
});

console.log('\n=== LXXVII. À consommer vite ===');
t('*** les dates les plus proches, toutes categories, 14 jours ou moins ; ni stock a 0, ni plats, ni au-dela ***',()=>{
  prepa();const l=X('_aConsommerVite()').map(o=>o.it.id).join(',');
  eq(l,'biscuit,poulet,creme','depassee, 3 j, 10 j (pas le skyr, ni le jambon a 0, ni les lasagnes)');
  const h=X('renderConsommerVite()');
  if(!/⏳ À consommer vite/.test(h)||h.indexOf("openItemDetail('placards','biscuit')")<0)throw new Error('bandeau');
  if(!/onclick="toggleInvDlcSort\(\)">Tout voir par date ›/.test(h))throw new Error('lien vers le tri par DLC');
});
t('au plus 5 lignes, « +N autres » sinon ; rien a signaler = pas de bandeau ; masque en mode Modifier',()=>{
  prepa();for(let i=0;i<5;i++)S.inv.frigo.push({id:'x'+i,name:'Jambon '+i,qty:1,unit:'pcs',dlc:J(4+i)});
  const h=X('renderConsommerVite()');eq((h.match(/class="iv-l"/g)||[]).length,5);if(!/\+3 autres · Tout voir par date/.test(h))throw new Error('autres');
  X('S.editMode=true');eq(X('renderConsommerVite()'),'','mode Modifier');X('S.editMode=false');
  prepa();S.inv.frigo=[];S.inv.placards=[];eq(X('renderConsommerVite()'),'');
});
t('*** l\'ecran : tri par DLC garde tel quel en haut, puis recherche + Modifier sur une ligne, bandeau, onglets ***',()=>{
  prepa();const h=X('renderInv()');
  const i=s=>h.indexOf(s);
  if(!(i('Trier par DLC')>=0&&i('Trier par DLC')<i('class="inv-outils"')&&i('class="inv-outils"')<i('À consommer vite')&&i('À consommer vite')<i('class="inv-onglets"')))throw new Error('ordre');
  if(!/class="inv-outils"><div style="position:relative;flex:1;min-width:0;"><input id="inv-search"[^]*?toggleEditMode\(\)[^>]*>✏️ Modifier</.test(h))throw new Error('ligne recherche + Modifier');
  X('S.invDlcSort=true');const d=X('renderInv()');if(d.indexOf('Trier par DLC')<0||/inv-onglets/.test(d))throw new Error('vue triee par DLC (toutes categories) inchangee');
});
t('quantites a la francaise',()=>{
  eq(X("qtyLabel({qty:410,unit:'g',pkg:{size:500}})"),'410 g · 0,8 × 500 g');eq(X("qtyLabel({qty:1.5,unit:'kg'})"),'1,5 kg');
});

console.log('---- '+pass+' ok, '+fail+' KO');
