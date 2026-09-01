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
| `t22.js` | Déduction d’inventaire : défaut par profil (Non pour Maureen) |
| `t23.js` | Saisie rétroactive : le repas suit le jour affiché, bandeau d’avertissement |
| `t24.js` | Fuseau horaire par profil, conflits de synchro, appels sans définition |
| `t25.js` | Coach après saisie d’activité : message de dépense, pas de bilan alimentaire |
| `t26.js` | Libellé de quantité, emballages orphelins, jours DLC, tableaux troués Firebase |
| `t27.js` | Suggestions de rachat : écarter un article, levée automatique |
| `t28.js` | Base de saisie des macros (« valeurs pour N g ») |
| `t29.js` | Modèle multimodal Groq : migration qwen3.6 → qwen3.8 |
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
