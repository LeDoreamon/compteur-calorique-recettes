# Guide d'utilisation (guide.pdf)

`guide.pdf`, a la racine, est le guide servi par le lien « 📖 Guide d'utilisation (PDF) » des Reglages.

- `guide.html` : le texte et la mise en page (A4). A modifier quand l'appli change.
- `demo.json` : etat du compte d'exemple fictif « Alex » (aucune donnee personnelle). `demo.js` le regenere
  depuis une sauvegarde (`node demo.js <depot> <sauvegarde.json> demo.json`) : la sauvegarde ne doit **jamais** etre commitee.
- `shots.js` : captures 390 x 844 de l'appli du depot, Firebase simule par interception des requetes.
- `build.js` + `pages.py` : HTML vers PDF en deux passes (numeros de page du sommaire).
- `pied.js` + `tampon.py` : fond creme et pied de page « Dorayaki · Guide d'utilisation · N / total ».

Refaire le PDF : `bash outils/guide/fabriquer.sh` depuis la racine (verifier ensuite qu'aucune page ne reste presque vide).
