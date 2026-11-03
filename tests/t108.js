// Suivi du jour : bandeau de la semaine, cartes par repas, moment obligatoire, repartition reglable (02/11/2026, demande de Liam)
const {sb,docEl}=require('./sb.js');
const vm=require('vm');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const S=sb.S;
const src=fs.readFileSync('index.html','utf8');
const J=n=>X('shiftDate(S.today,'+n+')');
const R=(slot,nom,kcal,prot,extra)=>Object.assign({rid:'r_'+nom,name:nom,mult:1,slot:slot,macros:{kcal:kcal,prot:prot,gluc:30,lip:10}},extra||{});
const prepa=()=>{
  X("TARGETS={kcal:2310,prot:175,gluc:208,lip:80};S.profil={prenom:'T',objectif:'perte'};S.inv={frigo:[],placards:[],congelateur:[],epices:[]};S.dayMeals={};S.displayDate=S.today;S.mainTab='recipes';_menuMoment=null;");
};
const html=()=>X('renderMacros()');
/* une carte : de son debut a la carte suivante (ou a la fin de la liste) */
const carte=(h,id)=>{
  const i=h.indexOf('<div class="carte-moment" data-moment="'+id+'"');if(i<0)return null;
  const j=h.indexOf('<div class="carte-moment"',i+10);return h.slice(i,j<0?h.length:j);
};
const bouton=(h,d)=>{const m=h.match(new RegExp('<button data-action="jour-bandeau" data-val="'+d+'"[^>]*>(.*?)</button>'));return m?m[0]:null;};
const clic=(action,val)=>X('_onActionClick')({target:{closest:s=>s==='[data-action]'?{dataset:{action:action,val:val}}:null},preventDefault(){},stopPropagation(){}});
const alertes=[];const alerteAvant=sb.alert;sb.alert=m=>{alertes.push(String(m));};

