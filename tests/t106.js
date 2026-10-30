// Bouton œil sur les champs mot de passe : afficher / masquer (30/10/2026, demande d'un nouvel utilisateur)
const {sb,docEl}=require('./sb.js');
const vm=require('vm');
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
const ecran=()=>docEl('profile-screen').innerHTML;
/* champ + bouton dans la meme zone, champ masque par defaut */
const avecOeil=(h,id)=>new RegExp('<div class="mdp-zone"><input id="'+id+'" type="password"[^>]*>\\s*<button type="button" class="mdp-oeil" onclick="basculerMdp\\(\''+id+'\',this\\)" aria-label="Afficher le mot de passe"').test(h);

console.log('\n=== LXXVI. Afficher / masquer le mot de passe ===');
t('*** inscription : mot de passe et confirmation ont chacun leur bouton œil, masques par defaut ***',()=>{
  X("_auth.occupe=false;afficherEcranConnexion('accueil');_authMode('inscription');_ins.etape=0;_ins.mdp='';renderAuth();");
  const h=ecran();if(!avecOeil(h,'au-mdp'))throw new Error('mot de passe');if(!avecOeil(h,'au-mdp2'))throw new Error('confirmation');
});
t('connexion : le mot de passe a son bouton œil',()=>{
  X("_auth.occupe=false;afficherEcranConnexion('accueil');_authMode('connexion');renderAuth();");
  if(!avecOeil(ecran(),'au-mdp'))throw new Error(ecran().slice(0,400));
});
t('profil : nouveau mot de passe et confirmation',()=>{
  if(!/_champ\('Nouveau',_inpMdp\('pf-mdp1'/.test(src)||!/_champ\('Confirmation',_inpMdp\('pf-mdp2'/.test(src))throw new Error('profil');
});
t('suppression du compte : bouton œil a cote du champ (fenetre construite en DOM)',()=>{
  const d=src.indexOf('function _ouvrirSuppressionCompte'),f=src.slice(d,src.indexOf('function _msgSuppression',d));
  if(!/oeil\.onclick=function\(\)\{basculerMdp\(mdp,oeil\);\}/.test(f)||!/zoneMdp\.appendChild\(mdp\);zoneMdp\.appendChild\(oeil\)/.test(f))throw new Error('fenetre de suppression');
});
t('*** un toucher affiche, un second masque ; icone et libelle suivent ***',()=>{
  const champ={type:'password'},b={innerHTML:'',attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
  sb.__c=champ;sb.__b=b;X('basculerMdp(__c,__b)');
  eq(champ.type,'text','affiche');eq(b.innerHTML,X('ICONE_OEIL_BARRE'),'icone barree');eq(b.attrs['aria-label'],'Masquer le mot de passe');eq(b.attrs['aria-pressed'],'true');
  X('basculerMdp(__c,__b)');
  eq(champ.type,'password','masque');eq(b.innerHTML,X('ICONE_OEIL'),'icone oeil');eq(b.attrs['aria-label'],'Afficher le mot de passe');eq(b.attrs['aria-pressed'],'false');
});
t('par identifiant aussi ; champ absent : rien ne casse',()=>{
  docEl('au-mdp').type='password';X("basculerMdp('au-mdp',null)");eq(docEl('au-mdp').type,'text');
  X("basculerMdp('champ-inexistant',null)");
});
t('le bouton ne valide pas le formulaire et laisse la place au texte',()=>{
  if(!/\.mdp-zone \{ position: relative; \}/.test(src)||!/\.mdp-oeil \{ position: absolute;[^}]*right: 0;[^}]*width: 42px;/.test(src))throw new Error('placement');
  if(!/padding-right:42px;/.test(src))throw new Error('le texte passerait sous le bouton');
  if(/class="mdp-oeil"(?![^>]*type="button")/.test(src.replace(/<button type="button" class="mdp-oeil"/g,'')))throw new Error('type="button" manquant');
});

console.log('---- '+pass+' ok, '+fail+' KO');
