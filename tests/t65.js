const {sb,docEl}=require('./sb.js');
const fs=require('fs');
let pass=0,fail=0;
async function t(n,f){try{await f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const G=n=>sb[n]||sb.window[n];
const src=fs.readFileSync('index.html','utf8');
const LS={};sb.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
const CLE='gsk_'+'A1b2C3d4E5f6G7h8I9j0K1l2M3n4';
let etat=null;
sb.fetch=async function(url,opt){
  if(/accounts:signUp/.test(url))return {ok:true,status:200,json:async()=>({localId:'UIDG',idToken:'t',refreshToken:'r',expiresIn:'3600'})};
  if(/\/state\.json/.test(url)&&opt&&opt.method==='PUT'){etat=JSON.parse(opt.body);}
  return {ok:true,status:200,json:async()=>null};
};
function prepa(groq){
  require('vm').runInContext('_auth.occupe=false;',sb);   /* l'app recharge la page apres une creation */
  G('afficherEcranConnexion')('accueil');G('_authMode')('inscription');
  const I=sb.window._ins;I.login='ana';I.mdp='secret1';
  Object.assign(I.p,{prenom:'Ana',sexe:'F',naissance:'1995-01-01',taille:165,poids:60,objectif:'maintien',activite:'2',cibles:{kcal:2000,prot:110,gluc:230,lip:65}});
  I.etape=5;G('renderAuth')();if(groq!==undefined)docEl('au-groq').value=groq;etat=null;
}
const ecran=()=>docEl('profile-screen').innerHTML;
(async()=>{
console.log('\n=== XV. Cle Groq a l\'inscription ===');
await t('*** derniere etape : explications, lien Groq, champ et bouton Passer ***',()=>{
  prepa();const h=ecran();
  eq(G('_ETAPES').length,6);
  ['console.groq.com','API Keys','Create API Key','gsk_','Passer cette étape','Créer mon compte','au-groq'].forEach(x=>{if(h.indexOf(x)<0)throw new Error(x+' absent');});
  if(!/target="_blank"/.test(h))throw new Error('lien pas dans un nouvel onglet');
});
await t('l\'etape des cibles propose maintenant Suivant',()=>{prepa();sb.window._ins.etape=4;G('renderAuth')();if(ecran().indexOf('Créer mon compte')>=0)throw new Error('encore Créer');});
await t('*** une cle mal copiee est refusee avec un message ***',async()=>{
  prepa('sk-abc123');await G('etapeInscription')(1);
  eq(etat,null,'compte cree quand meme');if(!/gsk_/.test(G('_auth').err||ecran()))throw new Error('pas de message');
});
await t('*** une cle valide part dans l\'etat du compte et sur l\'appareil ***',async()=>{
  delete LS.anthropic_key;prepa(' '+CLE+' ');await G('etapeInscription')(1);
  eq(etat&&etat.groqKey,CLE);eq(LS.anthropic_key,CLE);
});
await t('*** Passer : compte cree sans cle, meme si un champ etait rempli ***',async()=>{
  prepa('gsk_nimportequoi');await G('passerCleGroq')();
  if(!etat)throw new Error('compte non cree');eq(etat.groqKey,undefined);
});
await t('la cle d\'un compte precedent ne suit pas le nouveau',async()=>{
  LS.anthropic_key='gsk_ancienneCleDunAutreCompte000';prepa('');await G('passerCleGroq')();
  eq(LS.anthropic_key,undefined);
});
await t('champ vide + Créer mon compte = pas de cle, pas d\'erreur',async()=>{
  prepa('');await G('etapeInscription')(1);if(!etat)throw new Error('compte non cree');eq(etat.groqKey,undefined);
});
await t('format de cle',()=>{
  const v=G('_cleGroqValide');eq(v(CLE),true);eq(v('gsk_court'),false);eq(v('gsk_'+'a'.repeat(20)+'<x>'),false);eq(v(''),false);
});
console.log('---- '+pass+' ok, '+fail+' KO');
})();
