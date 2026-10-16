// Ligne « Fibres » des fenetres d'ajout : jamais sur la grille des macros du dessus (16/10/2026)
const fs=require('fs');
let pass=0,fail=0;
function t(n,f){try{f();console.log('  ok  '+n);pass++;}catch(e){console.log('  KO  '+n+' -> '+e.message);fail++;}}
const h=fs.readFileSync('index.html','utf8');
console.log('\n=== LXX. Champs Fibres : pas de chevauchement ===');
['ai-m-fib','item-fib','addmeal-fib'].forEach(function(id){
  t('*** '+id+' : au moins 6 px sous la grille des macros ***',function(){
    var i=h.indexOf('<label for="'+id+'"');if(i<0)throw new Error('champ absent');
    var ligne=h.slice(h.lastIndexOf('<div',i),i);
    var mt=+((ligne.match(/margin:(-?\d+)px/)||[0,0])[1]);
    var g=h.lastIndexOf('display:grid',i),grille=h.slice(h.lastIndexOf('<div',g),h.indexOf('>',g));
    var mb=+((grille.match(/margin-bottom:(\d+)px/)||[0,0])[1]);
    if(mb+mt<6)throw new Error('espace '+(mb+mt)+' px (grille '+mb+', ligne '+mt+') : la ligne remonte sur la grille');
  });
});
console.log('---- '+pass+' ok, '+fail+' KO');
