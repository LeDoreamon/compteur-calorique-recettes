# -*- coding: utf-8 -*-
import re, collections, sys
h = open('index.html', encoding='utf-8').read()
script = re.search(r'<script>(.*?)</script>', h, re.DOTALL).group(1)
html_only = h.replace(script, '')

def head(title): print("\n" + "="*70 + "\n" + title + "\n" + "="*70)

# ── 1. Handlers inline pointant vers des fonctions inexistantes ─────────────
head("1. HANDLERS -> FONCTION INEXISTANTE")
defined = set(re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)', script))
defined |= set(re.findall(r'(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:function|\()', script))
defined |= set(re.findall(r'window\.([A-Za-z_$][\w$]*)\s*=', script))
BUILTIN = {'alert','confirm','prompt','event','this','parseInt','parseFloat','Math','JSON',
           'console','Number','String','Boolean','Array','Object','Date','setTimeout','document'}
handlers = re.findall(r'on(?:click|change|input|keydown|keyup|submit)="([^"]+)"', h)
missing = collections.Counter()
for hd in handlers:
    for fn in re.findall(r'\b([A-Za-z_$][\w$]*)\s*\(', hd):
        if fn not in defined and fn not in BUILTIN:
            missing[fn] += 1
print(missing.most_common() or "aucun")

# ── 2. Fonctions definies plusieurs fois (la derniere ecrase les autres) ────
head("2. FONCTIONS DEFINIES PLUSIEURS FOIS")
cnt = collections.Counter(re.findall(r'^\s*function\s+([A-Za-z_$][\w$]*)', script, re.M))
dups = {k: v for k, v in cnt.items() if v > 1}
print(dups or "aucune")

# ── 3. IDs dupliques dans le HTML statique ─────────────────────────────────
head("3. IDs DUPLIQUES (HTML statique)")
ids = collections.Counter(re.findall(r'\sid="([^"]+)"', html_only))
print({k: v for k, v in ids.items() if v > 1} or "aucun")

# ── 4. getElementById sur un id qui n'existe nulle part ────────────────────
head("4. getElementById -> ID INTROUVABLE")
static_ids = set(re.findall(r'\sid="([^"]+)"', h))          # tout le fichier
tmpl_ids   = set(re.findall(r"id=[\"']?([a-zA-Z][\w-]*)", script))
tmpl_ids  |= set(re.findall(r"id=\\?[\"']([a-zA-Z][\w-]*)", script))
known = static_ids | tmpl_ids
used = set(re.findall(r"getElementById\(\s*['\"]([^'\"]+)['\"]\s*\)", script))
unknown = sorted(used - known)
print(unknown or "aucun")

# ── 5. Assignations globales implicites (oubli de var/let/const) ────────────
head("5. GLOBALES IMPLICITES PROBABLES")
# heuristique : identifiant assigne en debut de ligne sans declaration ni point
decl = set(re.findall(r'\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)', script))
decl |= set(re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)', script))
decl |= set(re.findall(r'function\s*\(([^)]*)\)', script)[0].split(',')) if re.search(r'function\s*\(', script) else set()
suspects = collections.Counter()
for m in re.finditer(r'^\s{0,4}([A-Za-z_$][\w$]*)\s*=[^=]', script, re.M):
    n = m.group(1)
    if n not in decl and n not in BUILTIN and not n.startswith('_'):
        suspects[n] += 1
print(suspects.most_common(15) or "aucune")

# ── 6. Fonctions jamais referencees (code mort) ────────────────────────────
head("6. FONCTIONS JAMAIS APPELEES")
allfn = sorted(set(re.findall(r'^\s*function\s+([A-Za-z_$][\w$]*)', script, re.M)))
dead = []
for fn in allfn:
    uses = len(re.findall(r'\b' + re.escape(fn) + r'\b', h))
    if uses <= 1:
        dead.append(fn)
print(dead or "aucune")

# ── 7. Sequences \uXXXX hors du <script> ───────────────────────────────────
head("7. \\uXXXX HORS SCRIPT")
bad = re.findall(r'\\u[0-9a-fA-F]{4}', html_only)
print(sorted(set(bad)) or "aucune")

# ── 8. Cles / secrets en clair ─────────────────────────────────────────────
head("8. SECRETS EN CLAIR DANS LE FICHIER PUBLIC")
for pat, label in [(r'gsk_[A-Za-z0-9]{20,}', 'cle Groq'),
                   (r'ghp_[A-Za-z0-9]{20,}', 'PAT GitHub'),
                   (r'AIza[A-Za-z0-9_\-]{30,}', 'cle Firebase'),
                   (r'[0-9a-zA-Z]{40}(?=["\'])', 'secret 40 car.')]:
    f = re.findall(pat, h)
    if f: print(f"  {label} : {len(f)} occurrence(s) -> {f[0][:12]}...")
print("(fin)")

# ── 9. try/catch vides qui avalent les erreurs ─────────────────────────────
head("9. CATCH VIDES")
print(len(re.findall(r'catch\s*\([^)]*\)\s*\{\s*\}', script)), "catch strictement vides")

# ── 10. Taille et structure ────────────────────────────────────────────────
head("10. VOLUMETRIE")
print(f"  fichier   : {len(h):,} caracteres")
print(f"  script    : {len(script):,} caracteres ({100*len(script)//len(h)} %)")
print(f"  fonctions : {len(allfn)}")
print(f"  handlers inline : {len(handlers)}")
