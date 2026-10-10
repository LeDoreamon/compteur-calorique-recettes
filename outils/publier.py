#!/usr/bin/env python3
"""Prepare une publication : build a l'heure de Paris aux quatre endroits et
entree NOUVEAUTES en tete. A lancer depuis la racine du depot.

  python3 outils/publier.py "Ce qui change, en clair." "Un autre point."
  python3 outils/publier.py --muet        # rien de visible pour les autres comptes

Le build est toujours posterieur au precedent (au besoin, une minute de plus).
"""
import re, sys, datetime
from zoneinfo import ZoneInfo

def main(args):
    muet = '--muet' in args
    points = [a for a in args if a != '--muet']
    if not muet and not points:
        sys.exit('Indique au moins un point, ou --muet.')
    h = open('index.html', encoding='utf-8').read()
    s = open('sw.js', encoding='utf-8').read()
    ancien = re.search(r"const BUILD_ID='(\d{4}-\d\d-\d\d-\d{4})';", h).group(1)
    t = datetime.datetime.now(ZoneInfo('Europe/Paris')).replace(second=0, microsecond=0)
    prec = datetime.datetime.strptime(ancien, '%Y-%m-%d-%H%M').replace(tzinfo=t.tzinfo)
    if t <= prec:
        t = prec + datetime.timedelta(minutes=1)
    bid, lib = t.strftime('%Y-%m-%d-%H%M'), t.strftime('%Y-%m-%d %Hh%M')
    a_lib = ancien[:10] + ' ' + ancien[11:13] + 'h' + ancien[13:]
    rempl = [
        (h, "build " + a_lib, "build " + lib),
        (h, "const BUILD_ID='%s';" % ancien, "const BUILD_ID='%s';" % bid),
    ]
    rempl.append((h, 'catalogue.js?v=%s"' % ancien, 'catalogue.js?v=%s"' % bid))   # le catalogue suit le build
    for _, a, b in rempl:
        assert h.count(a) == 1, 'ancre introuvable : ' + a
        h = h.replace(a, b)
    def js(x):
        return "'" + x.replace('\\', '\\\\').replace("'", "’") + "'"
    entree = "  {b:'%s',points:[%s]},\n" % (bid, '' if muet else ('\n    ' + ',\n    '.join(js(p) for p in points) + '\n  '))
    assert h.count('const NOUVEAUTES=[\n') == 1
    h = h.replace('const NOUVEAUTES=[\n', 'const NOUVEAUTES=[\n' + entree)
    for a, b in [("// build " + a_lib, "// build " + lib), ("macros-" + ancien, "macros-" + bid)]:
        assert s.count(a) == 1, 'ancre sw.js introuvable : ' + a
        s = s.replace(a, b)
    open('index.html', 'w', encoding='utf-8').write(h)
    open('sw.js', 'w', encoding='utf-8').write(s)
    print('build', ancien, '->', bid, '(muet)' if muet else '(%d point(s))' % len(points))

if __name__ == '__main__':
    main(sys.argv[1:])
