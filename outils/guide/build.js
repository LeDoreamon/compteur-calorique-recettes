// guide.html -> PDF (Chromium). Sommaire construit depuis les titres ; numeros de page passes en argument (JSON)
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const [entree,sortie,pagesJson]=process.argv.slice(2);
let h=fs.readFileSync(entree,'utf8');
/* typographie francaise : espaces insecables, seulement dans le texte (pas dans le CSS ni les balises) */
const i=h.indexOf('</style>')+8;
const corps=h.slice(i).replace(/>([^<]+)</g,(m,t)=>'>'+t.replace(/ ([:;!?»])/g,' $1').replace(/« /g,'« ').replace(/(\d) (kcal|g|kg|%|mm|cm|min|jours?|j|pas|ml|h)\b/g,'$1 $2').replace(/(\d) (\d{3})\b/g,'$1 $2')+'<');
h=h.slice(0,i)+corps;
h=h.replace(/src="img\/([0-9a-z-]+)\.png"/g,'src="imgj/$1.jpg"');   /* JPEG reduits : PDF plus leger */
const tmp=path.join(path.dirname(entree),'_rendu.html');fs.writeFileSync(tmp,h);
const pages=pagesJson&&fs.existsSync(pagesJson)?JSON.parse(fs.readFileSync(pagesJson,'utf8')):{};
(async()=>{
  const b=await chromium.launch();const p=await b.newPage();
  await p.goto('file://'+path.resolve(tmp));await p.waitForTimeout(800);
  const titres=await p.evaluate((pages)=>{
    const toc=document.getElementById('toc');const out=[];let ul=null;
    document.querySelectorAll('.partie h1.h-partie, .partie h2').forEach(e=>{
      if(e.tagName==='H1'){const n=e.querySelector('.num').textContent,t=e.textContent.slice(n.length).trim();
        const li=document.createElement('li');li.innerHTML='<span class="t">'+n+'. '+t+'</span><span class="pts"></span><span class="pg">'+(pages['h1:'+n]||'')+'</span>';
        toc.appendChild(li);ul=document.createElement('ul');ul.className='sous-toc';toc.appendChild(ul);out.push({cle:'h1:'+n,txt:n+t});}
      else{const nn=e.querySelector('.n');if(!nn)return;const n=nn.textContent,t=e.textContent.slice(n.length).trim();
        const li=document.createElement('li');li.style.display='flex';li.style.gap='6px';li.innerHTML='<span class="t">'+n+' '+t+'</span><span class="pts"></span><span class="pg">'+(pages['h2:'+n]||'')+'</span>';
        ul.appendChild(li);out.push({cle:'h2:'+n,txt:n+t});}
    });return out;},pages);
  fs.writeFileSync(path.join(path.dirname(entree),'_titres.json'),JSON.stringify(titres));
  await p.pdf({path:sortie,format:'A4',printBackground:true,preferCSSPageSize:true});
  await b.close();console.log('pdf',sortie,titres.length,'titres');
})().catch(e=>{console.error(e);process.exit(1);});
