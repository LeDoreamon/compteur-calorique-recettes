#!/usr/bin/env bash
# Rejoue toutes les suites. A lancer depuis la racine du depot, avec index.html present.
cd "$(dirname "$0")/.." || exit 1
[ -f index.html ] || { echo "index.html absent"; exit 1; }
cp tests/*.js tests/audit.py . 2>/dev/null; mkdir -p data && cp tests/data/* data/ 2>/dev/null
python3 -c "
import re;h=open('index.html',encoding='utf-8').read()
m=re.search(r'<script>(.*?)</script>',h,re.DOTALL)
open('/tmp/c.js','w',encoding='utf-8').write(m.group(1))" || exit 1
node --check /tmp/c.js || { echo "SYNTAXE KO"; exit 1; }
echo "syntaxe ok"
tot=0; ko=0
for f in t2 t3 t4 t5 t6 t7 t8 t9 t10 t11 t12 t13 t14 t15 t16 t17 t18 t19 t20 t21 t22 t23 t24 t25 t26 t27 t28 t29 t30 t31 t32; do
  [ -f "$f.js" ] || continue
  out=$(node "$f.js" 2>&1 | grep -oP "^---- .*" | tail -1)
  echo "$f : $out"
  n=$(echo "$out" | grep -oP "\\d+(?= ok)"); k=$(echo "$out" | grep -oP "\\d+(?= KO)")
  tot=$((tot+${n:-0})); ko=$((ko+${k:-0}))
done
echo "-----"
echo "TOTAL : $tot tests, $ko echecs"
