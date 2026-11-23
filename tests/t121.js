// Activites recentes (23/11/2026, rapport de Liam : un nom d'activite long elargissait toute la fenetre « Pas et activites »)
const {sb,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const LONG='Tapis de marche (inclinaison 12, vitesse entre 3.5 et 4.5 varié toutes les 2 minutes)';

console.log('\n=== XCIV. Activites recentes : un nom long revient a la ligne ===');
t('*** le bouton d\'une activite recente peut passer a la ligne et ne depasse jamais la fenetre ***',()=>{
  sb.__l=LONG;X("_burnData={};_burnData[S.today]={activities:[{name:__l,min:32,kcal:180}]};renderActHistory()");
  const h=docEl('burn-act-hist').innerHTML;
  const b=(h.match(/<button class="act-recent"[^>]*>/)||[''])[0];
  if(!b)throw new Error('bouton absent : '+h);
  if(/white-space:nowrap/.test(b))throw new Error('retour a la ligne interdit : '+b);
  if(!/max-width:100%/.test(b)||!/white-space:normal/.test(b)||!/overflow-wrap:anywhere/.test(b))throw new Error('largeur non bornee : '+b);
  if(h.indexOf(LONG)<0)throw new Error('nom coupe ou absent');
  if(!/<span style="color:var\(--text3\);white-space:nowrap;">32′<\/span>/.test(h))throw new Error('duree separee de son unite');
});
t('sans activite passee : rien n\'est affiche',()=>{
  X("_burnData={};renderActHistory()");eq(docEl('burn-act-hist').style.display,'none');
});

(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' -> '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
