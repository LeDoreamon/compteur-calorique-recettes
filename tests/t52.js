const {sb,reg,docEl}=require('./sb.js');
const vm=require('vm');
let pass=0,fail=0;
const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
let reponses=[],corps=[];
sb.fetch=async(u,o)=>{
  if(o&&o.body)corps.push(String(o.body));
  const r=reponses.length?reponses.shift():{ok:true,status:200,body:{}};
  return {ok:r.ok,status:r.status,json:async()=>r.body};
};
const stock={};
sb.localStorage={getItem:k=>k in stock?stock[k]:null,setItem:(k,v)=>{stock[k]=String(v);},removeItem:k=>{delete stock[k];}};
const session=login=>JSON.stringify({uid:'u1',rtok:'r1',login:login});
const okConnexion=()=>({ok:true,status:200,body:{localId:'u2',refreshToken:'r2',idToken:'i2',expiresIn:'3600'}});

console.log('\n=== IIA. Cle Groq a la reconnexion apres une session expiree ===');
t('*** un autre compte ne recupere pas la cle Groq du precedent ***',async()=>{
  stock.dz_auth=session('alice');stock.anthropic_key='cle-alice';
  docEl('au-login').value='bob';docEl('au-mdp').value='secret';
  X("_auth.occupe=false;");reponses=[okConnexion()];
  await X('validerConnexion')();
  eq(stock.anthropic_key,undefined,'cle conservee');
  eq(JSON.parse(stock.dz_auth).login,'bob');
});
t('le meme compte garde sa cle (casse et espaces ignores)',async()=>{
  stock.dz_auth=session('alice');stock.anthropic_key='cle-alice';
  docEl('au-login').value=' Alice ';docEl('au-mdp').value='secret';
  X("_auth.occupe=false;");reponses=[okConnexion()];
  await X('validerConnexion')();
  eq(stock.anthropic_key,'cle-alice');
});
t('premiere connexion sans session : la cle deja saisie reste',async()=>{
  delete stock.dz_auth;stock.anthropic_key='cle-locale';
  docEl('au-login').value='bob';docEl('au-mdp').value='secret';
  X("_auth.occupe=false;");reponses=[okConnexion()];
  await X('validerConnexion')();
  eq(stock.anthropic_key,'cle-locale');
});
t('connexion refusee : rien n\'est efface',async()=>{
  stock.dz_auth=session('alice');stock.anthropic_key='cle-alice';
  docEl('au-login').value='bob';docEl('au-mdp').value='faux';
  X("_auth.occupe=false;");reponses=[{ok:false,status:400,body:{error:{message:'INVALID_LOGIN_CREDENTIALS'}}}];
  await X('validerConnexion')();
  eq(stock.anthropic_key,'cle-alice');
});

console.log('\n=== IIB. Reponse IA vide ===');
t('*** une reponse vide affiche « réponse vide », pas une erreur JSON ***',async()=>{
  stock.anthropic_key='k';X("_macSrc.aim='auto';");docEl('ai-name').value='Poulet';
  reponses=[{ok:true,status:200,body:{choices:[{message:{content:''},finish_reason:'stop'}]}}];
  await X('aiLookupMacros')();
  const s=docEl('ai-status').textContent;
  if(s.indexOf('réponse vide')<0)throw new Error('message : '+s);
});
t('une reponse valide remplit toujours les champs',async()=>{
  stock.anthropic_key='k';X("_macSrc.aim='auto';");docEl('ai-name').value='Poulet';docEl('ai-m-kcal').value='';
  reponses=[{ok:true,status:200,body:{choices:[{message:{content:'{"kcal":165,"prot":31,"gluc":0,"lip":3.6}'},finish_reason:'stop'}]}}];
  await X('aiLookupMacros')();
  eq(docEl('ai-m-kcal').value,165);
});

console.log('\n=== IIC. Poids de l\'estimation d\'activite ===');
t('sans pesee ni profil : le poids de repli de _poidsCourant est envoye',async()=>{
  stock.anthropic_key='k';X("S.weights=[];S.profil=null;");
  docEl('burn-act-name').value='Course';docEl('burn-act-min').value='30';
  corps=[];reponses=[{ok:true,status:200,body:{choices:[{message:{content:'300'},finish_reason:'stop'}]}}];
  await X('burnEstimateActivity')();
  const b=corps.find(c=>c.indexOf('Activit')>=0)||'';
  if(b.indexOf('Poids: '+X('_poidsCourant()')+' kg')<0)throw new Error('corps : '+b.slice(0,200));
});

console.log('\n=== IID. Refus du jeton de session ===');
async function refus(msg){
  X("_expireeSignalee=false;_fbTok=null;_fbTokExp=0;_auth.err='';");
  stock.dz_auth=session('alice');
  reponses=[{ok:false,status:400,body:{error:{message:msg}}}];
  await X('fbAuthToken')();
  return X('_expireeSignalee');
}
['TOKEN_EXPIRED','INVALID_REFRESH_TOKEN','MISSING_REFRESH_TOKEN','USER_DISABLED','USER_NOT_FOUND','INVALID_GRANT']
  .forEach(m=>t(m+' redemande la connexion',async()=>eq(await refus(m),true)));
t('*** INVALID_GRANT_TYPE (requete mal formee) ne deconnecte pas ***',async()=>eq(await refus('INVALID_GRANT_TYPE'),false));
t('une erreur 400 quelconque ne deconnecte pas',async()=>eq(await refus('INVALID_ARGUMENT'),false));

(async()=>{
  for(const [n,f] of tests){
    try{await f();pass++;console.log('  ok  '+n);}
    catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}
  }
  console.log('---- '+pass+' ok, '+fail+' KO');
})();
