#!/usr/bin/env bash
# Rejoue toutes les suites. A lancer depuis la racine du depot, avec index.html present.
# Toutes les suites tests/tN.js sont jouees, dans l'ordre numerique (plus de liste a tenir).
# Code de sortie 1 si un test echoue ou si une suite plante avant son bilan (utilise par la CI).
cd "$(dirname "$0")/.." || exit 1
[ -f index.html ] || { echo "index.html absent"; exit 1; }
cp tests/*.js tests/audit.py . 2>/dev/null; mkdir -p data && cp tests/data/* data/ 2>/dev/null
python3 -c "
import re;h=open('index.html',encoding='utf-8').read()
m=re.search(r'<script>(.*?)</script>',h,re.DOTALL)
open('/tmp/c.js','w',encoding='utf-8').write(m.group(1))" || exit 1
node --check /tmp/c.js || { echo "SYNTAXE KO"; exit 1; }
node --check catalogue.js || { echo "SYNTAXE catalogue.js KO"; exit 1; }
echo "syntaxe ok"
tot=0; ko=0; plantees=""
for f in $(ls tests/t[0-9]*.js | sed 's#tests/##;s#\.js$##' | sort -V); do
  out=$(node "$f.js" 2>&1 | grep -oP "^---- .*" | tail -1)
  if [ -z "$out" ]; then
    echo "$f : PLANTEE (aucun bilan)"; plantees="$plantees $f"; ko=$((ko+1)); continue
  fi
  echo "$f : $out"
  n=$(echo "$out" | grep -oP "\\d+(?= ok)"); k=$(echo "$out" | grep -oP "\\d+(?= KO)")
  tot=$((tot+${n:-0})); ko=$((ko+${k:-0}))
done
echo "-----"
echo "TOTAL : $tot tests, $ko echecs"
[ -n "$plantees" ] && echo "Suites plantees :$plantees"
[ "$ko" -eq 0 ]
