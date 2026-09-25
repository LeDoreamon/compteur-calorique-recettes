const {sb}=require('./sb.js');
const vm=require('vm');const fs=require('fs');
let pass=0,fail=0;
const tests=[];
function t(n,f){tests.push([n,f]);}
function eq(a,b,m){if(String(a)!==String(b))throw new Error((m||'')+' attendu '+b+' obtenu '+a);}
const X=c=>vm.runInContext(c,sb);
const src=fs.readFileSync('index.html','utf8');
const script=src.match(/<script>([\s\S]*?)<\/script>/)[1];

// Faux DOM minimal, suffisant pour la vraie fenetre de dialogue
function noeud(tag){return {tag,className:'',id:'',textContent:'',value:'',readOnly:false,type:'',children:[],attrs:{},
  appendChild(c){this.children.push(c);c.parent=this;return c;},setAttribute(k,v){this.attrs[k]=v;},
  remove(){if(this.parent){const i=this.parent.children.indexOf(this);if(i>=0)this.parent.children.splice(i,1);this.parent=null;}},
  focus(){},onclick:null};}
const tous=n=>[n].concat(...n.children.map(tous));
let corps,ecoute;
function monte(){
  corps=noeud('body');ecoute=[];
  sb.document.createElement=noeud;sb.document.body=corps;
  sb.document.addEventListener=(t,f)=>ecoute.push(f);
  sb.document.removeEventListener=(t,f)=>{ecoute=ecoute.filter(x=>x!==f);};
  sb._dialogue=sb.__dialogueReel;
}
const vraiDialogue=sb._dialogue,vraiDoc=Object.assign({},sb.document);
function demonte(){sb._dialogue=vraiDialogue;Object.assign(sb.document,vraiDoc);X('_dlgFile=[];_dlgOuvert=false;');}
const fenetre=()=>corps.children.find(c=>c.id==='dz-dlg');
const boutons=()=>tous(fenetre()).filter(n=>n.tag==='button');
const cls=c=>n=>n.className.split(' ').indexOf(c)>=0;
const tick=()=>new Promise(r=>setImmediate(r));