console.log('\n=== LXXVIII. Suivi : bandeau de la semaine ===');
t('*** huit jours, de J−6 a demain, a la place des fleches ***',()=>{
  prepa();const h=html();
  const vals=(h.match(/data-action="jour-bandeau" data-val="([^"]+)"/g)||[]).map(s=>s.slice(-11,-1));
  eq(vals.length,8,'jours');eq(vals[0],J(-6));eq(vals[6],X('S.today'));eq(vals[7],J(1));
  if(!/<span class="bj-j">dem\.<\/span>/.test(bouton(h,J(1))))throw new Error('demain');
  if(/prev-day|next-day|navBtn/.test(src))throw new Error('fleches encore la');
});
t('jour affiche plein (dore), aujourd\'hui entoure de dore',()=>{
  prepa();X('S.displayDate=shiftDate(S.today,-2)');const h=html();
  if(!/class="bj on" aria-pressed="true"/.test(bouton(h,J(-2))))throw new Error('jour affiche');
  if(!/class="bj auj" aria-pressed="false"/.test(bouton(h,X('S.today'))))throw new Error('aujourd\'hui');
  if(!/\.bj\.on \{ background: var\(--gold\);/.test(src)||!/\.bj\.auj \{ border-color: var\(--gold\); \}/.test(src))throw new Error('styles');
});
t('*** points : etat du calendrier pour les jours passes, dore des qu\'un repas est saisi aujourd\'hui ou demain ***',()=>{
  prepa();
  S.dayMeals[J(-1)]=[R('lunch','a',2300,150)];   /* dans la cible */
  S.dayMeals[J(-2)]=[R('lunch','b',3000,150)];   /* au-dessus */
  S.dayMeals[J(-3)]=[R('lunch','c',1700,150)];   /* en dessous */
  S.dayMeals[J(-4)]=[R('lunch','d',800,50)];     /* incomplete */
  S.dayMeals[X('S.today')]=[R('breakfast','e',400,30)];
  X('S.displayDate=shiftDate(S.today,-6)');const h=html();
  const pt=d=>(bouton(h,d).match(/<span class="bj-pt"( style="[^"]*")?><\/span>/)||[])[1]||'';
  if(pt(J(-1)).indexOf('background:var(--green)')<0)throw new Error('cible '+pt(J(-1)));
  if(pt(J(-2)).indexOf('background:var(--orange)')<0)throw new Error('dessus');
  if(pt(J(-3)).indexOf('background:var(--blue)')<0)throw new Error('dessous');
  if(pt(J(-4)).indexOf('border:1px solid var(--text3)')<0)throw new Error('incomplete : point creux');
  eq(pt(J(-5)),'','rien saisi : pas de point');
  if(pt(X('S.today')).indexOf('background:var(--gold)')<0)throw new Error('aujourd\'hui');
  eq(pt(J(1)),'','demain vide');
  eq(pt(J(-6)),'','le jour affiche n\'a pas de point');
  if(bouton(h,J(-2)).indexOf('aria-label="')<0||bouton(h,J(-2)).indexOf('au-dessus de la cible"')<0)throw new Error('libelle accessible');
});
t('*** toucher un jour l\'ouvre ; hors de la fenetre ou invalide : rien ***',()=>{
  prepa();clic('jour-bandeau',J(-3));eq(X('S.displayDate'),J(-3));
  clic('jour-bandeau',J(-7));eq(X('S.displayDate'),J(-3),'J-7');
  clic('jour-bandeau',J(2));eq(X('S.displayDate'),J(-3),'J+2');
  clic('jour-bandeau','pas-une-date');eq(X('S.displayDate'),J(-3));
  clic('jour-bandeau',J(1));eq(X('S.displayDate'),J(1),'demain');
});

console.log('\n=== LXXIX. Suivi : une carte par repas ===');
t('*** quatre cartes dans l\'ordre de la journee ; part de la cible par defaut 24/30/30/16 ***',()=>{
  prepa();const h=html();
  eq((h.match(/<div class="carte-moment" data-moment="([a-z]+)"/g)||[]).map(s=>s.match(/"([a-z]+)"$/)[1]).join(','),'breakfast,lunch,dinner,snack');
  [['breakfast',554],['lunch',693],['dinner',693],['snack',370]].forEach(([m,k])=>{if(carte(h,m).indexOf('<span class="cm-part">/ '+k+' kcal</span>')<0)throw new Error(m+' : '+k);});
  if(h.indexOf('Aucun repas enregistré')>=0)throw new Error('ancien message');
});
t('carte vide : « Rien pour l\'instant » et « + Ajouter » ; jour passe : « Rien de noté »',()=>{
  prepa();let c=carte(html(),'dinner');
  if(c.indexOf('Rien pour l\'instant')<0)throw new Error('aujourd\'hui');
  if(!/<button class="cm-ajout" data-action="ajout-moment" data-val="dinner" aria-label="Ajouter au dîner"[^>]*>\+ Ajouter<\/button>/.test(c))throw new Error('bouton');
  if(c.indexOf('cm-plus')>=0)throw new Error('+ de l\'en-tete sur une carte vide');
  X('S.displayDate=shiftDate(S.today,-1)');c=carte(html(),'snack');
  if(c.indexOf('Rien de noté')<0||c.indexOf('à la collation')<0)throw new Error('jour passe');
});
t('*** au-dessus de la part : jaune citron, sans message ; jamais de rouge ***',()=>{
  prepa();S.dayMeals[X('S.today')]=[R('lunch','Burger',800,60)];
  const c=carte(html(),'lunch');
  if(c.indexOf('data-etat="dessus"')<0||c.indexOf('color:var(--citron);">800</span>')<0||c.indexOf('background:var(--citron);')<0)throw new Error(c.slice(0,400));
  if(/cm-bravo|--red/.test(c))throw new Error('message ou rouge');
  if(/<button class="cm-plus" data-action="ajout-moment" data-val="lunch"/.test(c)===false)throw new Error('+ de l\'en-tete');
});
t('*** dans la part avec les proteines qui vont avec : vert clair et un mot ***',()=>{
  prepa();S.dayMeals[X('S.today')]=[R('lunch','Poulet riz',650,50)];   /* part 693 kcal, 53 g : 90 % = 47,7 */
  const c=carte(html(),'lunch');
  if(c.indexOf('data-etat="bien"')<0||c.indexOf('color:var(--menthe);">650</span>')<0||c.indexOf('background:var(--menthe);')<0)throw new Error(c.slice(0,400));
  if(c.indexOf('<div class="cm-bravo">Bien joué : dans la part prévue, avec 50 g de protéines.</div>')<0)throw new Error('message');
  if(c.indexOf('<span class="cm-p">50<span>/53 g</span></span>')<0)throw new Error('proteines');
});
t('dans la part mais peu de proteines : couleur du moment, sans message',()=>{
  prepa();S.dayMeals[X('S.today')]=[R('lunch','Pates',650,30)];
  const c=carte(html(),'lunch');
  if(c.indexOf('data-etat="neutre"')<0||c.indexOf('background:#6FBF73;')<0||c.indexOf('cm-bravo')>=0)throw new Error(c.slice(0,400));
});
t('limites : 5 % au-dessus de la part reste dans la part ; 90 % des proteines suffisent',()=>{
  eq(X('_etatMoment(727,60,693,53)'),'bien','727 <= 693 x 1,05');eq(X('_etatMoment(728,60,693,53)'),'dessus');
  eq(X('_etatMoment(600,47.7,693,53)'),'bien');eq(X('_etatMoment(600,47,693,53)'),'neutre');
  eq(X('_etatMoment(100,50,693,53)'),'bien','en dessous de la part, proteines au rendez-vous');
});
t('*** plusieurs repas d\'un moment additionnes, dessert et extras compris ***',()=>{
  prepa();S.dayMeals[X('S.today')]=[R('lunch','Riz',400,20,{extras:[{name:'Skyr',kcal:100,prot:15,gluc:5,lip:0}]}),R('dinner','Soupe',300,10),R('lunch','Pomme',150,10)];
  const c=carte(html(),'lunch');
  if(c.indexOf('>650</span>')<0||c.indexOf('<span class="cm-p">45<span>/53 g')<0)throw new Error(c.slice(0,300));
  if(c.indexOf('>Riz + Skyr')<0||c.indexOf('>Pomme')<0||c.indexOf('>Soupe')>=0)throw new Error('repas mal ranges');
  if(!/data-action="edit-meal" data-day="[^"]+" data-idx="2"/.test(c))throw new Error('index reel du repas');
});
t('un moment inconnu passe dans « Sans moment », sans part de cible',()=>{
  prepa();S.dayMeals[X('S.today')]=[R('brunch','Brunch',500,20)];const c=carte(html(),'aucun');
  if(!c||c.indexOf('>Brunch')<0||c.indexOf('cm-barre')>=0||c.indexOf('data-action="ajout-moment"')>=0)throw new Error(c);
});
t('les couleurs d\'etat se distinguent des couleurs des moments',()=>{
  const v=n=>(src.match(new RegExp('--'+n+': (#[0-9A-F]{6});','i'))||[])[1];
  const cit=v('citron'),men=v('menthe');if(!cit||!men)throw new Error('variables');
  const autres=X('MOMENTS.map(function(m){return m.couleur})').concat([v('lime'),v('warn'),v('gold'),v('green')]).map(x=>x.toUpperCase());
  if(autres.indexOf(cit.toUpperCase())>=0||autres.indexOf(men.toUpperCase())>=0)throw new Error('couleur en double');
});

console.log('\n=== LXXX. Repartition par repas ===');
t('*** reglage du profil ; un reglage invalide revient au defaut ***',()=>{
  prepa();X("S.profil.repartition={breakfast:25,lunch:35,dinner:32,snack:8}");let h=html();
  [['breakfast',578],['lunch',809],['dinner',739],['snack',185]].forEach(([m,k])=>{if(carte(h,m).indexOf('/ '+k+' kcal')<0)throw new Error(m+' : '+k);});
  [{breakfast:25,lunch:35,dinner:32,snack:7},{breakfast:'25',lunch:35,dinner:32,snack:8},{breakfast:-5,lunch:45,dinner:52,snack:8},{breakfast:25.5,lunch:34.5,dinner:32,snack:8},null].forEach(r=>{
    sb.__r=r;X('S.profil.repartition=__r');eq(X('_partMoment("breakfast")'),0.24,JSON.stringify(r));});
});
t('*** « Modifier le profil » : section Repartition par repas, total en direct ***',()=>{
  prepa();X("S.profil={prenom:'Liam',taille:183,poids:104,naissance:'1999-01-15',sexe:'H',objectif:'perte',cibles:{kcal:2310,prot:175,gluc:208,lip:80},repartition:{breakfast:25,lunch:35,dinner:32,snack:8}}");
  X('ouvrirEditionProfil()');const p=docEl('profil-panneau').innerHTML;
  if(p.indexOf('>Répartition par repas</div>')<0||p.indexOf('Cibles')>p.indexOf('Répartition par repas'))throw new Error('section');
  [['breakfast',25],['lunch',35],['dinner',32],['snack',8]].forEach(([m,v])=>{if(!new RegExp('<input id="pf-rep-'+m+'" type="number" value="'+v+'"').test(p))throw new Error(m);});
  if(p.indexOf('Revenir à 24 / 30 / 30 / 16')<0)throw new Error('retour au defaut');
  docEl('pf-kcal').value='2310';[['breakfast',25],['lunch',35],['dinner',32],['snack',8]].forEach(([m,v])=>{docEl('pf-rep-'+m).value=String(v);});
  X('majRepartition()');eq(docEl('pf-rep-total').textContent,'Total 100 % · soit 578 / 809 / 739 / 185 kcal');
  docEl('pf-rep-snack').value='10';X('majRepartition()');eq(docEl('pf-rep-total').textContent,'Total 102 % : 2 % de trop pour arriver à 100 %.');
  docEl('pf-rep-snack').value='4';X('majRepartition()');eq(docEl('pf-rep-total').textContent,'Total 96 % : il manque 4 % pour arriver à 100 %.');
  X('repartitionParDefaut()');eq(docEl('pf-rep-breakfast').value,'24');eq(docEl('pf-rep-snack').value,'16');
});
const remplir=(r)=>{
  docEl('pf-prenom').value='Liam';docEl('pf-taille').value='183';docEl('pf-poids').value='104';docEl('pf-naissance').value='1999-01-15';
  docEl('pf-sexe').value='H';docEl('pf-objectif').value='perte';docEl('pf-kcal').value='2310';docEl('pf-prot').value='175';docEl('pf-gluc').value='208';docEl('pf-lip').value='80';
  ['breakfast','lunch','dinner','snack'].forEach((m,i)=>{docEl('pf-rep-'+m).value=r?String(r[i]):'';});
};
t('*** enregistrer : un total different de 100 est refuse et rien ne change ***',()=>{
  X("S.profil={prenom:'Avant',repartition:{breakfast:25,lunch:35,dinner:32,snack:8}}");X('ouvrirEditionProfil()');docEl('pf-err').innerHTML='';
  remplir([30,30,30,30]);X('enregistrerProfil()');
  if(docEl('pf-err').innerHTML.indexOf('pour un total de 100 % (là : 120 %)')<0)throw new Error(docEl('pf-err').innerHTML);
  eq(S.profil.prenom,'Avant');eq(JSON.stringify(S.profil.repartition),'{"breakfast":25,"lunch":35,"dinner":32,"snack":8}');
});
t('enregistrer : un reglage valide est garde ; la repartition par defaut n\'est pas recopiee',()=>{
  X("S.profil={prenom:'Avant'}");X('ouvrirEditionProfil()');remplir([20,40,30,10]);X('enregistrerProfil()');
  eq(JSON.stringify(S.profil.repartition),'{"breakfast":20,"lunch":40,"dinner":30,"snack":10}');eq(S.profil.prenom,'Liam');
  X('ouvrirEditionProfil()');remplir([24,30,30,16]);X('enregistrerProfil()');eq(S.profil.repartition,undefined,'defaut');
  X("S.profil.repartition={breakfast:20,lunch:40,dinner:30,snack:10}");X('ouvrirEditionProfil()');remplir(null);X('enregistrerProfil()');eq(S.profil.repartition,undefined,'champs vides');
});
t('*** mon compte (Liam) : 25/35/32/8 une seule fois, jamais par-dessus un reglage ***',()=>{
  X("ACTIVE_PROFILE='users/u1';S.catalogue=null;");
  X("_applyState({_profile:ACTIVE_PROFILE,catalogue:'liam',profil:{prenom:'Liam'},inv:{},dayMeals:{}})");
  eq(JSON.stringify(S.profil.repartition),'{"breakfast":25,"lunch":35,"dinner":32,"snack":8}');eq(X('S.repartLiam'),true);
  X("_applyState({_profile:ACTIVE_PROFILE,catalogue:'liam',repartLiam:true,profil:{prenom:'Liam'},inv:{},dayMeals:{}})");
  eq(S.profil.repartition,undefined,'deja fait : un retour au defaut reste');
  X("_applyState({_profile:ACTIVE_PROFILE,catalogue:'liam',profil:{prenom:'Liam',repartition:{breakfast:20,lunch:40,dinner:30,snack:10}},inv:{},dayMeals:{}})");
  eq(S.profil.repartition.lunch,40,'reglage garde');
  X("S.catalogue=null");X("_applyState({_profile:ACTIVE_PROFILE,profil:{prenom:'Ana'},inv:{},dayMeals:{}})");
  eq(S.profil.repartition,undefined,'autre compte');eq(X('S.repartLiam'),false);
  if(!/repartLiam:!!S\.repartLiam,/.test(src))throw new Error('drapeau non enregistre');
});

console.log('\n=== LXXXI. Chaque repas a un moment ===');
t('*** moment propose : le premier qui manque ; les quatre pris : selon l\'heure aujourd\'hui, collation un autre jour ***',()=>{
  prepa();eq(X('_momentDefaut(S.today)'),'breakfast');
  S.dayMeals[X('S.today')]=[R('breakfast','a',300,20),R('dinner','b',300,20)];eq(X('_momentDefaut(S.today)'),'lunch');
  const tout=['breakfast','lunch','dinner','snack'].map(s=>R(s,s,300,20));S.dayMeals[X('S.today')]=tout;S.dayMeals[J(-1)]=tout;
  X('var __h=heureProfil;');
  try{[[3,'snack'],[4,'breakfast'],[10,'breakfast'],[11,'lunch'],[15,'lunch'],[16,'snack'],[18,'dinner'],[22,'dinner'],[23,'snack']].forEach(([hh,m])=>{
      X('heureProfil=function(){return '+hh+';}');eq(X('_momentDefaut(S.today)'),m,hh+' h');});
    X('heureProfil=function(){return 20;}');eq(X('_momentDefaut(shiftDate(S.today,-1))'),'snack','autre jour');
  }finally{X('heureProfil=__h;');}
});
t('*** « + Ajouter » d\'une carte : le volet annonce le moment, l\'ajout le reprend ***',()=>{
  prepa();clic('ajout-moment','dinner');
  eq(docEl('menu-ajout').style.display,'flex');
  if(docEl('menu-ajout-corps').innerHTML.indexOf('>Pour le dîner d\'aujourd\'hui</div>')<0)throw new Error(docEl('menu-ajout-corps').innerHTML.slice(0,300));
  X("menuAjoutAction('texte')");eq(X('_amSlot'),'dinner','petit-dejeuner propose sinon');eq(X('_menuMoment'),null);
  clic('ajout-moment','pas-un-moment');eq(X('_menuMoment'),null);
});
t('le bouton + general n\'impose rien ; fermer le volet oublie le moment ; un autre jour est nomme',()=>{
  prepa();X("ouvrirMenuAjout('snack')");X('fermerMenuAjout()');eq(X('_menuMoment'),null);
  X('ouvrirMenuAjout()');if(docEl('menu-ajout-corps').innerHTML.indexOf('menu-ajout-moment')>=0)throw new Error('moment impose');
  X("menuAjoutAction('texte')");eq(X('_amSlot'),'breakfast');
  X("S.displayDate=shiftDate(S.today,-1);ouvrirMenuAjout('lunch')");if(docEl('menu-ajout-corps').innerHTML.indexOf('Pour le déjeuner d\'hier')<0)throw new Error('hier');
  X('fermerMenuAjout()');
});
t('*** « Refaire un repas habituel » depuis une carte : le repas prend ce moment ***',()=>{
  prepa();S.dayMeals[J(-1)]=[R('breakfast','Porridge',400,30),R(null,'Vieux',300,10)];
  X("ouvrirMenuAjout('snack');refaireRepas(shiftDate(S.today,-1),0)");eq(S.dayMeals[X('S.today')][0].slot,'snack');
  X("ouvrirMenuAjout();refaireRepas(shiftDate(S.today,-1),0)");eq(S.dayMeals[X('S.today')][1].slot,'breakfast','moment du repas d\'origine');
  X("ouvrirMenuAjout();refaireRepas(shiftDate(S.today,-1),1)");eq(S.dayMeals[X('S.today')][2].slot,'lunch','sans moment : le premier qui manque');
});
t('*** saisie : plus de deselection ; l\'analyse garde le moment choisi ***',()=>{
  prepa();X("openAddMeal('text')");eq(X('_amSlot'),'breakfast');
  X("setAmSlot('dinner');setAmSlot('dinner')");eq(X('_amSlot'),'dinner');
  X("setAmSlot('n_importe')");eq(X('_amSlot'),'dinner');
  X("_pendingMeal={name:'Soupe',kcal:300,prot:10,gluc:30,lip:8};applyPendingMealToConfirm()");eq(X('_amSlot'),'dinner','remplace par le prochain moment avant');
  X("openAddMeal('text','snack')");eq(X('_amSlot'),'snack','moment impose');
});
t('*** un repas sans moment est refuse, avant tout retrait du stock ***',()=>{
  prepa();X("S.inv.frigo=[{id:'riz',name:'Riz',qty:500,unit:'g',mac100:{kcal:350,prot:7,gluc:77,lip:1}}]");
  X("openAddMeal('text');_addMealInvMode=true;_addMealFreeItems=[];_addMealInvSuggestions=[{id:'riz',name:'Riz',qty:100,unit:'g',src:'pick'}];_amSlot=null;");
  docEl('inv-cb-0').checked=true;docEl('inv-qty-0').value='100';docEl('addmeal-name').value='Riz';docEl('addmeal-kcal').value='350';
  alertes.length=0;X('confirmAddMealFinal()');
  eq((S.dayMeals[X('S.today')]||[]).length,0,'repas enregistre');eq(S.inv.frigo[0].qty,500,'stock');
  if(!/^Choisis le moment du repas/.test(alertes[0]||''))throw new Error('message : '+alertes[0]);
  X("_amSlot='lunch'");X('confirmAddMealFinal()');eq(S.dayMeals[X('S.today')][0].slot,'lunch');eq(S.inv.frigo[0].qty,400);
});
t('*** cuisson : « dessert » n\'est pas un moment ; la portion du lendemain garde le moment ***',()=>{
  prepa();S.inv.frigo=[{id:'riz_108',name:'Riz 108',qty:1000,unit:'g',mac100:{kcal:350,prot:7,gluc:77,lip:1}}];
  X("for(var i=RCP.length-1;i>=0;i--)if(RCP[i].id==='t108_r')RCP.splice(i,1)");
  X('RCP').push({id:'t108_r',name:'Riz au lait',slots:['dessert'],time:10,used:[{id:'riz_108',qty:100}]});
  S.dayMeals[X('S.today')]=[R('breakfast','a',300,20)];
  X("openConfirmCook('t108_r',2,S.today,false)");eq(X('_ccMoment'),'lunch','premier moment qui manque');
  X("setCcMoment('dessert')");eq(X('_ccMoment'),'lunch');X("setCcMoment('snack')");
  X('_cc').ings.forEach((g,i)=>{docEl('cc-'+i).value=String(g.qty);});X('executeCook()');
  eq(S.dayMeals[X('S.today')][1].slot,'snack');eq(S.dayMeals[J(1)][0].slot,'snack','portion du lendemain');
  X("for(var i=RCP.length-1;i>=0;i--)if(RCP[i].id==='t108_r')RCP.splice(i,1)");
});
t('*** modifier un ancien repas sans moment : il faut en choisir un ***',()=>{
  prepa();S.dayMeals[X('S.today')]=[{rid:'x',name:'Vieux',mult:1,macros:{kcal:300,prot:20,gluc:30,lip:8}}];
  X('openEditMeal(S.today,0)');if(docEl('em-moments').innerHTML.indexOf('Choisis le moment de ce repas.')<0)throw new Error('aide');
  docEl('em-name').value='Nouveau';alertes.length=0;X('saveEditMeal()');
  const m=S.dayMeals[X('S.today')][0];eq(m.name,'Vieux','modifie quand meme');eq(m.slot,undefined);
  if(!/^Choisis le moment du repas/.test(alertes[0]||''))throw new Error('message');
  X("setEmMoment('snack')");if(docEl('em-moments').innerHTML.indexOf('Choisis le moment')>=0)throw new Error('aide restee');
  X('saveEditMeal()');eq(S.dayMeals[X('S.today')][0].slot,'snack');eq(S.dayMeals[X('S.today')][0].name,'Nouveau');
  S.dayMeals[X('S.today')]=[R('dejeuner','Ancien',300,20)];X('openEditMeal(S.today,0)');
  if(docEl('em-moments').innerHTML.indexOf('Choisis le moment de ce repas.')<0)throw new Error('moment inconnu : aide absente');
});
t('tutoriel : l\'etape « Ta journée » parle de la semaine et des repas par moment',()=>{
  if(X("TUTO.filter(function(e){return e.sel==='#daypane'})[0].txt").indexOf('la semaine en haut')<0)throw new Error('texte');
});

sb.alert=alerteAvant;
console.log('---- '+pass+' ok, '+fail+' KO');
