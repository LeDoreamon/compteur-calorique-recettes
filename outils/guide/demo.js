// Compte de demonstration « Alex » pour les captures du guide (aucune donnee personnelle de Liam)
const fs=require('fs'),vm=require('vm');
const [REPO,SAUV,OUT]=process.argv.slice(2);
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(REPO+'/catalogue.js','utf8')+';this.RCP=RCP;',ctx);
const sv=JSON.parse(fs.readFileSync(SAUV,'utf8'));const src=sv.state;
const fmt=d=>d.toISOString().slice(0,10);
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const J=n=>{const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return fmt(d);};
const decale=(dlc,n)=>{if(!dlc)return dlc;const d=new Date(dlc+'T00:00:00Z');if(isNaN(d))return dlc;d.setUTCDate(d.getUTCDate()+n);return fmt(d);};
const ecart=Math.round((new Date(today)-new Date('2026-10-31'))/864e5);
/* inventaire : celui de la sauvegarde, dates decalees pour garder les memes echeances */
const inv=JSON.parse(JSON.stringify(src.inv));
Object.values(inv).forEach(a=>(a||[]).forEach(it=>{if(it.dlc)it.dlc=decale(it.dlc,ecart);if(/BRUNOISE/i.test(it.name))it.name='Brunoise de fruits';delete it.plein;delete it.qVu;}));
/* un plat maison pour la demonstration */
inv.frigo.unshift({id:'plat_demo_lasagnes',name:'Lasagnes maison',qty:3,unit:'parts',dlc:J(3),plat:{creeLe:J(-1),parts:4,poidsEstime:1600,ings:[]},macPiece:{kcal:560,prot:34,gluc:52,lip:22,fib:4},pieceG:400});
/* recettes « proposees par l'IA » : reprises du catalogue, sans rattachement */
const ids=['liam_v7_porridge_framboises','liam_v9_pancakes_banane','liam_v9_overnight_oats_fruits','liam_v6_ramen_poulet','liam_v9_gratin_pates_thon','liam_v6_poulet_riz_soja','liam_v9_saumon_gnocchi','liam_v9_poulet_moutarde_miel','liam_v6_chili_riz','liam_v9_riz_cantonais','liam_v9_tartiflette_chevre','liam_v9_fb_choco_crousti','liam_v8_fb_compote_amandes'];
const aiRecipes=ids.map((id,i)=>{const r=ctx.RCP.find(x=>x.id===id);if(!r)throw new Error(id);const o=JSON.parse(JSON.stringify(r));o.id='ai_demo_'+(i+1);delete o.profile;o.ai=true;return o;});
const customRecipes=[{custom:true,id:'cust_demo_bowl',name:'Bowl poulet, riz et légumes',slots:['lunch','dinner'],kcal:640,prot:46,gluc:70,lip:16,time:20,
  used:aiRecipes[5].used.slice(0,3),steps:['Cuire le [riz] 12 min.','Saisir les [aiguillettes de poulet] 6 min à la poêle.','Servir le tout avec la [sauce soja] et un filet de citron.']}];
