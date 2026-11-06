#!/bin/bash
# Refait guide.pdf (guide d'utilisation, lien dans Reglages) a partir de guide.html et de l'appli du depot.
# Usage, depuis la racine du depot :  bash outils/guide/fabriquer.sh
# Il faut : Chromium + Playwright (require('playwright')), ImageMagick (convert), poppler (pdftotext, pdfinfo),
# et un Python avec pypdf (PY=/usr/bin/python3 par defaut si present).
# Tout se fabrique dans un dossier de travail temporaire ; seul guide.pdf est ecrit dans le depot.
set -euo pipefail
REPO=$(pwd); SRC="$REPO/outils/guide"; W="${TMPDIR:-/tmp}/dz-guide"
PY="${PY:-$( [ -x /usr/bin/python3 ] && echo /usr/bin/python3 || echo python3 )}"
[ -f "$REPO/index.html" ] || { echo "a lancer depuis la racine du depot"; exit 1; }
rm -rf "$W"; mkdir -p "$W"; cp "$SRC"/* "$W"/; cp "$REPO/icon-512.png" "$W/icon.png"; cd "$W"
node shots.js "$REPO" demo.json img                          # 47 captures 390x844 du compte d'exemple « Alex »
mkdir -p imgj; for f in img/*.png; do convert "$f" -resize 500x -quality 80 -strip "imgj/$(basename "$f" .png).jpg"; done
node build.js guide.html passe1.pdf                          # 1re passe : ou tombe chaque titre ?
"$PY" pages.py passe1.pdf _titres.json pages.json
node build.js guide.html passe2.pdf pages.json               # 2e passe : sommaire numerote
"$PY" pages.py passe2.pdf _titres.json pages2.json
cmp -s pages.json pages2.json || echo "ATTENTION : numeros de page instables, relancer"
N=$(pdfinfo passe2.pdf | awk '/^Pages/{print $2}')
node pied.js "$N" pied.pdf                                   # fond creme + pied de page
"$PY" tampon.py passe2.pdf pied.pdf "$REPO/guide.pdf"
echo "guide.pdf : $N pages"
