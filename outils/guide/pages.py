# Repere la page de chaque titre dans le PDF (premiere passe), via pdftotext
import sys,json,re,subprocess
pdf,titres,out=sys.argv[1:4]
T=json.load(open(titres,encoding='utf-8'))
norm=lambda s:re.sub(r'[\s  ]+','',s).lower()
brut=subprocess.run(['pdftotext','-layout',pdf,'-'],capture_output=True,text=True).stdout
textes=[norm(p) for p in brut.split('\f')]
debut=next(i for i,t in enumerate(textes) if t.startswith(norm('0Démarrage rapide')))
res={};manque=[]
for t in T:
    cible=norm(t['txt']);trouve=None
    for i in range(debut,len(textes)):
        if t['cle'].startswith('h1:'):
            if textes[i].startswith(cible[:25]): trouve=i;break
        elif cible in textes[i]: trouve=i;break
    if trouve is None: manque.append(t['txt'])
    else: res[t['cle']]=trouve+1
json.dump(res,open(out,'w'),ensure_ascii=False)
print(len(res),'/',len(T),'titres places, pages',len([t for t in textes if t]),'| manquants :',manque)