const M=(slot,name,kcal,prot,gluc,lip,fib)=>({rid:'_free_demo',mult:1,name,slot,macros:{kcal,prot,gluc,lip,fib}});
const jours={
  [-6]:[M('breakfast','Porridge framboises & whey',478,35,65,7,12.5),M('lunch','Poulet riz sauce soja',650,48,72,14,3),M('dinner','Ramen au poulet et bouillon',572,58,57,11,2.5),M('snack','Fromage blanc, compote et amandes',420,28,40,14,3)],
  [-5]:[M('breakfast','Pancakes avoine-banane',520,32,70,12,6),M('lunch','Tartiflette express au chèvre',690,38,62,30,4),M('dinner','Burger et frites (restaurant)',980,42,90,48,5),M('snack','Barre protéinée',260,20,25,8,3)],
  [-4]:[M('breakfast','Overnight oats aux fruits',450,30,62,8,8),M('lunch','Gratin de pâtes au thon',564,53,54,15,5.6),M('dinner','Riz cantonais',620,40,70,16,3),M('snack','Pomme',90,0,22,0,3)],
  [-3]:[M('breakfast','Porridge framboises & whey',478,35,65,7,12.5),M('lunch','Saumon crème-citron & gnocchis',583,37,60,20,3),M('dinner','Chili con carne et riz',690,45,78,18,9),M('snack','Fromage blanc choco-crousti',480,32,55,12,4)],
  [-2]:[M('lunch','Sandwich jambon-fromage',520,28,52,20,3),M('snack','Café au lait',80,5,8,3,0)],
  [-1]:[M('breakfast','Pancakes avoine-banane',520,32,70,12,6),M('lunch','Poulet moutarde-miel et riz',680,50,80,15,2),M('dinner','Lasagnes maison',560,34,52,22,4),M('snack','Fromage blanc, compote et amandes',360,26,34,12,3)],
  [0]:[M('breakfast','Œufs brouillés, pain complet et fromage blanc',420,34,32,16,5),M('lunch','Bowl poulet, riz et légumes',720,48,82,18,6)]
};
const dayMeals={};Object.keys(jours).forEach(k=>{dayMeals[J(+k)]=jours[k];});
/* pesees : 6 semaines, de 91,6 a 88,4 kg */
const weights=[];for(let i=42;i>=0;i--){if(i%2&&i>3)continue;const tendance=91.6-(42-i)*(3.2/42),bruit=(((i*37)%11)-5)*0.06;weights.push({d:J(-i),w:Math.round((tendance+bruit)*10)/10});}
const mesures=[{d:J(-42),taille:98},{d:J(-28),taille:97},{d:J(-14),taille:95.5},{d:J(-1),taille:94.5}];
const burn={[J(-6)]:{steps:10500},[J(-5)]:{steps:7200},[J(-4)]:{steps:12000,activities:[{name:'Séance — Haut du corps',min:55,kcal:320}]},[J(-3)]:{steps:9400},[J(-2)]:{steps:6000},[J(-1)]:{steps:11800,activities:[{name:'Course à pied',min:35,kcal:380}]},[J(0)]:{steps:6500}};
const shopList=[{id:'sh_d1',name:'Avocats',rayon:'fruitsleg',checked:false},{id:'sh_d2',name:'Bananes',rayon:'fruitsleg',checked:true},{id:'sh_d3',name:'Tomates cerises',rayon:'fruitsleg',checked:false},
  {id:'sh_d4',name:'Aiguillettes de poulet',rayon:'viandes',checked:false},{id:'sh_d5',name:'Saumon',rayon:'poissons',checked:false},{id:'sh_d6',name:'Fromage blanc 0%',rayon:'cremerie',checked:true},
  {id:'sh_d7',name:'Œufs',rayon:'cremerie',checked:false},{id:'sh_d8',name:'Riz basmati',rayon:'epicerie',checked:false},{id:'sh_d9',name:'Sauce soja sucrée',rayon:'sauces',checked:false},
  {id:'sh_d10',name:'Éponges',rayon:'maison',checked:false,graveOnly:true}];
const state={_profile:'users/demo',rev:42,schema:src.schema,tz:'Europe/Paris',catalogue:null,
  profil:{prenom:'Alex',emoji:'🏃',sexe:'H',naissance:'1995-04-12',taille:178,poids:88.4,poidsVise:80,objectif:'perte',activite:'2',pas:8000,regime:'omnivore',allergies:[],equipement:['Plaques','Four','Micro-ondes'],temps:'30',cibles:{kcal:2200,prot:150,gluc:220,lip:75},login:'alex'},
  pasBase:8000,weightGoal:80,weights,mesures,inv,dayMeals,aiRecipes,customRecipes,favs:['ai_demo_4','ai_demo_7'],
  shop:{list:shopList,graveyard:[]},shopSeeded:true,waiting:[{id:'wt_d1',name:'Yaourts grecs',rayon:'cremerie'},{id:'wt_d2',name:'Pâtes complètes',rayon:'epicerie'}],
  programme:[{id:'hautA',nom:'Haut du corps',min:55,met:4,exos:'Développé couché, tirage, épaules, bras'},{id:'basA',nom:'Jambes',min:50,met:5,exos:'Squat, presse, fentes, mollets'}],progMigre:true,
  paires0k:src.paires0k||{},pasRacheter:src.pasRacheter||{},ingNames:src.ingNames||{},dupMerged:true,tutoVu:true,clesSorties:true,libresMigres:true,fibInv:true,epicesFix2:true,repartLiam:true,recTri:'',deletedItems:[]};
fs.writeFileSync(OUT,JSON.stringify({state,burn}));
console.log('demo ecrite :',Object.keys(dayMeals).length,'jours de repas,',weights.length,'pesees,',aiRecipes.length,'recettes, aujourd\'hui',today);
