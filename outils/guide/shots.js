// Captures du guide d'utilisation : compte fictif « Alex », iPhone 390 x 844, Firebase simule
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const [ROOT,DEMO,OUTDIR,FILTRE]=process.argv.slice(2);
fs.mkdirSync(OUTDIR,{recursive:true});
const dm=JSON.parse(fs.readFileSync(DEMO,'utf8'));const STATE=dm.state,BURN=dm.burn;
const srv=http.createServer((q,r)=>{let f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';
  fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream'});r.end(b);});}).listen(8770);
const U='http://localhost:8770/index.html';
async function contexte(b,auth){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'fr-FR',timezoneId:'Europe/Paris',colorScheme:'dark',serviceWorkers:'block'});
  if(auth)await ctx.addInitScript(()=>{try{localStorage.setItem('dz_auth',JSON.stringify({uid:'demo',rtok:'r',login:'alex'}));localStorage.setItem('anthropic_key','gsk_demo');localStorage.setItem('dz_nouveautes','9999');}catch(e){}});
  await ctx.route('**/*',async(route)=>{const u=route.request().url(),m=route.request().method();
    if(u.startsWith('http://localhost:8770/'))return route.continue();
    if(u.includes('securetoken'))return route.fulfill({json:{id_token:'t',refresh_token:'r',expires_in:'3600'}});
    if(u.includes('firebasedatabase.app')){if(m!=='GET')return route.fulfill({json:null});
      if(/users\/demo\/state\.json/.test(u))return route.fulfill({json:STATE});
      if(/users\/demo\/burn\.json/.test(u))return route.fulfill({json:BURN});
      if(/users\/demo\/cles\.json/.test(u))return route.fulfill({json:{groq:'gsk_demo',maj:'2026-11-01T00:00:00Z'}});
      return route.fulfill({json:null});}
    return route.abort();});
  return ctx;
}
(async()=>{
  const b=await chromium.launch({args:['--lang=fr-FR']});const logs=[];
  const prendre=async(page,nom,code,opts)=>{
    if(FILTRE&&!new RegExp(FILTRE).test(nom))return;
    try{
      if(code)await page.evaluate(code);
      await page.waitForTimeout((opts&&opts.attente)||500);
      /* capture seulement : champs date au format francais, comme sur iPhone (Chromium sans interface reste en mm/dd/yyyy) */
      await page.waitForTimeout(300);
      await page.evaluate(()=>{document.querySelectorAll('input[type=date]').forEach(function(e){if(!e.offsetParent)return;var v=e.value||'';e.dataset.capOrig=v;e.type='text';e.value=v?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):'';if(!v)e.placeholder='jj/mm/aaaa';});});
      await page.screenshot({path:path.join(OUTDIR,nom+'.png')});
      await page.evaluate(()=>{document.querySelectorAll('input[data-cap-orig]').forEach(function(e){var v=e.dataset.capOrig;e.type='date';e.value=v;delete e.dataset.capOrig;});});
      console.log('ok',nom);
    }catch(e){console.log('KO',nom,e.message.split('\n')[0]);}
  };
  /* ---- ecran de connexion et inscription (sans session) ---- */
  {const ctx=await contexte(b,false);const page=await ctx.newPage();page.on('pageerror',e=>logs.push('ERR '+e.message));
   await page.goto(U);await page.waitForTimeout(2500);
   await prendre(page,'01-accueil-connexion',null);
   await prendre(page,'02-connexion',`_authMode('connexion');var a=document.getElementById('au-login');if(a)a.value='alex@exemple.fr';var m=document.getElementById('au-mdp');if(m)m.value='motdepasse';`);
   await prendre(page,'03-inscription-compte',`_authMode('inscription');`);
   await prendre(page,'04-inscription-toi',`_ins.etape=1;_ins.p={prenom:'Alex',sexe:'H',naissance:'1995-04-12',taille:178,poids:88.4};renderAuth();window.scrollTo(0,0);`);
   await prendre(page,'05-inscription-cibles',`_ins.etape=4;_ins.p={prenom:'Alex',emoji:'🏃',sexe:'H',naissance:'1995-04-12',taille:178,poids:88.4,poidsVise:80,objectif:'perte',activite:'2',pas:8000,regime:'omnivore',allergies:[],equipement:[]};renderAuth();var ps=document.getElementById('profile-screen');if(ps)ps.scrollTop=0;`);
   await prendre(page,'06-inscription-ia',`_ins.etape=5;renderAuth();var ps=document.getElementById('profile-screen');if(ps)ps.scrollTop=0;`);
   await ctx.close();}
  /* ---- appli connectee ---- */
  const ctx=await contexte(b,true);const page=await ctx.newPage();page.on('pageerror',e=>logs.push('ERR '+e.message));
  await page.goto(U);await page.waitForTimeout(10000);
  await page.evaluate(()=>{document.querySelectorAll('#dz-dlg .dz-dlg-ok').forEach(b=>b.click());});
  const haut=`window.scrollTo({top:0,behavior:'instant'});`;
  const vers=(sel,dec)=>`(function(){var e=document.querySelector('${sel}');if(e)window.scrollTo({top:e.getBoundingClientRect().top+window.scrollY-(${dec||110}),behavior:'instant'});})();`;
  const fermer=`try{closeAddMeal();}catch(e){}try{fermerMenuAjout();}catch(e){}try{closeConfirmCook();}catch(e){}try{closeSettings();}catch(e){}try{fermerEditionProfil();}catch(e){}try{hideCoachToast();}catch(e){}document.querySelectorAll('[id$="-overlay"]').forEach(function(o){o.style.display='none';});var d=document.getElementById('dz-dlg');if(d)d.remove();`;
  const onglet=t=>`${fermer}S.mainTab='${t}';render();${haut}`;
  await prendre(page,'10-accueil',onglet('accueil'));
  await prendre(page,'11-accueil-suite',vers('#acc-objectif',-420));
  await prendre(page,'12-menu-ajout',onglet('accueil')+`ouvrirMenuAjout();`);
  await prendre(page,'13-ajout-saisie',`${fermer}openAddMeal('text');document.getElementById('addmeal-textarea').value='2 œufs brouillés, une tranche de pain complet et un yaourt nature';`);
  await prendre(page,'14-ajout-confirmation',`${fermer}openAddMeal('text');_scanBase=null;_iaAnalyse='groq';var _it=[{n:'Pâtes',q:90,u:'g',kcal:320,prot:11,gluc:65,lip:2,fib:3},{n:'Thon au naturel',q:100,u:'g',kcal:120,prot:26,gluc:0,lip:1,fib:0},{n:'Sauce tomate',q:100,u:'g',kcal:70,prot:2,gluc:9,lip:3,fib:2},{n:'Huile d’olive',q:10,u:'g',kcal:90,prot:0,gluc:0,lip:10,fib:0}];_addMealFreeItems=_it.map(function(x){var m={kcal:x.kcal,prot:x.prot,gluc:x.gluc,lip:x.lip,fib:x.fib};return {n:x.n,qty:x.q,baseQty:x.q,unit:x.u,m:m,pu:{kcal:m.kcal/x.q,prot:m.prot/x.q,gluc:m.gluc/x.q,lip:m.lip/x.q,fib:m.fib/x.q}};});_pendingMeal={name:'Pâtes au thon et sauce tomate',kcal:600,prot:39,gluc:74,lip:16,fib:5,items:_it};document.getElementById('addmeal-input').style.display='none';document.getElementById('addmeal-confirm').style.display='block';applyPendingMealToConfirm();recalcAddMealMacros();var _s=document.getElementById('inv-items-section');if(_s)_s.scrollIntoView({block:'center'});`);
  await prendre(page,'15-composer-inventaire',`${fermer}openAddMeal('text');invAddMeal();choisirOngletPick('frigo');var o=S.inv.frigo.find(function(i){return /^oeufs/i.test(i.name);}),j=S.inv.frigo.find(function(i){return /allumettes de jambon/i.test(i.name);});if(o)invPickQty(o.id,'2');if(j)invPickQty(j.id,'75');`);
  await prendre(page,'16-repas-haut',onglet('recipes')+`S.displayDate=S.today;render();${haut}`);
  await prendre(page,'17-repas-cartes',vers('.repas-moments',100));
  await prendre(page,'18-repas-marge',vers('.marge-jour',380));
  await prendre(page,'19-point-coach',`${haut}showCoachToast(S.today);`,{attente:900});
  await prendre(page,'20-repas-jour-passe',`${fermer}S.displayDate=shiftDate(S.today,-5);render();`+vers('.repas-moments',100));
  await prendre(page,'21-recettes-liste',`${fermer}S.displayDate=S.today;S.mealTab='lunch';S.openRec=null;render();`+vers('.meal-tabs',120));
  await prendre(page,'22-recette-ouverte',`${fermer}S.mealTab='lunch';S.openRec='ai_demo_4';render();`+vers('.rbody[data-rec="ai_demo_4"]',230),{attente:900});
    await prendre(page,'24-confirmation-cuisson',`${fermer}openConfirmCook('ai_demo_4',1,S.today,false);`);
  await prendre(page,'25-recette-perso',`${fermer}openCustRec('cust_demo_bowl');`);
  await prendre(page,'26-inventaire-haut',onglet('inventory')+`S.editMode=false;S.invDlcSort=false;S.invTab='frigo';render();${haut}`);
  await prendre(page,'27-inventaire-liste',vers('#tabpane .inv-onglets',120));
  await prendre(page,'28-inventaire-modifier',`${fermer}S.editMode=true;render();`+vers('#tabpane .inv-onglets',120));
  await prendre(page,'29-fiche-article',`${fermer}S.editMode=false;render();var it=S.inv.frigo.find(function(i){return /oeuf|œuf/i.test(i.name);})||S.inv.frigo[3];openItemDetail('frigo',it.id);`);
  await prendre(page,'30-ajout-article',`${fermer}openAddItem();`);
  await prendre(page,'31-plat-maison',`${fermer}ouvrirPreparerPlat();`);
  await prendre(page,'32-tri-dlc',`${fermer}S.invDlcSort=true;render();${haut}`);
  await prendre(page,'33-a-ranger',`${fermer}S.invDlcSort=false;render();(function(){var t=[].slice.call(document.querySelectorAll('div,span')).find(function(e){return /À ranger/.test(e.textContent)&&e.children.length<4;});if(t)window.scrollTo({top:t.getBoundingClientRect().top+window.scrollY-140,behavior:'instant'});})();`);
  await prendre(page,'34-courses',onglet('courses'));
  await prendre(page,'35-courses-suite',`window.scrollTo({top:700,behavior:'instant'});`);
  await prendre(page,'36-bilan-haut',onglet('weight'));
  await prendre(page,'37-bilan-suite',`window.scrollTo({top:780,behavior:'instant'});`);
  await prendre(page,'38-bilan-poids',vers('svg.graph-poids',260),{attente:300});
  await prendre(page,'39-bilan-poids-touche',`(function(){var s=document.querySelector('svg.graph-poids');var r=s.getBoundingClientRect();toucheGraphPoids({clientX:r.left+r.width*0.62,type:'click'},s);})();`,{attente:300});
  await prendre(page,'40-bilan-calendrier',`_fermerGraphPoids&&_fermerGraphPoids();`+vers('[data-action="cal-mois"]',130));
  await prendre(page,'41-bilan-mesures',`window.scrollTo({top:document.body.scrollHeight,behavior:'instant'});`);
  await prendre(page,'42-activite',`${fermer}openBurnLog(S.today);`);
  await prendre(page,'43-programme',`${fermer}ouvrirProgramme();`);
  await prendre(page,'44-reglages',`${fermer}openSettings();`);
  await prendre(page,'45-reglages-suite',`(function(){var o=document.querySelector('#set-overlay > div');if(o)o.scrollTop=700;})();`);
  await prendre(page,'46-reglages-fin',`(function(){var o=document.querySelector('#set-overlay > div');if(o)o.scrollTop=o.scrollHeight;})();`);
  await prendre(page,'47-profil',`${fermer}ouvrirEditionProfil();`);
  await prendre(page,'48-profil-repartition',`(function(){var e=document.getElementById('pf-rep-breakfast');if(e)e.scrollIntoView({block:'center'});})();`);
  await prendre(page,'49-quoi-de-neuf',`${fermer}montrerNouveautes();`);
  await prendre(page,'50-tutoriel',`${fermer}S.mainTab='accueil';render();${haut}lancerTuto();`,{attente:1200});
  await prendre(page,'51-tutoriel-2',`tutoSuivant();`,{attente:1200});
  if(logs.length)console.log(logs.slice(0,8).join('\n'));
  await b.close();srv.close();
})().catch(e=>{console.error(e);process.exit(1);});
