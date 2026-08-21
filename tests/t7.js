const {sb}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}

// On repart de l'inventaire par defaut livre avec l'app (pas d'un jeu de test)
sb.S.inv=JSON.parse(JSON.stringify(sb.INV_DEFAULT||{}));
const ids=new Set();
Object.values(sb.S.inv).forEach(a=>(a||[]).forEach(i=>i&&ids.add(i.id)));
console.log('  (inventaire par defaut : '+ids.size+' articles, '+(sb.RCP||[]).length+' recettes)');

console.log('\n=== D2. Recettes -> inventaire par defaut ===');
t('les ingredients sans nom ne se multiplient pas',()=>{
  // Les recettes visent l'inventaire reel (ids cx_*), pas INV_DEFAULT : on ne
  // peut pas verifier les ids ici. En revanche, resolveInv() a besoin d'un nom
  // pour retomber sur ses pieds quand un id disparait (fusion de doublons).
  // 32 ingredients en sont depourvus aujourd'hui : seuil a ne pas depasser.
  const SEUIL=32;
  const sansNom=[];
  (sb.RCP||[]).forEach(r=>{
    if(!r.slots||!r.slots.length)return;          // references d'historique
    (r.used||[]).forEach(u=>{
      if(!u||u.any||Array.isArray(u.opts))return;
      if(u.id&&!u.n)sansNom.push(r.name.slice(0,38)+' -> '+u.id);
    });
  });
  if(sansNom.length>SEUIL)throw new Error('regression : '+sansNom.length+' ingredients sans nom (seuil '+SEUIL+')');
  if(sansNom.length)console.log('       note : '+sansNom.length+' ingredients sans nom de repli — voir README');
});
t('chaque ingredient a une quantite exploitable',()=>{
  const ko=[];
  (sb.RCP||[]).forEach(r=>(r.used||[]).forEach(u=>{
    if(!u||u.any)return;
    if(u.qty===undefined||isNaN(+u.qty))ko.push(r.name.slice(0,30)+' -> '+(u.n||u.id));
  }));
  if(ko.length)throw new Error(ko.length+' ex: '+ko.slice(0,4).join(', '));
});
t('les macros annoncees collent aux ingredients (ecart < 25 %)',()=>{
  const ecarts=[];
  (sb.RCP||[]).forEach(r=>{
    if(!r.used||!r.used.length||!r.kcal)return;
    let k=0,ok=true;
    r.used.forEach(u=>{
      if(!u||u.any){ok=false;return;}
      const it=sb.findItem(u.id);if(!it){ok=false;return;}
      const m=sb.itemMealMacros(it,u.qty);
      if(!m||(!m.kcal&&!it.mac100&&!it.macPiece)){ok=false;return;}
      k+=m.kcal;
    });
    if(!ok||!k)return;
    const e=Math.abs(k-r.kcal)/r.kcal;
    if(e>0.25)ecarts.push(r.name.slice(0,32)+' : annonce '+r.kcal+' / calcule '+Math.round(k));
  });
  if(ecarts.length)throw new Error(ecarts.length+' recettes :\n      '+ecarts.slice(0,10).join('\n      '));
});
t('pas d\'id de recette en double',()=>{
  const seen={},dup=[];
  (sb.RCP||[]).forEach(r=>{if(seen[r.id])dup.push(r.id);seen[r.id]=1;});
  if(dup.length)throw new Error(dup.join(', '));
});
t('chaque recette visible a un slot valide',()=>{
  const VAL=['breakfast','lunch','dinner','snack','dessert','urgent'];
  const ko=[];
  (sb.RCP||[]).forEach(r=>{
    // slots:[] est volontaire : references d'historique, jamais affichees
    if(!r.slots||!r.slots.length)return;
    r.slots.forEach(s=>{if(VAL.indexOf(s)<0)ko.push(r.name.slice(0,30)+' -> '+s);});
  });
  if(ko.length)throw new Error(ko.slice(0,5).join(', '));
});

console.log('\n=== I. _parseQty (forme reelle du retour) ===');
t('_parseQty renvoie size/unit/count',()=>{
  const cas={'500g':[500,'g',1],'2x250g':[250,'g',2],'1.5kg':[1500,'g',1],'33cl':[330,'ml',1]};
  const ko=[];
  Object.keys(cas).forEach(s=>{
    const r=sb._parseQty(s);
    if(!r){ko.push(s+' -> null');return;}
    const[si,u,c]=cas[s];
    if(r.size!==si||r.unit!==u||r.count!==c)ko.push(s+' -> '+JSON.stringify(r)+' attendu '+JSON.stringify({size:si,unit:u,count:c}));
  });
  if(ko.length)throw new Error(ko.join(' | '));
});
t('_parseQty sur entree invalide',()=>{
  [null,undefined,'','abc'].forEach(v=>{sb._parseQty(v);});
});

console.log('\n---- '+pass+' ok, '+fail+' KO ----');
