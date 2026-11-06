import sys
from pypdf import PdfReader, PdfWriter
src, fond, out = sys.argv[1:4]
c = PdfReader(src)
w = PdfWriter(clone_from=fond)          # fond creme + pied de page
assert len(w.pages) == len(c.pages), (len(w.pages), len(c.pages))
for i in range(len(w.pages)):
    w.pages[i].merge_page(c.pages[i])   # le contenu passe par-dessus le fond
    w.pages[i].compress_content_streams()
w.add_metadata({'/Title': "Dorayaki — Guide d'utilisation", '/Author': 'Dorayaki', '/Subject': "Guide d'utilisation de l'application Dorayaki (novembre 2026)", '/Keywords': 'Dorayaki, suivi calorique, recettes, inventaire, guide', '/Creator': 'Dorayaki', '/Producer': 'Chromium + pypdf'})
w.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
with open(out, 'wb') as fh:
    w.write(fh)
print('ok', out, len(w.pages))