console.log('\n=== IVA. Fenetres maison ===');
t('*** confirmer : le bouton d\'action resout true, Annuler false ***',async()=>{
  monte();try{
    let r1,r2;
    X('_confirmer')('Supprimer ?',{ok:'Supprimer',danger:true}).then(v=>{r1=v;});
    eq(boutons().map(b=>b.textContent).join('|'),'Annuler|Supprimer');
    boutons()[1].onclick();await tick();eq(r1,true);
    eq(fenetre(),undefined,'fenetre pas retiree');
    X('_confirmer')('Vraiment ?').then(v=>{r2=v;});
    boutons()[0].onclick();await tick();eq(r2,false);
  }finally{demonte();}
});
t('le bouton de suppression est rouge, les autres dores',()=>{
  monte();try{
    X('_confirmer')('A ?',{ok:'Supprimer',danger:true});
    if(!cls('dz-dlg-danger')(boutons()[1]))throw new Error('pas rouge');
    X('_dlgFile=[];_dlgOuvert=false;');corps.children.length=0;
    X('_confirmer')('B ?',{ok:'Ajouter'});
    if(!cls('dz-dlg-ok')(boutons()[1]))throw new Error('pas dore');
  }finally{demonte();}
});
t('*** deux fenetres a la suite : la seconde attend la premiere ***',async()=>{
  monte();try{
    const ordre=[];
    X('_alerte')('Un').then(()=>ordre.push(1));
    X('_alerte')('Deux').then(()=>ordre.push(2));
    eq(corps.children.length,1,'deux fenetres ouvertes en meme temps');
    eq(tous(fenetre()).find(cls('dz-dlg-titre')).textContent,'Un');
    boutons()[0].onclick();await tick();
    eq(tous(fenetre()).find(cls('dz-dlg-titre')).textContent,'Deux');
    boutons()[0].onclick();await tick();
    eq(ordre.join(),'1,2');eq(corps.children.length,0);
  }finally{demonte();}
});
t('*** le texte n\'est jamais interprete comme du HTML ***',()=>{
  monte();try{
    X('_alerte')('<img src=x onerror=alert(1)>\n\n<b>corps</b>');
    const t1=tous(fenetre()).find(cls('dz-dlg-titre')),c1=tous(fenetre()).find(cls('dz-dlg-corps'));
    eq(t1.textContent,'<img src=x onerror=alert(1)>');eq(c1.textContent,'<b>corps</b>');
    if(/innerHTML/.test(X('_dlgSuivant.toString()')))throw new Error('innerHTML utilise');
  }finally{demonte();}
});
t('premier paragraphe = titre, la suite = corps',()=>{
  monte();try{
    X('_confirmer')('Titre ?\n\nLigne 1\n\nLigne 2');
    eq(tous(fenetre()).find(cls('dz-dlg-titre')).textContent,'Titre ?');
    eq(tous(fenetre()).find(cls('dz-dlg-corps')).textContent,'Ligne 1\n\nLigne 2');
  }finally{demonte();}
});
t('espaces insecables avant ? ! : et apres «',()=>{
  monte();try{
    X('_alerte')('Retirer « Poulet » du repas ?');
    eq(tous(fenetre()).find(cls('dz-dlg-titre')).textContent,'Retirer « Poulet » du repas ?');
  }finally{demonte();}
});
t('espace insecable entre un nombre et son unite',()=>{
  monte();try{
    X('_alerte')('« Poulet » est déjà en stock (500 g).');
    eq(tous(fenetre()).find(cls('dz-dlg-titre')).textContent,'«\u00a0Poulet\u00a0» est déjà en stock (500\u00a0g).');
  }finally{demonte();}
});
t('Echap : false pour une question, true pour une information',async()=>{
  monte();try{
    let a,b;
    X('_confirmer')('Q ?').then(v=>{a=v;});
    ecoute[0]({key:'Escape',preventDefault(){}});await tick();eq(a,false);
    X('_alerte')('Info').then(v=>{b=v;});
    ecoute[0]({key:'Escape',preventDefault(){}});await tick();eq(b,true);
    eq(ecoute.length,0,'ecouteur clavier pas retire');
  }finally{demonte();}
});
t('export impossible : texte a copier et bouton Copier',async()=>{
  monte();let copie=null;sb.navigator.clipboard={writeText:async x=>{copie=x;}};
  try{
    X('_dialogue')({message:'Copie tes données\n\nx',texte:'{"a":1}',copier:true,ok:'Fermer'});
    const ta=tous(fenetre()).find(n=>n.tag==='textarea');
    eq(ta.value,'{"a":1}');eq(ta.readOnly,true);
    const bc=boutons().find(b=>b.textContent==='Copier');bc.onclick();await tick();
    eq(copie,'{"a":1}');
  }finally{delete sb.navigator.clipboard;demonte();}
});
t('*** plus aucune fenetre systeme dans le script ***',()=>{
  const m=script.match(/(^|[^A-Za-z_.$])(alert|confirm|prompt)\(/g);
  if(m)throw new Error(m.length+' appel(s) : '+m.join(' '));
});

console.log('\n=== IVB. Lisibilite ===');
function lum(h){return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(c=>c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)).reduce((s,c,i)=>s+c*[0.2126,0.7152,0.0722][i],0);}
function contraste(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
const tok=n=>src.match(new RegExp('--'+n+': (#[0-9A-Fa-f]{6})'))[1];
t('*** --text3 contraste a 4,5:1 au moins sur les trois fonds ***',()=>{
  ['bg','bg2','bg3'].forEach(f=>{const c=contraste(tok('text3'),tok(f));if(c<4.5)throw new Error(f+' : '+c.toFixed(2));});
});
function declaration(s,i){
  const a=Math.max(s.lastIndexOf('"',i),s.lastIndexOf("'",i),s.lastIndexOf('{',i),s.lastIndexOf('`',i));
  const fins=['"',"'",'}','`'].map(c=>s.indexOf(c,i)).filter(x=>x>=0);
  return s.slice(a,Math.min(...fins));
}
t('*** aucun texte sous 10 px ***',()=>{
  const m=[...src.matchAll(/font-size: ?(\d+(?:\.\d+)?)px/g)].filter(x=>+x[1]<10);
  if(m.length)throw new Error(m.length+' occurrence(s), ex. '+m[0][0]);
});
t('10 px reserve aux libelles en majuscules, le reste a 11 px minimum',()=>{
  const m=[...src.matchAll(/font-size: ?(\d+(?:\.\d+)?)px/g)].filter(x=>+x[1]<11&&declaration(src,x.index).indexOf('uppercase')<0);
  if(m.length)throw new Error(m.length+' texte(s) sous 11 px hors majuscules : '+declaration(src,m[0].index).slice(0,80));
});

(async()=>{
  for(const [n,f] of tests){
    try{await f();pass++;console.log('  ok  '+n);}
    catch(e){fail++;console.log('  KO  '+n+' : '+e.message);}
  }
  console.log('---- '+pass+' ok, '+fail+' KO');
})();
