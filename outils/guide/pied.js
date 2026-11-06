// Pieds de page : un PDF transparent de N pages A4, a fusionner sur le guide (page 1 = couverture, sans pied)
const {chromium}=require('playwright');
const [,,n,out]=process.argv;const N=+n;
(async()=>{
  const b=await chromium.launch();const p=await b.newPage();
  let pages='';
  for(let i=1;i<=N;i++){
    pages+='<div class="pg">'+(i>1?'<div class="pied"><span>Dorayaki · Guide d’utilisation</span><span>'+i+' / '+N+'</span></div>':'')+'</div>';
  }
  await p.setContent(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>
    @page{size:A4;margin:0}html,body{margin:0;background:transparent}
    .pg{width:210mm;height:297mm;position:relative;page-break-after:always;overflow:hidden;background:#F1E9DC}
    .pg:last-child{page-break-after:auto}
    .pied{position:absolute;left:15mm;right:15mm;bottom:8mm;display:flex;justify-content:space-between;
      font-family:'Inter',sans-serif;font-size:7.8pt;color:#8A7F74;border-top:0.3mm solid #E6DDD2;padding-top:2mm;font-variant-numeric:tabular-nums}
  </style></head><body>${pages}</body></html>`);
  await p.pdf({path:out,format:'A4',printBackground:true,preferCSSPageSize:true});
  await b.close();console.log('pied',out,N);
})();
