const {sb}=require('./sb.js');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const S=sb.S;
const INV=require('./data/inv.json');

// Reconstitue l'inventaire reel de Liam dans le bac a sable
const frigo=[];
Object.keys(INV).forEach(k=>{
  const it=INV[k];
  const o={id:it.id,name:it.n,unit:it.u,qty:(it.q===-1?null:it.q),
           mac100:it.m?{kcal:it.m[0],prot:it.m[1],gluc:it.m[2],lip:it.m[3]}:null};
  if(it.piece)o.macPiece={kcal:it.piece[0],prot:it.piece[1],gluc:it.piece[2],lip:it.piece[3]};
  if(it.pkg)o.pkg={size:it.pkg};
  frigo.push(o);
});
S.inv={frigo:frigo,placards:[],congelateur:[],epices:[]};
const liam=(sb.RCP||[]).filter(r=>r.profile==='liam'&&r.slots&&r.slots.length);

console.log('\n=== AM. Le catalogue colle a l\'inventaire ===');
t('22 recettes visibles pour Liam',()=>eq(liam.length,22));
t('*** chaque ingredient existe dans l\'inventaire ***',()=>{
  const manque=[];
  liam.forEach(r=>(r.used||[]).forEach(u=>{
    if(!sb.resolveInv(u.id,u.n))manque.push(r.name+' -> '+u.n);
  }));
  if(manque.length)throw new Error(manque.join(' | '));
});
t('*** les macros annoncees correspondent au calcul de l\'app ***',()=>{
  const ecarts=[];
  liam.forEach(r=>{
    let k=0,p=0;
    (r.used||[]).forEach(u=>{
      const it=sb.resolveInv(u.id,u.n);
      const m=sb.itemMealMacros(it,u.qty);
      k+=m.kcal;p+=m.prot;
    });
    if(Math.abs(Math.round(k)-r.kcal)>2)ecarts.push(r.name+' : annonce '+r.kcal+' calcule '+Math.round(k));
    if(Math.abs(Math.round(p)-r.prot)>2)ecarts.push(r.name+' (prot) : '+r.prot+' vs '+Math.round(p));
  });
  if(ecarts.length)throw new Error(ecarts.join('\n      '));
});
t('*** toutes les recettes sont realisables avec le stock ***',()=>{
  const ko=liam.filter(r=>!sb.canCook(r)).map(r=>r.name);
  if(ko.length)throw new Error(ko.join(' | '));
});
t('chaque ingredient porte un nom de repli',()=>{
  const sans=[];
  liam.forEach(r=>(r.used||[]).forEach(u=>{if(u.id&&!u.n)sans.push(r.name);}));
  if(sans.length)throw new Error(sans.join(', '));
});
t('macros coherentes : kcal ~ 4P + 4G + 9L',()=>{
  const ko=[];
  liam.forEach(r=>{
    const th=4*r.prot+4*r.gluc+9*r.lip;
    if(Math.abs(th-r.kcal)/Math.max(r.kcal,1)>0.14)ko.push(r.name+' : '+r.kcal+' vs '+Math.round(th));
  });
  if(ko.length)throw new Error(ko.join(' | '));
});

console.log('\n=== AN. Repartition ===');
t('au moins 3 petits-dejeuners',()=>{
  const n=liam.filter(r=>r.slots.includes('breakfast')).length;
  if(n<3)throw new Error(n);
});
t('au moins 8 plats',()=>{
  const n=liam.filter(r=>r.slots.includes('lunch')||r.slots.includes('dinner')).length;
  if(n<8)throw new Error(n);
});
t('au moins 4 encas',()=>{
  const n=liam.filter(r=>r.slots.includes('snack')).length;
  if(n<4)throw new Error(n);
});
t('une journee type atteint la cible proteique',()=>{
  const pdj=liam.find(r=>r.id==='liam_v5_avoine_fb');
  const midi=liam.find(r=>r.id==='liam_v5_poulet_riz_soja');
  const soir=liam.find(r=>r.id==='liam_v5_bolo_completes');
  const snack=liam.find(r=>r.id==='liam_v5_fb_framboises');
  const P=pdj.prot+midi.prot+soir.prot+snack.prot;
  const K=pdj.kcal+midi.kcal+soir.kcal+snack.kcal;
  if(P<160)throw new Error('proteines : '+P);
  if(K>2600)throw new Error('kcal : '+K+' (cible 2600)');
});

console.log('\n=== AO. Tomates cerises jamais cuites ===');
t('*** aucune etape ne fait cuire les tomates cerises ***',()=>{
  const faute=[];
  liam.forEach(r=>{
    const ut=(r.used||[]).some(u=>/tomates cerises/i.test(u.n||''));
    if(!ut)return;
    (r.steps||[]).forEach(s=>{
      if(/tomates? cerises?/i.test(s)&&/poêl|cuire|cuis|rissol|revenir|four|saisir|mijot|rôti|roti|sauté/i.test(s))
        faute.push(r.name+' : '+s);
    });
  });
  if(faute.length)throw new Error(faute.join(' | '));
});
t('les recettes aux tomates cerises precisent qu\'elles sont crues',()=>{
  const ko=[];
  liam.forEach(r=>{
    if(!(r.used||[]).some(u=>/tomates cerises/i.test(u.n||'')))return;
    if(!(r.steps||[]).some(s=>/crue|fraîch|fraich/i.test(s)))ko.push(r.name);
  });
  if(ko.length)throw new Error(ko.join(', '));
});

console.log('\n=== AP. Les autres profils sont intacts ===');
t('les 10 recettes de Maureen sont inchangees',()=>{
  const mo=(sb.RCP||[]).filter(r=>r.profile==='maureen'&&r.slots&&r.slots.length);
  eq(mo.length,10);
});
t('les 2 recettes communes sont conservees',()=>{
  const c=(sb.RCP||[]).filter(r=>!r.profile&&r.slots&&r.slots.length);
  eq(c.length,2);
});
t('*** les anciennes recettes de Liam restent resolvables ***',()=>{
  ['liam_v4_bowl_avoine','liam_v4_poulet_coco','liam_v4_saumon_riz'].forEach(id=>{
    const r=sb.findRecipe(id);
    if(!r)throw new Error(id+' introuvable : historique casse');
    if(!r.kcal)throw new Error(id+' a perdu ses macros');
  });
});
t('les anciennes n\'apparaissent plus dans les onglets',()=>{
  const v4=(sb.RCP||[]).filter(r=>/^liam_v4_/.test(r.id));
  eq(v4.filter(r=>r.slots&&r.slots.length).length,0);
});
t('aucun identifiant en double',()=>{
  const vu={},d=[];
  (sb.RCP||[]).forEach(r=>{if(vu[r.id])d.push(r.id);vu[r.id]=1;});
  if(d.length)throw new Error(d.join(','));
});

console.log('\n=== AQ. Rendu ===');
t('les onglets s\'affichent sans erreur',()=>{
  ['breakfast','lunch','dinner','snack','dessert','urgent','favs'].forEach(m=>{
    S.mainTab='recipes';S.mealTab=m;sb.render();
  });
});
t('recipeMacros ne renvoie pas NaN',()=>{
  const ko=[];
  liam.forEach(r=>{try{const m=sb.recipeMacros(r);if(m&&isNaN(m.kcal))ko.push(r.name);}catch(e){ko.push(r.name+': '+e.message);}});
  if(ko.length)throw new Error(ko.join(', '));
});
console.log('\n---- '+pass+' ok, '+fail+' KO ----');
