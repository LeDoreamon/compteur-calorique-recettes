// Adresses techniques sur un domaine reserve (.invalid) et suppression du compte (11/10/2026)
const {sb}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
let appels=[],route=()=>rep(true,null);
function rep(ok,d,status){return {ok:ok,status:status||(ok?200:400),json:async()=>d};}
const err=m=>rep(false,{error:{message:m}},400);
const JET=uid=>({localId:uid,idToken:'tok_'+uid,refreshToken:'rt_'+uid,expiresIn:'3600'});
sb.fetch=async(u,o)=>{u=String(u);const m=(o&&o.method)||'GET';let b=null;try{b=o&&o.body?JSON.parse(o.body):null;}catch(e){}
  appels.push({u:u,m:m,b:b});return route(u,m,b);};
const quoi=a=>a.u.indexOf('identitytoolkit')>=0?a.u.split('accounts:')[1].split('?')[0]+(a.b&&a.b.email?'('+a.b.email+')':'')
  :(a.m+' '+a.u.split('.app/')[1].split('?')[0]);
const vider=()=>{Object.keys(LS).forEach(k=>delete LS[k]);appels=[];X('_compteSupprime=false;_fbTok=null;_fbTokExp=0;');};
const session=(uid,login)=>{LS.dz_auth=JSON.stringify({uid:uid,rtok:'rt',login:login});};

console.log('\n=== LVII. Adresses techniques sur un domaine que personne ne peut posseder ===');
t('*** un nouveau compte recoit une adresse en .invalid (domaine reserve, sans courrier) ***',async()=>{
  vider();route=(u)=>/signUp/.test(u)?rep(true,JET('N1')):rep(true,null);
  await X('creerCompte')('Camille','secret1');
  eq(appels.map(quoi).join(' '),'signUp(camille@dorayaki.invalid)');
  eq(X("_emailDe('camille')"),'camille@dorayaki.invalid');
  eq(X("_emailDe('Liam.D@Mail.fr')"),'liam.d@mail.fr','vraie adresse inchangee');
});
t('compte recent : une seule tentative de connexion',async()=>{
  vider();route=(u,m,b)=>/signInWithPassword/.test(u)&&b.email==='camille@dorayaki.invalid'?rep(true,JET('N1')):err('INVALID_LOGIN_CREDENTIALS');
  await X('connexion')('camille','secret1');
  eq(appels.map(quoi).join(' '),'signInWithPassword(camille@dorayaki.invalid)');
  eq(JSON.parse(LS.dz_auth).uid,'N1');
});
t('*** compte d\'avant : connexion par l\'ancien domaine, puis adresse migree vers .invalid ***',async()=>{
  vider();route=(u,m,b)=>{
    if(/signInWithPassword/.test(u))return b.email==='bob@dorayaki.app'?rep(true,JET('OLD')):err('INVALID_LOGIN_CREDENTIALS');
    if(/accounts:update/.test(u))return rep(true,{localId:'OLD',email:b.email,idToken:'tok_neuf',refreshToken:'rt_neuf',expiresIn:'3600'});
    return rep(true,null);};
  await X('connexion')('bob','secret1');
  eq(appels.map(quoi).join(' '),'signInWithPassword(bob@dorayaki.invalid) signInWithPassword(bob@dorayaki.app) update(bob@dorayaki.invalid)');
  eq(appels[2].b.idToken,'tok_OLD','migration avec le jeton tout frais');
  const s=JSON.parse(LS.dz_auth);eq(s.uid,'OLD');eq(s.rtok,'rt_neuf','jeton renouvele apres le changement d\'adresse');eq(s.login,'bob');
});
t('*** Firebase refuse la migration (protection contre l\'enumeration) : la connexion marche quand meme, c\'est note ***',async()=>{
  vider();route=(u,m,b)=>{
    if(/signInWithPassword/.test(u))return b.email==='bob@dorayaki.app'?rep(true,JET('OLD')):err('INVALID_LOGIN_CREDENTIALS');
    if(/accounts:update/.test(u))return err('OPERATION_NOT_ALLOWED : Please verify the new email before changing email.');
    return rep(true,null);};
  await X('connexion')('bob','secret1');
  eq(JSON.parse(LS.dz_auth).uid,'OLD');
  if(!/adresse technique non migree/.test(LS.dz_journal||''))throw new Error('refus non note au journal');
});
t('mauvais mot de passe : deux essais, erreur claire, aucune session',async()=>{
  vider();route=()=>err('INVALID_LOGIN_CREDENTIALS');
  let m='';try{await X('connexion')('bob','faux');}catch(e){m=e.message;}
  eq(m,'INVALID_LOGIN_CREDENTIALS');eq(appels.length,2);
  if(LS.dz_auth)throw new Error('session posee');
});
t('vraie adresse e-mail ou trop de tentatives : pas de second essai',async()=>{
  vider();route=()=>err('INVALID_LOGIN_CREDENTIALS');
  try{await X('connexion')('bob@mail.fr','faux');}catch(e){}
  eq(appels.length,1,'e-mail');
  appels=[];route=()=>err('TOO_MANY_ATTEMPTS_TRY_LATER');
  try{await X('connexion')('bob','faux');}catch(e){}
  eq(appels.length,1,'trop de tentatives');
});
t('changer d\'identifiant vise le domaine reserve',async()=>{
  vider();session('N1','camille');X("_fbTok='tok';_fbTokExp=Date.now()+3600e3;");
  route=(u,m,b)=>/accounts:update/.test(u)?rep(true,{idToken:'t2',refreshToken:'r2',expiresIn:'3600'}):rep(true,null);
  await X('changerIdentifiant')('camille2');
  eq(appels.filter(a=>/update/.test(a.u)).map(a=>a.b.email).join(),'camille2@dorayaki.invalid');
});

