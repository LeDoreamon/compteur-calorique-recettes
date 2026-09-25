# Dorayaki — fiche de reprise

Claude Code charge ce fichier automatiquement au début de chaque session ouverte sur ce dépôt.
**Il est public** (GitHub Pages le sert comme le reste du dépôt) : n'y écrire aucun secret. Les clés restent dans l'appli et dans la console Firebase.

## 1. Le projet

Dorayaki est une PWA de suivi calorique que je (Liam) développe pour moi. Des comptes identifiant + mot de passe permettent à d'autres personnes de s'inscrire.

- Dépôt : `LeDoreamon/compteur-calorique-recettes` (branche `main`, publiée par GitHub Pages)
- En ligne : https://ledoreamon.github.io/compteur-calorique-recettes/
- Architecture : un unique `index.html` (~550 ko, HTML + CSS + JS inline), plus `sw.js`, `manifest.json` et `zxing.min.js` (chargé à la demande)
- Données : Firebase Realtime Database, via l'API REST (`fetch`, pas de SDK)
- IA : Groq (analyse de repas, génération de recettes, analyse photo, macros, estimation d'activité)
- J'utilise : iPhone (PWA installée) et PC Windows
- Build en ligne : celui de `sw.js` sur `main` (ligne `// build …`)

## 2. Comptes et Firebase

- Auth Firebase par API REST : `accounts:signUp`, `signInWithPassword`, `update`, `sendOobCode`, et `securetoken` pour rafraîchir le jeton.
- La session est stockée dans `localStorage.dz_auth = {uid, rtok, login}`. Le mot de passe n'est jamais stocké.
- Adresse technique `login@dorayaki.app` (`_emailDe`), sauf si l'identifiant est déjà un e-mail.
- Données de chaque compte sous `users/<uid>/` : `state`, `burn`, `photos`, `filet`, `backups`, `progres` et `progresMini` (photos de progression, hors de l'état : clé `AAAA-MM-JJ_pose`, pose = face, profil ou dos).
- Règles Firebase en place : seul `users/$uid` est accessible (`auth.uid === $uid`), tout le reste est fermé. Conséquence : `/liam` (ancien profil) et `/maureen` sont verrouillés. Le code de rattachement et le mode « profil hérité » ne fonctionnent donc plus ; c'est normal, la migration est terminée. **Ne pas supprimer ces nœuds** : c'est à moi d'en décider.
- `fbUrl(path)` ajoute `?auth=<idToken>`. Si `securetoken` refuse le jeton pour de bon (400 `TOKEN_EXPIRED`, `INVALID_REFRESH_TOKEN`, `MISSING_REFRESH_TOKEN`, `USER_DISABLED`, `USER_NOT_FOUND`, `INVALID_GRANT`), `_sessionExpiree()` rouvre l'écran de connexion.
- Code de rattachement : seule son empreinte SHA-256 figure dans le code (`CODE_RATTACHEMENT_SHA256`). **Ne jamais écrire le code en clair.**
- La clé Groq est stockée dans `localStorage.anthropic_key` et synchronisée dans `state.groqKey` (lisible par moi seul grâce aux règles). Elle est retirée des exports `.json`, ignorée à l'import, et effacée à la déconnexion ainsi qu'à la reconnexion sur un autre compte après une session expirée.

## 3. Modèles Groq

- `openai/gpt-oss-20b` par défaut, `openai/gpt-oss-120b` pour l'analyse de repas.
- `MODELE_VISION='qwen/qwen3.8-27b'` pour les photos.
- `reasoning_effort` : gpt-oss n'accepte que `low`, `medium` ou `high` ; seul qwen accepte `none`.
- Piège : chez gpt-oss, la réflexion compte dans `max_tokens`. Un budget trop juste donne une réponse vide avec `finish_reason: "length"`. `callAI` relance alors une fois avec un budget plus large. Ne pas redescendre les budgets sous environ 400 (tous les appels actuels sont à 400 ou plus).
- `callAI` renvoie `{content:[{type:'text',text}], finish_reason, truncated, empty}`. Le texte s'obtient par `rep.content.map(b=>b.text).join('')`. Tester `rep.empty` **avant** `extractJSON`, qui lève une exception sur un texte vide.

## 4. Méthode de travail (à respecter)

- En français, concis et direct, sans compliments creux.
- Diagnostiquer avant de corriger : lire le code concerné, prouver la cause, puis agir.
- Dire franchement quand quelque chose ne va pas, y compris une de mes idées ou une erreur de ta part.
- Signaler les problèmes annexes repérés en chemin.
- Tester avant de publier et me donner le nombre de tests passés.
- Modifications par ancres uniques (voir 5b) ; chercher ce qui existe déjà avant d'ajouter une fonction ou un réglage (il y a déjà eu un doublon de sélecteur de catégorie).
- **Validation** :
  - Correctifs (bug, faille, test, doc) : Claude commite, ouvre la PR et la fusionne lui-même une fois tous les tests verts, puis me donne le résultat.
  - Amélioration ou modification majeure (nouvelle fonction, refonte, changement de données ou de règles Firebase, suppression) : proposer d'abord et attendre mon accord sur l'idée. Une fois l'idée validée, Claude fusionne d'office dès que les tests sont verts, puis m'envoie des captures d'écran ; on corrige ensuite si besoin (règle du 25/09/2026).
  - Captures : rendu Chromium au format iPhone (390 × 844), Firebase simulé par interception des requêtes. La police Linux est plus large que celle de l'iPhone.

## 5. Cycle de travail

### a. Tests

```bash
bash tests/run.sh      # depuis la racine du depot
```

- Le script vérifie la syntaxe du script inline (`node --check`), puis joue `tests/t2.js` à `tests/t64.js` dans un bac à sable `vm` avec un faux DOM (`tests/sb.js`).
- Attendu : 0 échec (1193 tests au 25/09/2026).
- Le script copie les tests à la racine pour les exécuter, ce qui pollue le dépôt. Deux options :
  - le lancer dans une copie : `rm -rf /tmp/dz && cp -r . /tmp/dz && bash /tmp/dz/tests/run.sh` ;
  - ou supprimer les copies ensuite : `rm -f t*.js sb.js audit.py; rm -rf data`.
- Toute nouvelle suite doit être ajoutée à la boucle `for f in t2 … t64` de `run.sh` et au tableau de `tests/README.md`.
- Dans un test, `X("nom")` (`vm.runInContext`) lit directement fonctions, `var`, `let` et `const`. Le tableau d'export au début de `tests/sb.js` n'est utile que pour y accéder sous la forme `sb.nom`.
- `python3 tests/audit.py` fait un audit statique : handlers orphelins, fonctions en double, `\uXXXX` hors script, catch vides, etc.

### b. Modifier par ancres uniques

```python
def ro(old,new,label):
    global h
    c=h.count(old); assert c==1,"COUNT %d [%s]"%(c,label)
    h=h.replace(old,new); print("ok:",label)
```

Si une assertion échoue, le fichier n'est pas écrit : tout rejouer.

### c. Publier

- Incrémenter le build à trois endroits : `build AAAA-MM-JJ HHhMM` dans `index.html` (bloc profil), et dans `sw.js` la ligne `// build …` ainsi que `const CACHE='macros-AAAA-MM-JJ-HHMM';`.
- Terminer chaque message de commit par les lignes d'attribution demandées par la session.
- GitHub Pages republie depuis `main`. Si la session ne peut pousser que sur une branche : ouvrir une PR, puis la fusionner (voir section 4).
- Une fois la PR fusionnée, repartir de `main` pour la suite (`git fetch origin main && git checkout -B <branche> origin/main`).

## 6. Pièges connus

1. `\uXXXX` n'est pas interprété dans le HTML hors `<script>` : écrire emojis et accents en clair. Un test le vérifie.
2. Un commentaire `//` inséré sur une ligne existante avale la suite de la ligne : utiliser `/* */`.
3. Garde nocturne : avant 4 h (heure du profil), un repas ajouté « aujourd'hui » déclenche la question « hier ou aujourd'hui ? » (`heureProfil()<4`). Dans les tests, surcharger `Date` (`sb.js` fige l'horloge à midi).
4. `qty: -1` en base signifie un stock illimité (`null` en mémoire). La conversion se fait au chargement et à l'enregistrement.
5. Neutralisation : tout ce qui vient de Firebase, d'un import, de l'IA (`extractJSON`) ou d'OpenFoodFacts passe par `_neutre` (`<`→`‹`, `>`→`›`, `"`→`”`). Le HTML est construit par concaténation et `innerHTML` : ne jamais y insérer une donnée externe non neutralisée.
6. Clés Firebase interdites (`. # $ / [ ]`) : neutralisées par `_cleFB` et `_assainirCles`, sinon Firebase refuse tout l'état en HTTP 400.
7. `_applyState` ignore un état dont `_profile` ne correspond pas au profil ouvert. Les restaurations volontaires réétiquettent l'état (`_restaurerSauvegarde`).
8. Photos : cascade photo de l'utilisateur, puis `LIENS_IMAGES` (Wikimedia, vérifiés au démarrage), puis `illustrationRecette(r)`. Seules des `data:image/(jpeg|png|webp);base64` sont acceptées (`_photosSures`). Le compteur `_photosGen` empêche un chargement périmé d'écraser une restauration.
9. Synchronisation : révision (`state.rev`) et volume (`state.vol`) protègent contre l'écrasement entre appareils (`_saveStateNow`, `_onSaveConflict`, `_checkFresherOnResume`). Les `saveState()` sont mis en file.
10. Fenêtres : ne jamais utiliser `alert`, `confirm` ou `prompt` (boîte système grise sur iPhone). Utiliser `_alerte(msg)` et `_confirmer(msg,{ok,annuler,danger})`, qui renvoient une promesse : `.then(function(ok){…})` dans une fonction synchrone, `await` dans une fonction `async`. Le premier paragraphe du message (avant une ligne vide) sert de titre. Dans les tests, `sb.js` les fait répondre tout de suite via `sb.confirm` / `sb.alert` (`t54.js` vérifie qu'il ne reste aucune fenêtre système).
11. Tailles de texte : 11 px minimum ; 10 px seulement pour les libellés en majuscules. `--text3` doit garder un contraste d'au moins 4,5:1 sur `--bg`, `--bg2` et `--bg3`. `t54.js` le vérifie.
12. Fibres : champ `fib` facultatif (g) dans `mac100`, `macPiece`, les lignes `ings` et `macros` d'un repas. Absent = inconnu, jamais 0 par défaut. Repli : table `FIBRES_PAR_NOM` (familles, premier motif gagnant). Mon inventaire a reçu ses valeurs article par article une seule fois (`FIBRES_INVENTAIRE`, drapeau `S.fibInv`) : un champ vidé ensuite reste vide. Calcul d'un repas par `_fibRepas`, d'une journée par `getDayFibres` ; `getDayMacros` ne les compte pas. Repère fixe `FIBRES_CIBLE=30` g, hors de `TARGETS`.
13. Objectif : `_objectif()` renvoie `perte`, `maintien` ou `prise` (profil, sinon poids cible, sinon `perte`) ; `_libObjectif()` donne le libellé (Sèche, Maintien, Prise de masse). Ne pas tester l'objectif par `_enPriseDeMasse()` seul : le maintien n'est pas une sèche. Les moyennes du Bilan portent sur les journées complètes (`_jourComplet` : hors aujourd'hui, au moins 50 % de la cible). Cible du jour : `_cibleDuJour(jour)` ; en sèche l'activité ne s'ajoute pas (elle creuse le déficit), en maintien et en prise elle est à compenser (décision du 25/09/2026). Protéines « atteintes » : `_protOk` (95 % de la cible), partout.
14. Réseau du bac à sable cloud : Firebase, Groq et `github.io` sont bloqués par le proxy (vérifié le 25/09/2026). On ne peut donc pas tester en direct : simuler les réponses. `raw.githubusercontent.com` et `git clone` fonctionnent.

## 7. Ce que l'app sait faire

- Accueil : objectif du jour (barres), carte « Ta journée » (`renderCoachJour` / `coachJour` : cap le matin, point d'étape l'après-midi, bilan le soir, série de jours dans la cible ; reste, protéines, activité détaillée, prochain repas), recettes qui rentrent dans le reste.
- Ajout : bouton + flottant en bas à droite, au-dessus de la barre (`#fab-ajout` → `ouvrirMenuAjout`) : décrire, photo, code-barres, inventaire, pas et activités, pesée, et « Refaire un repas habituel » (`_repasHabituels` : 30 derniers jours, fréquence puis récence).
- Suivi : anneau calorique, marge (hors sèche) = cible + dépense − consommé, macros, tracker par jour (en tête de Recettes, avec la barre « Reste » qui reste collée sous l'en-tête quand il sort de l'écran), repas libres (texte, photo, code-barres, manuel), édition, copie vers un autre jour, repas triés par moment.
- Fibres : barre et explication (ⓘ) dans le tracker et sur l'accueil, « ≥ » quand un aliment du jour n'a pas de valeur ; champ Fibres dans la fiche article, l'ajout d'article et la fenêtre d'ajout de repas ; OpenFoodFacts (`fiber_100g`) et les invites IA les renseignent.
- Recettes : catalogue v6 (30 recettes, visible si `S.catalogue='liam'`), recettes perso et IA, favoris, cuisson avec remplacement, desserts. Illustration SVG générée pour chaque recette sans photo (`illustrationRecette`, `_composition`).
- Inventaire : catégories, DLC, unités, diagnostic, fusion de doublons. Courses : liste par rayon, scanner, complétion auto.
- Dépense : pas (seuil `pasBase()` = `S.pasBase`, fixé à l'inscription ; 9679 pour l'ancien profil `liam`, repris à la migration), activités, séances du programme de musculation (`PROGRAMME_SEANCES`, sans cardio), estimation IA avec repli MET.
- Bilan : bilan de la semaine précédente le lundi et le mardi (`renderBilanSemaine`, masquable, `S.bilanVu`), coach (tuile « Déficit/j » estimé par le TDEE, sinon « Reste » ; fibres), poids et moyenne mobile, TDEE estimé, bouton « Appliquer » la cible conseillée (TDEE − 550 ≈ −0,5 kg/semaine, baisse seulement, étapes de 300 kcal au plus, protéines et lipides gardés), calendrier du mois (`renderCalendrier`, `_etatJour` : vert ±10 % de cible + activité, orange au-dessus, bleu en dessous, pointillés sous 50 %), mensurations (`S.mesures`, en cm) et photos de progression (vignettes chargées à l'ouverture du Bilan, photos pleines seulement pour comparer, pas de copie locale : réseau requis).
- Comptes : inscription guidée (prénom, emoji, objectifs Mifflin-St Jeor, régime, matériel), modification du profil, de l'identifiant, de l'e-mail et du mot de passe, déconnexion.
- Technique : sauvegardes auto quotidiennes (`BACKUP_KEEP=14`), export/import `.json` (format 2), filet avant écrasement.

## 8. Points ouverts

- Code de rattachement et mode « profil hérité » devenus inutiles avec les nouvelles règles : à retirer proprement si je le demande.
- Tester sur iPhone la lisibilité des illustrations SVG à 52 px.
- Clé Groq partagée avec les autres comptes : en suspens (25/09/2026), on laisse chaque compte avec sa propre clé. Options étudiées : clé lisible par tous les comptes via Firebase (simple, mais récupérable par un utilisateur) ou petit serveur relais (clé cachée, usage limitable).
- Fondu en haut de l'écran sur iPhone (25/09/2026) : en-tête descendu en mode app installée et barre « Reste » sans flou ; à confirmer sur l'appareil.
