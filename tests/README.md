# Tests Dorayaki

Ces fichiers ne font pas partie de l'application : ils ne sont jamais chargés par
`index.html` et le navigateur ne les voit pas. Ils vivent ici pour être rejoués
au début d'une session de développement.

## Lancer

```bash
bash tests/run.sh
```

Prérequis : `node` et `python3`, et `index.html` à la racine.

## Ce que contient chaque suite

| Fichier | Couvre |
|---|---|
| `sb.js` | Bac à sable : faux DOM, `Date` figée à midi (garde nocturne), Firebase neutralisé |
| `t2.js` | Cohérence des macros entre le sélecteur d'inventaire et le repas enregistré |
| `t3.js` | `itemMealMacros` sur tous les cas d'unité, rendu des onglets, équilibre des balises |
| `t4.js` | Entrée « Composer depuis mon inventaire », suggestions IA, déduction du stock |
| `t5.js` | Pied du sélecteur : quatre macros, formatage français |
| `t6.js` | Audit large : dates, totaux, inventaire, recettes, parsing, migration d'état |
| `t7.js` | Recettes contre l'inventaire par défaut |
| `t8.js` | Rafraîchissement du jour courant, `_burnSave` |
| `t9.js` | Synchronisation : réseau et `localStorage` simulés, récupération hors ligne, écritures concurrentes |
| `t10.js` | Filtre des journées partielles du TDEE, Réglages, filet de restauration |
| `t11.js` | Fiche article : emballage, poids par pièce, diagnostic des quantités douteuses |
| `t12.js` | Noms de repli des ingrédients : apprentissage, `resolveInv`, survie à une fusion |
| `t13.js` | Catalogue de recettes : macros, faisabilité, cloisonnement des profils |
| `t14.js` | Trieur de recettes : critères, favoris épinglés, retrait de l’onglet DLC |
| `t15.js` | Titre automatique d’un repas composé depuis l’inventaire |
| `t16.js` | Œil sur les macros, lignes estimées hors inventaire, cloisonnement du stock |
| `t17.js` | Coach : phase de la journée, suggestion de recette, ton |
| `t18.js` | Tolérance DLC par famille de produits, garde bœuf/œuf |
| `t19.js` | Zones sûres iOS : scanner sous l’encoche, stabilité de la barre basse |
| `t20.js` | Lignes d’ingrédients : débordement flexbox, bouton de suppression |
| `t21.js` | Format des calories par ingrédient (« N kcal ») |
| `t22.js` | Déduction d’inventaire à l’ajout d’un repas, démarrage sur le profil unique |
| `t23.js` | Saisie rétroactive : le repas suit le jour affiché, bandeau d’avertissement |
| `t24.js` | Fuseau horaire par profil, conflits de synchro, appels sans définition |
| `t25.js` | Coach après saisie d’activité : message de dépense, pas de bilan alimentaire |
| `t26.js` | Libellé de quantité, emballages orphelins, jours DLC, tableaux troués Firebase |
| `t27.js` | Suggestions de rachat : écarter un article, levée automatique |
| `t28.js` | Base de saisie des macros (« valeurs pour N g ») |
| `t29.js` | Modèle multimodal Groq : migration qwen3.6 → qwen3.8 |
| `t30.js` | Barre de navigation sortie du contenu re-rendu |
| `t31.js` | Fenêtre d’explication des macros : ventilation par repas + texte |
| `t32.js` | Lignes estimées : nom corrigeable, recalcul par ligne, suppression |
| `t33.js` | Modaux défilables et zones sûres, ajout d’article depuis le haut |
| `t34.js` | Fusion à l’ajout : dates de péremption, quantités, doublons |
| `t35.js` | Levée d’ambiguïté entre articles aux noms voisins |
| `t36.js` | Noms voisins dont un seul est en stock |
| `t37.js` | Confirmation de fermeture seulement après une saisie réelle |
| `t38.js` | Renommage d’un article : cohérence des références et collisions |
| `t39.js` | Mode « par pièce » : conflit d’identifiants, écrasement par l’unité |
| `t40.js` | Clés Firebase : caractères interdits, assainissement du payload |
| `t41.js` | Moments de la journée : liseré, correction après coup, icônes |
| `t42.js` | Photos de recettes : stockage séparé, vignette, ajout manuel |
| `t43.js` | Page d’accueil : ordre des repas, suggestions, activité du jour |
| `t44.js` | Cascade d’images, vérification des liens, badge de synchro |
| `t45.js` | Seuil de pas habituels : seul l’écart au-dessus de la routine compte |
| `t46.js` | Audit : neutralisation des entrées, code mort, secrets, rendu de tous les écrans |
| `t47.js` | Sauvegarde complète (état, dépense, photos) et restauration |
| `t48.js` | Comptes : connexion, session, rattachement, inscription, profil, cibles |
| `t49.js` | Séances du programme de musculation dans la saisie de dépense |
| `t52.js` | Clé Groq à la reconnexion sur un autre compte, réponse IA vide, refus du jeton de session |
| `t53.js` | Confirmation avant suppression d’un repas, service worker (délai de 6 s, erreurs serveur, hors ligne) |
| `t54.js` | Fenêtres de dialogue maison (file d’attente, texte non interprété, Échap), plus de fenêtres système, lisibilité (tailles, contraste) |
| `t55.js` | Bouton + et volet d’ajout, repas habituels, cible conseillée par étapes de 300 kcal, barre « Reste » de Recettes |
| `t56.js` | Dessert « autre » : analyse par Groq (plus d’appel Anthropic), réponse neutralisée |
| `t57.js` | Calendrier du mois : état des journées (cible, dessus, dessous, incomplète), navigation, détail d’un jour |
| `t58.js` | Mensurations (saisie, écarts, synchro) et photos de progression (chemins séparés, comparaison, export/import) |
| `t59.js` | Analyse IA d’un repas : réponse lue par extractJSON (neutralisée), réponse vide |
| `t60.js` | Fibres : table par familles, articles, recettes, repas, barre et explication, saisie (fiche, ajout, IA, OpenFoodFacts) |
| `t61.js` | Coach : trois objectifs (sèche, maintien, prise), moyennes sur journées complètes, surplus hebdomadaire, conseils TDEE par objectif |
| `t62.js` | Activité selon l’objectif (cible du jour), seuil unique des protéines (95 %), tuile Déficit/Reste, fibres dans le coach, bilan de la semaine |
| `t63.js` | Carte « Ta journée » de l’accueil : message selon le moment (cap, point d’étape, bilan), chiffres, activité |
| `t64.js` | Fibres de l’inventaire remplies une fois par article (`FIBRES_INVENTAIRE`, `S.fibInv`), bouton de déconnexion à gauche |
| `t65.js` | Inscription : étape facultative de la clé Groq (explications, format, passer l’étape, clé d’un autre compte effacée) |
| `t66.js` | Audit de clarté du 26/09 : libellés sans jargon, build dans les Réglages, export unique, couleurs de la tendance alignées sur le calendrier, pas préremplis |
| `t67.js` | Plats maison : préparation (stock déduit, parts, poids estimé, IA hors stock), manger en parts ou en grammes, jamais aux courses ni au diagnostic, retrait 3 jours après la fin |
| `t68.js` | Courses façon Rappels : cocher = panier masqué, afficher/masquer les cochés, valider (achetés dans leur rayon + À ranger), racheter en décochant, effacer, migration des anciens « Déjà achetés » |
| `t69.js` | Photo d’un repas : choix inventaire / hors inventaire avant l’appareil ; fiche article : scanner un code-barres pour importer les macros (100 g ou par pièce) |
| `t70.js` | Recettes IA et perso du compte visibles (`recetteVisible` accepte `ACTIVE_PROFILE`), catalogue d’un autre profil masqué |
| `t71.js` | Recettes IA incohérentes écartées (ingrédient non utilisé, aliment cité absent, omelette sans œufs, whey cuite, identifiant contredit par le nom), sans faux positif sur le catalogue |
| `t72.js` | Photos via Gemini (clé facultative, repli Groq, alias si modèle retiré), clé jamais exportée et effacée à la déconnexion, inscription « deux services », recettes sur gpt-oss-120b avec repli 20b |
| `t73.js` | Audit ergonomie du 03/10 : Bilan sans doublons, moyenne d'activité dès 3 jours, Courses rayon « Auto » et 🧾 dans la fiche, inventaire compact, pastille « à consommer » vers l'inventaire ; fenêtre « Quoi de neuf » une fois par appareil après chaque build |
| `t74.js` | Photo : Gemini saturé (503) → Flash-Lite avant Groq ; erreurs dans un encadré visible ; Groq « Request too large » → image réduite et renvoyée une fois ; les deux IA en échec → raison de chacune en clair (clé Gemini refusée, quota), sans identifiant d'organisation |
| `t75.js` | Pas et activités selon le poids du jour (activités IA et repli nets du repos) ; Courses 🧾 article par article (ancien réglage par rayon reporté) ; programme de séances par compte (reprise du mien une fois, neutralisé, éditeur, intensité par IA, ajout à la journée) |
| `t76.js` | Ranger les courses et « Recharger ce stock » (date limite, macros importées, unités) : article déjà en stock (même épuisé, lien `invId` ou même nom) → quantité ajoutée, macros gardées, sans doublon ; date limite ; articles au nom proche proposés ; fusion inter-catégories de même unité ; plats maison exclus |
| `t77.js` | « Presque fini » jugé par rapport au stock après le dernier rachat (`plein`, `_majPleins`) : quart restant et moins d'un emballage ; référence initiale compatible avec l'ancienne règle |
| `t78.js` | Corrections ponctuelles de mon inventaire du 04/10 (`_corrigerInventaire1004`, `S.invFix1004`) : steaks à 5 %, parmesan en double ; une seule fois, valeurs déjà modifiées respectées |
| `t79.js` | Parcours nouvel utilisateur (06/10) : poids visé → objectif du Bilan (et inversement), poids déclaré = première pesée, un seul message sans IA, « stock utilisé » à Non si l'inventaire est vide |
| `t80.js` | Nutrition : portions sèche (catalogue ≤ 700 kcal par plat, consigne IA) ; protéines par repas (repas principal < 25 g en orange, conseil < 20 g) ; journées trop basses (2 sur 3 sous 1 500 / 1 200 kcal, hors oublis de saisie) ; rappel de pesée sur l'accueil (dernière pesée ≥ 2 jours ou aucune, « Plus tard » pour la journée) ; produits très transformés (NOVA 4 d'OpenFoodFacts gardé au scan : fiche, ajout, courses → à ranger → inventaire ; badge et explication) |
| `t81.js` | Ergonomie : accroche, cibles expliquées (dépense, écart, rythme, date), « Perte de poids » hors de mon compte, écrans vides (inventaire, courses, Bilan, recettes), parcours sans IA (menu +, fenêtre d'ajout), déconnexion dans les Réglages, onglet « Repas » |
| `t82.js` | Tutoriel : 7 étapes et leurs cibles, onglets ouverts, « Passer » / « C'est parti », fin enregistrée (`tutoVu`), lancement automatique pour un compte neuf seulement, état ancien = déjà vu, relance depuis les Réglages |
| `audit.py` | Analyse statique : handlers orphelins, ids dupliqués, code mort, secrets |

## Point ouvert signalé par les tests

`t7.js` affiche une note : **32 ingrédients sur 100, répartis dans 12 recettes,
n'ont pas de champ `n`** (le nom lisible à côté de l'identifiant).

Pourquoi ça compte : `resolveInv(id, nom)` cherche d'abord par identifiant, puis
retombe sur le nom. La fusion de doublons dans l'inventaire change les
identifiants — c'est le piège connu n°7. Un ingrédient sans nom n'a donc aucun
filet : après une fusion, il devient introuvable et la recette perd
silencieusement ses macros.

Le test ne fait qu'empêcher que ce nombre augmente. Le corriger demande les vrais
noms, donc l'inventaire réel de production.

## Ce que les tests ne couvrent pas

- Le rendu visuel (le bac à sable n'a pas de moteur CSS)
- Les appels réels à Groq et à Firebase, tous deux simulés
- Le scanner de codes-barres, qui a besoin d'une caméra
- Le service worker

## Ajouter un test

Repartir de `sb.js` (`const {sb, reg, docEl} = require('./sb.js')`). Pour exposer une
fonction interne au bac à sable, l'ajouter à la liste des noms en tête de `sb.js`.
