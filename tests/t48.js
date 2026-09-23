const {sb,reg,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
async function t(n,f){try{await f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S,G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');
// Stockage local qui persiste, pour la session
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
// Faux serveurs Google et Firebase
let appels=[],base={};
function serveur(reponses){
  appels=[];
  sb.fetch=async function(url,opt){
    appels.push({url:url,method:(opt&&opt.method)||'GET',body:opt&&opt.body});
    for(const r of reponses){if(r.m.test(url)&&(!r.meth||r.meth===((opt&&opt.method)||'GET')))
      return {ok:r.ok!==false,status:r.status||200,json:async()=>typeof r.d==='function'?r.d(url,opt):r.d};}
    return {ok:true,status:200,json:async()=>null};
  };
}
const JETON={localId:'UID123',idToken:'tokA',refreshToken:'rtokA',expiresIn:'3600'};

(async()=>{
console.log('\n=== GH. Identifiants ===');
await t('*** identifiants valides et invalides ***',()=>{
  ['liam','liam.dorayaki','l_m-27'].forEach(x=>{if(!G('loginValide')(x))throw new Error(x+' refuse');});
  ['','ab','a b','éric','-liam','x'.repeat(31),'liam@x','@mail.fr'].forEach(x=>{if(G('loginValide')(x))throw new Error('"'+x+'" accepte');});
});
await t('l\'identifiant devient une adresse technique en minuscules',()=>eq(G('_emailDe')('  Liam '),'liam@dorayaki.app'));
await t('*** les erreurs de Google sont traduites ***',()=>{
  const m=G('_msgErreurAuth');
  if(!/déjà pris/.test(m('EMAIL_EXISTS')))throw new Error('EMAIL_EXISTS');
  if(!/incorrect/.test(m('INVALID_LOGIN_CREDENTIALS')))throw new Error('INVALID_LOGIN_CREDENTIALS');
  if(!/6 caractères/.test(m('WEAK_PASSWORD : Password should be at least 6 characters')))throw new Error('WEAK_PASSWORD');
  if(!/pas activée/.test(m('OPERATION_NOT_ALLOWED')))throw new Error('OPERATION_NOT_ALLOWED');
});
await t('un identifiant inconnu et un mauvais mot de passe donnent le meme message',()=>{
  eq(G('_msgErreurAuth')('EMAIL_NOT_FOUND'),G('_msgErreurAuth')('INVALID_PASSWORD'));
});

console.log('\n=== GI. Connexion et session ===');
await t('*** une connexion reussie ouvre une session durable ***',async()=>{
  serveur([{m:/signInWithPassword/,d:JETON}]);
  await G('connexion')('Liam','secret1');
  const s=G('sessionActive')();
  eq(s.uid,'UID123');eq(s.login,'liam');
  const b=JSON.parse(appels[0].body);
  eq(b.email,'liam@dorayaki.app');eq(b.password,'secret1');
});
await t('*** le mot de passe n\'est jamais stocke ***',()=>{
  if(JSON.stringify(LS).indexOf('secret1')>=0)throw new Error('mot de passe en clair dans le stockage local');
});
await t('un echec de connexion remonte le code de Google',async()=>{
  serveur([{m:/signInWithPassword/,ok:false,status:400,d:{error:{message:'INVALID_LOGIN_CREDENTIALS'}}}]);
  let msg='';try{await G('connexion')('liam','faux');}catch(e){msg=e.message;}
  eq(msg,'INVALID_LOGIN_CREDENTIALS');
});
await t('*** avec une session, le jeton vient du compte, jamais de l\'anonyme ***',async()=>{
  LS.dz_auth=JSON.stringify({uid:'UID123',rtok:'rtokA',login:'liam'});
  G('__resetTok')();
  serveur([{m:/securetoken/,d:{id_token:'tokCompte',expires_in:'3600',refresh_token:'rtokB'}}]);
  const tok=await G('fbAuthToken')();
  eq(tok,'tokCompte');
  if(appels.some(a=>/accounts:signUp/.test(a.url)))throw new Error('repli anonyme utilise');
  eq(JSON.parse(LS.dz_auth).rtok,'rtokB','jeton de rafraichissement non mis a jour');
});
await t('un jeton de compte refuse ne declenche pas de repli anonyme',async()=>{
  G('__resetTok')();
  serveur([{m:/securetoken/,ok:false,status:400,d:{}}]);
  const tok=await G('fbAuthToken')();
  eq(tok,null);
  if(appels.some(a=>/accounts:signUp/.test(a.url)))throw new Error('repli anonyme');
});

console.log('\n=== GJ. Code de rattachement ===');
await t('*** le bon code est reconnu, casse et espaces ignores ***',async()=>{
  if(!(await G('codeRattachementValide')(' vhpq-u2gl-9c7w-qkqa ')))throw new Error('code refuse');
});
await t('un mauvais code est refuse',async()=>{
  if(await G('codeRattachementValide')('AAAA-BBBB-CCCC-DDDD'))throw new Error('accepte');
  if(await G('codeRattachementValide')(''))throw new Error('vide accepte');
});
await t('*** le code n\'apparait jamais en clair dans le source ***',()=>{
  if(/VHPQ-U2GL-9C7W-QKQA/i.test(src))throw new Error('code en clair');
});

console.log('\n=== GK. Rapatriement de l\'ancien profil ===');
await t('*** l\'ancien profil est copie dans le compte, reetiquete ***',async()=>{
  LS.dz_auth=JSON.stringify({uid:'UID123',rtok:'rtokA',login:'liam'});
  sb.window._fbTok='tok';sb.window._fbTokExp=Date.now()+3600000;
  serveur([
    {m:/\/liam\/state\.json/,meth:'GET',d:{_profile:'liam',rev:42,inv:{frigo:[{id:'p',name:'Poulet',qty:500}]},dayMeals:{'2026-09-01':[{rid:'x'}]},groqKey:'k'}},
    {m:/\/liam\/burn\.json/,meth:'GET',d:{'2026-09-01':{steps:12000}}},
    {m:/\/liam\/photos\.json/,meth:'GET',d:{a:'data:image/jpeg;base64,AAAA',b:'x" onerror="1'}}
  ]);
  await G('rattacherAncienProfil')('users/UID123',{prenom:'Liam',emoji:'🔥'});
  const put=n=>appels.find(a=>a.method==='PUT'&&new RegExp('users/UID123/'+n+'\\.json').test(a.url));
  const st=JSON.parse(put('state').body);
  eq(st._profile,'users/UID123','etiquette non reecrite : l\'etat serait ignore');
  eq(st.catalogue,'liam','les recettes du catalogue disparaitraient');
  eq(st.tz,'Europe/Paris');eq(st.pasBase,9679);
  eq(st.profil.prenom,'Liam');eq(st.inv.frigo[0].name,'Poulet');eq(st.groqKey,'k');
  eq(JSON.parse(put('burn').body)['2026-09-01'].steps,12000);
  eq(Object.keys(JSON.parse(put('photos').body)).join(','),'a','photo piegee non filtree');
});
await t('*** rien n\'est ecrit ni supprime dans l\'ancien profil ***',()=>{
  if(appels.some(a=>/\/liam\//.test(a.url)&&a.method!=='GET'))throw new Error('ecriture dans l\'ancien profil');
});
await t('un ancien profil introuvable interrompt proprement',async()=>{
  serveur([{m:/\/liam\/state\.json/,d:null}]);
  let msg='';try{await G('rattacherAncienProfil')('users/UID123',null);}catch(e){msg=e.message;}
  if(!/introuvable/.test(msg))throw new Error('pas d\'erreur : '+msg);
  if(appels.some(a=>a.method==='PUT'))throw new Error('ecriture malgre l\'echec');
});

console.log('\n=== GL. Nouveau compte ===');
await t('*** un nouveau compte demarre vide, sans les donnees de demo ***',async()=>{
  serveur([{m:/securetoken/,d:{id_token:'t',expires_in:'3600'}},{m:/users\/NEW\/state/,d:{}}]);
  await G('_initNouveauProfil')('users/NEW',{prenom:'Ana',pas:7000});
  const w=appels.find(a=>a.method==='PUT'&&/users\/NEW\/state/.test(a.url));
  if(!w)throw new Error('aucune ecriture');
  const st=JSON.parse(w.body);
  eq(Object.values(st.inv).reduce((n,a)=>n+a.length,0),0,'inventaire non vide');
  eq(Object.keys(st.dayMeals).length,0);
  eq(st.catalogue,null);eq(st.pasBase,7000);eq(st._profile,'users/NEW');
});
await t('*** ouvrir un compte ne charge jamais l\'inventaire de demo ***',()=>{
  sb.fetch=async()=>({ok:true,json:async()=>null});
  G('selectProfile')('users/NEW');
  eq(Object.values(S.inv).reduce((n,a)=>n+(a||[]).length,0),0);
  eq(Object.keys(S.dayMeals).length,0);
});
await t('*** un compte sans catalogue ne voit pas les recettes historiques ***',()=>{
  S.catalogue=null;
  const perso=(sb.RCP||[]).filter(r=>r.profile==='liam');
  if(!perso.length)throw new Error('jeu de test vide');
  if(perso.some(r=>G('recetteVisible')(r)))throw new Error('recette historique visible');
  const communes=(sb.RCP||[]).filter(r=>!r.profile);
  if(communes.some(r=>!G('recetteVisible')(r)))throw new Error('recette commune masquee');
});
await t('*** avec le catalogue rattache, elles reapparaissent ***',()=>{
  S.catalogue='liam';
  if((sb.RCP||[]).filter(r=>r.profile==='liam').some(r=>!G('recetteVisible')(r)))throw new Error('recettes masquees');
  S.catalogue=null;
});

console.log('\n=== GM. Cibles ===');
await t('*** calcul coherent pour un profil type ***',()=>{
  S.today='2026-09-23';
  const c=G('calculerCibles')({sexe:'H',naissance:'1999-01-15',taille:183,poids:104.7,activite:'3',objectif:'perte',poidsVise:88});
  if(c.kcal<2300||c.kcal>2800)throw new Error('kcal '+c.kcal);
  eq(c.prot,Math.round(1.8*88));
  const tot=c.prot*4+c.gluc*4+c.lip*9;
  if(Math.abs(tot-c.kcal)>12)throw new Error('macros incoherentes : '+tot+' pour '+c.kcal);
});
await t('la prise de masse depasse la maintenance, la perte reste dessous',()=>{
  const b={sexe:'F',naissance:'1995-05-05',taille:165,poids:60,activite:'2'};
  const m=G('calculerCibles')(Object.assign({objectif:'maintien'},b)).kcal;
  if(!(G('calculerCibles')(Object.assign({objectif:'prise'},b)).kcal>m))throw new Error('prise');
  if(!(G('calculerCibles')(Object.assign({objectif:'perte'},b)).kcal<m))throw new Error('perte');
});
await t('jamais sous 1200 kcal, et rien sans donnees',()=>{
  const c=G('calculerCibles')({sexe:'F',naissance:'1940-01-01',taille:140,poids:35,activite:'1',objectif:'perte'});
  if(c.kcal<1200)throw new Error(c.kcal);
  eq(G('calculerCibles')({}),null);
});
await t('*** des cibles saisies prevalent, des cibles invalides sont ignorees ***',()=>{
  S.catalogue=null;
  S.profil={cibles:{kcal:2400,prot:160,gluc:250,lip:75}};
  eq(G('_ciblesProfil')().kcal,2400);
  S.profil={cibles:{kcal:'abc',prot:NaN}};
  const c=G('_ciblesProfil')();
  if(!(c.kcal>=800))throw new Error('cibles invalides retenues');
  S.profil=null;
});

console.log('\n=== GN. Profil ===');
await t('le nom affiche reprend icone et prenom',()=>{
  S.profil={prenom:'Ana',emoji:'🦊'};eq(G('_nomAffiche')(),'🦊 Ana');S.profil=null;
});
await t('*** allergies et equipement partent dans le prompt ***',()=>{
  S.profil={regime:'vegetarien',allergies:['Arachides'],equipement:['Micro-ondes','Plaques'],temps:'15',eviter:'coriandre'};
  const c=G('_contexteProfil')();
  ['Végétarien','Arachides','Micro-ondes','15 min','coriandre'].forEach(x=>{if(c.indexOf(x)<0)throw new Error(x+' absent');});
  if(!/_contexteProfil\(\)/.test(src.slice(src.indexOf('const diet='),src.indexOf('const diet=')+500)))throw new Error('non injecte dans le prompt');
  S.profil=null;
});
await t('*** la validation bloque les valeurs absurdes ***',()=>{
  S.today='2026-09-23';
  const e=G('validerProfil')({prenom:'',taille:30,poids:900,naissance:'2020-01-01'});
  if(e.length<4)throw new Error(e.join(' | '));
  eq(G('validerProfil')({prenom:'Ana',taille:165,poids:60,naissance:'1995-05-05'}).length,0);
});
await t('*** enregistrer un profil invalide ne touche a rien ***',()=>{
  S.profil={prenom:'Avant'};
  G('ouvrirEditionProfil')();
  docEl('pf-prenom').value='';docEl('pf-taille').value='20';
  G('enregistrerProfil')();
  eq(S.profil.prenom,'Avant');
});
await t('*** un profil valide est enregistre, neutralise, et met a jour les cibles ***',()=>{
  S.today='2026-09-23';S.profil=null;
  G('ouvrirEditionProfil')();
  docEl('pf-prenom').value='<b>Liam</b>';docEl('pf-taille').value='183';docEl('pf-poids').value='104.7';
  docEl('pf-naissance').value='1999-01-15';docEl('pf-sexe').value='H';docEl('pf-objectif').value='perte';
  docEl('pf-kcal').value='2600';docEl('pf-prot').value='175';docEl('pf-gluc').value='280';docEl('pf-lip').value='80';
  G('enregistrerProfil')();
  if(/[<>]/.test(S.profil.prenom))throw new Error('prenom non neutralise');
  eq(sb.TARGETS.kcal,2600);eq(sb.TARGETS.prot,175);
});
await t('le profil, le catalogue et le fuseau partent dans l\'etat',()=>{
  if(!/profil:S\.profil\|\|null,catalogue:S\.catalogue\|\|null,tz:S\.tz\|\|null/.test(src))throw new Error('non persistes');
});

console.log('\n=== GO. Demarrage et ecrans ===');
await t('*** sans session ni ancien profil : ecran de connexion ***',()=>{
  delete LS.dz_auth;delete LS.dz_herite;
  eq(G('demarrerApp')(),'connexion');
  eq(docEl('profile-screen').style.display,'flex');
  if(!/Se connecter/.test(docEl('profile-screen').innerHTML))throw new Error('bouton absent');
  if(!/Créer un compte/.test(docEl('profile-screen').innerHTML))throw new Error('bouton absent');
});
await t('*** avec une session : ouverture directe du compte ***',()=>{
  LS.dz_auth=JSON.stringify({uid:'UID9',rtok:'r',login:'x'});
  sb.fetch=async()=>({ok:true,json:async()=>null});
  eq(G('demarrerApp')(),'compte');
  eq(sb.window.ACTIVE_PROFILE||G('__profil')&&G('__profil')(),'users/UID9');
});
await t('le passage par l\'ancien profil reste possible pendant la transition',()=>{
  delete LS.dz_auth;LS.dz_herite='1';
  eq(G('demarrerApp')(),'herite');
  delete LS.dz_herite;
});
await t('*** chaque ecran d\'inscription se rend sans erreur ***',()=>{
  G('afficherEcranConnexion')('accueil');G('_authMode')('inscription');
  for(let e=0;e<5;e++){sb.window._ins.etape=e;G('renderAuth')();
    const h=docEl('profile-screen').innerHTML;if(/undefined|NaN/.test(h.replace(/<[^>]+>/g,' ')))throw new Error('etape '+e);}
});
await t('*** un identifiant invalide bloque la premiere etape ***',async()=>{
  G('_authMode')('inscription');
  docEl('au-login').value='x';docEl('au-mdp').value='secret1';docEl('au-mdp2').value='secret1';
  await G('etapeInscription')(1);
  eq(sb.window._ins.etape,0,'etape franchie');
  if(!/Identifiant invalide/.test(docEl('profile-screen').innerHTML))throw new Error('pas de message');
});
await t('des mots de passe differents bloquent aussi',async()=>{
  G('_authMode')('inscription');
  docEl('au-login').value='ana';docEl('au-mdp').value='secret1';docEl('au-mdp2').value='secret2';
  await G('etapeInscription')(1);
  eq(sb.window._ins.etape,0);
});
await t('un bon debut passe a l\'etape suivante',async()=>{
  G('_authMode')('inscription');
  docEl('au-login').value='ana';docEl('au-mdp').value='secret1';docEl('au-mdp2').value='secret1';
  await G('etapeInscription')(1);
  eq(sb.window._ins.etape,1);
});
await t('*** le bouton de deconnexion remplace l\'ancien bouton de profil ***',()=>{
  if(!/sessionActive\(\)\?'deconnexion\(\)':'quitterProfilHerite\(\)'/.test(src))throw new Error('bouton absent de l\'en-tete');
});
await t('le bouton Modifier le profil est en bas des reglages',()=>{
  if(!/closeSettings\(\);ouvrirEditionProfil\(\)/.test(src))throw new Error('absent');
});

console.log('\n=== GP. Adresse e-mail et recuperation ===');
await t('*** une vraie adresse e-mail est acceptee telle quelle ***',()=>{
  if(!G('loginValide')('Liam.D@Mail.fr'))throw new Error('refusee');
  eq(G('_emailDe')(' Liam.D@Mail.fr '),'liam.d@mail.fr');
  eq(G('_emailDe')('liam'),'liam@dorayaki.app','un identifiant simple garde l\'adresse technique');
});
await t('*** la reinitialisation part vers une vraie adresse ***',async()=>{
  serveur([{m:/sendOobCode/,d:{email:'liam@mail.fr'}}]);
  await G('motDePasseOublie')('liam@mail.fr');
  const b=JSON.parse(appels[0].body);
  eq(b.requestType,'PASSWORD_RESET');eq(b.email,'liam@mail.fr');
});
await t('*** sans adresse e-mail, aucune demande n\'est envoyee ***',async()=>{
  serveur([]);
  let msg='';try{await G('motDePasseOublie')('liam');}catch(e){msg=e.message;}
  eq(msg,'RESET_SANS_EMAIL');eq(appels.length,0);
  if(!/adresse e-mail/.test(G('_msgErreurAuth')(msg)))throw new Error('message peu clair');
});
await t('*** changer d\'identifiant met a jour le compte et la session ***',async()=>{
  LS.dz_auth=JSON.stringify({uid:'UID123',rtok:'rtokA',login:'liam'});
  G('__resetTok')();
  serveur([{m:/securetoken/,d:{id_token:'tokX',expires_in:'3600'}},
           {m:/accounts:update/,d:{localId:'UID123',email:'liam@mail.fr',idToken:'tokY',refreshToken:'rtokY',expiresIn:'3600'}}]);
  S.profil={prenom:'Liam',login:'liam'};
  await G('changerIdentifiant')('liam@mail.fr');
  const u=appels.find(a=>/accounts:update/.test(a.url));
  const b=JSON.parse(u.body);
  eq(b.email,'liam@mail.fr');eq(b.idToken,'tokX');
  const s=JSON.parse(LS.dz_auth);
  eq(s.login,'liam@mail.fr');eq(s.rtok,'rtokY');eq(s.uid,'UID123','le compte ne change pas');
  eq(S.profil.login,'liam@mail.fr');
});
await t('un identifiant invalide n\'est meme pas envoye',async()=>{
  serveur([]);
  let msg='';try{await G('changerIdentifiant')('a b');}catch(e){msg=e.message;}
  eq(msg,'IDENTIFIANT_INVALIDE');
  if(appels.some(a=>/accounts:update/.test(a.url)))throw new Error('envoye quand meme');
});
await t('le refus de Firebase donne la marche a suivre',()=>{
  if(!/énumération des adresses e-mail/.test(src))throw new Error('explication absente');
});
await t('*** la section Connexion figure dans la modification du profil ***',()=>{
  LS.dz_auth=JSON.stringify({uid:'UID123',rtok:'r',login:'liam'});
  S.profil={prenom:'Liam'};
  G('ouvrirEditionProfil')();
  const h=docEl('profil-panneau').innerHTML;
  if(!/Connecté en tant que/.test(h))throw new Error('identifiant courant absent');
  if(!/modifierIdentifiant\(\)/.test(h))throw new Error('changement d\'identifiant absent');
  if(!/modifierMotDePasse\(\)/.test(h))throw new Error('changement de mot de passe absent');
  if(!/Sans adresse e-mail/.test(h))throw new Error('avertissement absent pour un identifiant simple');
});
await t('le lien Mot de passe oublie figure a la connexion',()=>{
  G('afficherEcranConnexion')('accueil');G('_authMode')('connexion');
  if(!/demanderReinitialisation\(\)/.test(docEl('profile-screen').innerHTML))throw new Error('absent');
});

console.log('\n=== GQ. Interface des reglages ===');
await t('*** l\'infobulle du bouton dit Parametres ***',()=>{
  if(/title="Clé API/.test(src))throw new Error('ancienne infobulle');
  if(!/title="Paramètres\$\{/.test(src))throw new Error('infobulle absente');
});
await t('*** le bouton Modifier le profil est dans le bloc profil ***',()=>{
  const i=src.indexOf("var p=document.getElementById('set-profile');");
  const b=src.slice(i,i+1600);
  if(!/ouvrirEditionProfil\(\)/.test(b))throw new Error('absent du bloc');
  const j=src.indexOf('onclick="closeSettings()" style="flex:1');
  if(/ouvrirEditionProfil/.test(src.slice(j,j+400)))throw new Error('doublon en bas des reglages');
});
await t('*** l\'ecran de connexion est centre verticalement ***',()=>{
  G('afficherEcranConnexion')('accueil');
  const h=docEl('profile-screen').innerHTML;
  if(!/max-width:420px;margin:auto;/.test(h))throw new Error('bloc non centre');
  eq(docEl('profile-screen').style.display,'flex');
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
})();
