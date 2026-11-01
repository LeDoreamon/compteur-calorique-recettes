// Graphique du poids : periode (7 j, 1 mois, 3 mois, tout) et point touche = date + poids (01/11/2026, demande de Liam)
const {sb}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const S=sb.S;
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
const J=n=>X("shiftDate(S.today,"+n+")");
/* 61 pesees, une tous les 2 jours sur 4 mois, de 106 a 100 kg */
const prepa=()=>{
  Object.keys(LS).forEach(k=>delete LS[k]);X('_perPoids=null');
  const ws=[];for(let i=120;i>=0;i-=2)ws.push({d:J(-i),w:+(100+i*0.05).toFixed(1)});
  X("S.weights="+JSON.stringify(ws));
};
const pts=h=>{const m=h.match(/<svg class="graph-poids"[^>]*data-pts="([^"]*)"/);return m?JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&')):null;};
const html=()=>X('renderWeightHTML()');

console.log('\n=== LXXVII. Graphique du poids : periode et point touche ===');
t('*** quatre periodes (7 j, 1 mois, 3 mois, Tout), « Tout » par defaut ***',()=>{
  prepa();const h=html();
  eq((h.match(/data-action="poids-periode"/g)||[]).length,4);
  ['7 j','1 mois','3 mois','Tout'].forEach(l=>{if(h.indexOf('>'+l+'</button>')<0)throw new Error(l);});
  if(!/aria-selected="true" data-action="poids-periode" data-val="tout"/.test(h))throw new Error('Tout pas actif');
  eq(pts(h).length,61,'toutes les pesees');
});
t('*** 7 j = aujourd\'hui et les 6 jours d\'avant ; 1 mois = 30 jours ; 3 mois = 90 jours ***',()=>{
  prepa();
  X("choisirPeriodePoids('7')");let p=pts(html());eq(p.length,4,'7 j : 0,-2,-4,-6');eq(p[0][2],J(-6));
  X("choisirPeriodePoids('30')");eq(pts(html()).length,15,'1 mois');
  X("choisirPeriodePoids('90')");eq(pts(html()).length,45,'3 mois');
  X("choisirPeriodePoids('tout')");eq(pts(html()).length,61,'tout');
});
t('le choix est retenu par appareil ; une valeur inconnue est ignoree',()=>{
  prepa();X("choisirPeriodePoids('30')");eq(LS.dz_poids_periode,'30');
  X('_perPoids=null');eq(X('_periodePoids()'),'30','relu au demarrage');
  X("choisirPeriodePoids('n_importe')");eq(X('_periodePoids()'),'30');
  LS.dz_poids_periode='zz';X('_perPoids=null');eq(X('_periodePoids()'),'tout');
});
t('*** l\'axe d\'une periode couvre le calendrier, dates de debut et de fin affichees ***',()=>{
  prepa();X("choisirPeriodePoids('7')");const h=html();
  if(h.indexOf('>'+X("_wDateLabel(shiftDate(S.today,-6))")+'</text>')<0||h.indexOf('>'+X('_wDateLabel(S.today)')+'</text>')<0)throw new Error('dates de l\'axe');
});
t('*** la moyenne 7 j d\'une periode tient compte des pesees d\'avant ***',()=>{
  prepa();const arr=X('S.weights.slice()');
  const h=X("weightChartSVG(S.weights,{debut:shiftDate(S.today,-6),fin:S.today})");
  const ma=X("_wMA(S.weights,S.weights.findIndex(function(x){return x.d===shiftDate(S.today,-6);}),7)");
  if(!(ma>arr.find(x=>x.d===J(-6)).w))throw new Error('moyenne non glissee sur les jours precedents');
  if(h.indexOf('Pas assez')>=0)throw new Error('message a tort');
});
t('periode avec moins de 2 pesees : message, les boutons restent pour changer',()=>{
  prepa();X("S.weights=S.weights.filter(function(x){return x.d<shiftDate(S.today,-20);}).concat([{d:S.today,w:99}])");
  X("choisirPeriodePoids('7')");const h=html();
  if(h.indexOf('Pas assez de pesées sur cette période')<0)throw new Error('message');
  eq((h.match(/data-action="poids-periode"/g)||[]).length,4);
});
t('*** point touche : la pesee la plus proche, date et poids a la francaise ***',()=>{
  const p=[[40,50,'2026-10-29',102.2],[60,40,'2026-10-31',102],[90,30,'2026-11-01',101.6]];
  sb.__p=p;eq(X('_pointProche(__p,63)[2]'),'2026-10-31');eq(X('_pointProche(__p,80)[2]'),'2026-11-01');eq(X('_pointProche([],5)'),null);
  eq(X("_libPointPoids(__p[1],'kg')"),'31/10 · 102,0 kg');eq(X("_libPointPoids([0,0,'2026-10-02',88.25],'cm')"),'02/10 · 88,3 cm');
});
t('*** le SVG porte les points, l\'etiquette cachee et le toucher ; le defilement vertical reste possible ***',()=>{
  prepa();const h=html();
  if(!/<svg class="graph-poids"[^>]*data-u="kg"[^>]*onclick="toucheGraphPoids\(event,this\)" onmousemove="toucheGraphPoids\(event,this\)"[^>]*touch-action:pan-y/.test(h))throw new Error('svg');
  if(!/<g class="gp-tip" style="display:none;pointer-events:none;">/.test(h))throw new Error('etiquette');
  const p=pts(h);if(!p.every(x=>x.length===4&&typeof x[0]==='number'&&/^\d{4}-\d\d-\d\d$/.test(x[2])))throw new Error('donnees');
  if(h.indexOf('Touche la courbe pour voir la date et le poids')<0)throw new Error('aide');
});
t('*** toucher la courbe affiche l\'etiquette, un clic ailleurs la ferme ***',()=>{
  const el=()=>({attrs:{},style:{},textContent:'',setAttribute(k,v){this.attrs[k]=v;},getComputedTextLength(){return 80;}});
  const g=el(),c=el(),bg=el(),tx=el();g.style.display='none';g.querySelector=s=>({'.gp-pt':c,'.gp-bg':bg,'.gp-tx':tx}[s]);
  const data=[[40,50,'2026-10-29',102.2],[300,140,'2026-10-31',102]];
  const svg={getAttribute:k=>({'data-pts':JSON.stringify(data),'data-u':'kg'}[k]),getBoundingClientRect:()=>({left:10,top:0,width:320,height:170}),
    viewBox:{baseVal:{width:320}},querySelector:s=>s==='.gp-tip'?g:null,contains:()=>false};
  sb.__s=svg;X("toucheGraphPoids({clientX:300,type:'click'},__s)");
  eq(tx.textContent,'31/10 · 102,0 kg');eq(g.style.display,'','visible');eq(c.attrs.cx,300);
  if(!(bg.attrs.x+bg.attrs.width<=320))throw new Error('etiquette hors du cadre a droite');
  X('_fermerGraphPoids()');eq(g.style.display,'none','fermee');eq(X('_graphOuvert'),null);
});
t('mensurations : meme graphique, en cm, sans periode',()=>{
  const src=require('fs').readFileSync('index.html','utf8');
  if(!/weightChartSVG\(tailles\.map\(function\(x\)\{return \{d:x\.d,w:x\.taille\};\}\),\{unite:'cm'\}\)/.test(src))throw new Error('unite cm');
  const h=X("weightChartSVG([{d:'2026-10-01',w:95},{d:'2026-10-20',w:93.5}],{unite:'cm'})");
  if(!/data-u="cm"/.test(h))throw new Error('data-u');
});

console.log('---- '+pass+' ok, '+fail+' KO');