console.log('\n=== LVIII. Supprimer mon compte ===');
const okSuppr=(uid)=>(u,m,b)=>{
  if(/signInWithPassword/.test(u))return b.password==='bon'?rep(true,JET(uid)):err('INVALID_LOGIN_CREDENTIALS');
  if(/accounts:delete/.test(u))return rep(true,{});
  if(m==='DELETE')return rep(true,null);
  return rep(true,null);};
const prepa=()=>{vider();session('U7','zoe');Object.assign(LS,{'users/U7_st':'{"inv":{}}','users/U7_photos':'{}',anthropic_key:'gsk_x',gemini_key:'AIzaX',dz_journal:'[]'});X("ACTIVE_PROFILE='users/U7';_loaded=true;");};
t('*** clic d\'erreur : « Annuler » a la confirmation, rien ne se passe ***',async()=>{
  prepa();route=okSuppr('U7');
  let msg='';sb.confirm=m=>{msg=m;return false;};
  const r=await X('demanderSuppressionCompte')();
  eq(r,false);eq(appels.length,0,'aucun appel');
  if(!/irréversible/.test(msg))throw new Error('le message ne dit pas que c\'est irreversible');
  if(!LS.dz_auth)throw new Error('session touchee');
  sb.confirm=()=>true;
});
t('*** mot de passe faux : rien n\'est supprime ***',async()=>{
  prepa();route=okSuppr('U7');
  let m='';try{await X('supprimerCompte')('faux');}catch(e){m=X('_msgSuppression')(e);}
  if(!/incorrect/.test(m))throw new Error('message : '+m);
  if(appels.some(a=>a.m==='DELETE'||/accounts:delete/.test(a.u)))throw new Error('suppression lancee');
  if(!LS['users/U7_st']||!LS.dz_auth)throw new Error('donnees locales touchees');
});
t('*** bon mot de passe : donnees puis compte, dans cet ordre, puis l\'appareil est vide ***',async()=>{
  prepa();route=okSuppr('U7');
  await X('supprimerCompte')('bon');
  eq(appels.map(quoi).join(' '),'signInWithPassword(zoe@dorayaki.invalid) DELETE users/U7.json delete');
  eq(appels.find(a=>/accounts:delete/.test(a.u)).b.idToken,'tok_U7','jeton frais');
  const restes=Object.keys(LS);eq(restes.join(','),'','appareil vide');
  eq(await X('fbAuthToken')(),null,'plus d\'acces Firebase');
});
t('apres la suppression, un enregistrement en retard ne recree rien',async()=>{
  prepa();route=okSuppr('U7');
  await X('supprimerCompte')('bon');appels=[];
  await X('saveState')();
  eq(appels.filter(a=>a.m!=='GET').length,0,'ecriture apres suppression');
});
t('*** effacement des donnees refuse : le compte n\'est pas supprime, rien n\'est perdu ***',async()=>{
  prepa();route=(u,m,b)=>m==='DELETE'?rep(false,null,401):okSuppr('U7')(u,m,b);
  let m='';try{await X('supprimerCompte')('bon');}catch(e){m=X('_msgSuppression')(e);}
  if(appels.some(a=>/accounts:delete/.test(a.u)))throw new Error('compte supprime malgre l\'echec');
  if(!/Rien n’a été supprimé/.test(m))throw new Error('message : '+m);
  if(!LS['users/U7_st']||!LS.dz_auth)throw new Error('donnees locales effacees');
  eq(X('_loaded'),true,'enregistrements retablis');
});
t('compte refuse apres l\'effacement des donnees : message clair, on peut reessayer',async()=>{
  prepa();route=(u,m,b)=>/accounts:delete/.test(u)?err('CREDENTIAL_TOO_OLD_LOGIN_AGAIN'):okSuppr('U7')(u,m,b);
  let m='';try{await X('supprimerCompte')('bon');}catch(e){m=X('_msgSuppression')(e);}
  if(!/n’a pas pu être supprimé/.test(m))throw new Error('message : '+m);
  eq(X('_compteSupprime'),false,'on peut reessayer');
});
t('mot de passe d\'un autre compte : rien n\'est supprime',async()=>{
  prepa();route=okSuppr('AUTRE');
  let m='';try{await X('supprimerCompte')('bon');}catch(e){m=X('_msgSuppression')(e);}
  if(!/autre compte/.test(m))throw new Error('message : '+m);
  if(appels.some(a=>a.m==='DELETE'||/accounts:delete/.test(a.u)))throw new Error('suppression lancee');
});
t('Reglages : bouton discret sous la deconnexion, mot de passe masque a la seconde etape',async()=>{
  const i=src.indexOf('⏻ Se déconnecter</button>'),j=src.indexOf('onclick="closeSettings();demanderSuppressionCompte()"'),k=src.indexOf('>Supprimer mon compte</button>');
  if(i<0||j<i||j-i>40||k<j||k-j>400)throw new Error('bouton absent ou mal place');
  const f=src.slice(src.indexOf('function _ouvrirSuppressionCompte'),src.indexOf('function _msgSuppression('));
  if(!/mdp\.type='password'/.test(f))throw new Error('champ mot de passe non masque');
  if(!/exportBackup\(\)/.test(f))throw new Error('pas de proposition de sauvegarde');
});

(async()=>{for(const [n,f] of tests){try{await f();pass++;console.log('  ok  '+n);}catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}}
console.log('---- '+pass+' ok, '+fail+' KO');})();
