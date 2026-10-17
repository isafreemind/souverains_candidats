# Stats Souverain · Observatoire

Tableau de bord React et TypeScript comparant **@f_asselineau**, **@f_philippot** et **@dupontaignan**. Interface Material UI, courbes interactives Recharts, construction Vite, publication GitHub Pages. **Toutes les données des comptes proviennent exclusivement de `api.fxtwitter.com`.** Aucun scraping de X, aucune API Twitter, aucun fournisseur de statistiques tiers, aucune donnée simulée.

## Démarrer

Node.js 24 et npm sont utilisés localement et en CI.

```powershell
npm.cmd ci
npm.cmd run dev
```

Sur macOS/Linux, employer `npm` à la place de `npm.cmd`. Ouvrir l’URL affichée par Vite. Le jeu de données public contient les vraies mesures de la première collecte.

```powershell
npm.cmd run collect
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

## Fonctionnalités

- Quatre courbes comparant l’engagement, les vues cumulées, la moyenne des vues par publication et les abonnés.
- Sélection indépendante des comptes, périodes de 7/30/90 jours ou historique complet, regroupement par jour/semaine/mois.
- Tableau des tweets, recherche textuelle, tri par date, vues ou engagement, pagination et liens vers les publications.
- Export CSV du jeu de tweets filtré par comptes et période. La recherche et le tri du tableau ne modifient pas cet export.
- Repères verticaux datés des passages médiatiques documentés, activables et filtrés par compte/période, avec notes et liens vers leurs sources.
- États sans données, erreurs de chargement, relevés anciens et couverture partielle indiqués explicitement.
- Mise en page adaptée aux mobiles, navigation au clavier, légendes et styles de ligne distincts.

## Définition des statistiques

**Engagement par vues** = `(likes + reposts + replies + quotes) / views × 100`. C’est un indicateur calculé, pas le taux interne de X, car les clics et autres interactions privées ne sont pas accessibles. Les signets ne sont pas inclus. Si un des quatre compteurs d’interactions manque, ou si les vues manquent ou valent zéro, le taux est indisponible. Une agrégation utilise le rapport des sommes sur les seuls tweets mesurables, pas la moyenne des pourcentages.

**Vues par publication** = moyenne des compteurs de vues non nuls au sens « non absents » ; une vraie valeur zéro est conservée. Les graphiques d’engagement et de vues sont regroupés selon la **date de publication en UTC**. Ils présentent les derniers compteurs cumulés observés pour ces tweets. Ils ne représentent pas les vues gagnées chaque jour. Les tweets récents ont eu moins de temps pour accumuler des vues. Le tableau exporté fournit la date de mesure propre à chaque tweet.

**Abonnés** = dernier compteur effectivement observé par compte et par jour UTC. Aucune reconstruction du passé ni interpolation. La première collecte ne fournit qu’un point par compte. Les valeurs des cartes sont les derniers relevés disponibles, indépendamment de la période de publication des tweets. La somme des abonnés des comptes ne déduplique pas leurs audiences communes.

**Périmètre** : auteur correspondant exactement à l’un des trois comptes (sans distinction de casse), `replying_to: null`, `reposted_by: null`. Les suites de fils constituant des réponses sont donc exclues, y compris les réponses à soi-même. Une classification absente ou mal formée est exclue et signalée. Les publications accompagnées d’une citation sont incluses ; seul le tweet de l’auteur suivi est compté, jamais l’objet cité. Les dates et compteurs manquants ne sont pas inventés.

**Vues cumulées dans le temps** = somme progressive, pour chaque compte, des dernières vues connues des tweets publiés jusqu’à chaque date de la période sélectionnée. Le cumul repart au début de cette période et suit le regroupement jour/semaine/mois. Il conserve le dernier total connu lorsqu’aucune nouvelle vue mesurable ne s’ajoute. Un compte sans aucune mesure reste indisponible. Les tweets aux vues inconnues sont exclus : le total peut donc être partiel. Cette courbe ne reconstitue pas les vues gagnées à chaque date ni les compteurs historiques.

## Collecte exclusivement FxTwitter

Routes v2 vérifiées sur le schéma officiel :

- `https://api.fxtwitter.com/2/profile/{handle}` pour les profils et abonnés ;
- `https://api.fxtwitter.com/2/profile/{handle}/statuses?count=100&cursor=…` pour les publications.

Le collecteur suit `cursor.bottom`, déduplique les identifiants, contrôle l’auteur, les classifications, les compteurs et les dates. Une seule publication épinglée ancienne ne suffit pas à interrompre la pagination. Il applique un délai de 400 ms entre pages, un timeout de 25 s par requête et trois tentatives. Le paramètre `count=100` n’oblige pas FxTwitter à renvoyer 100 publications : en pratique, les pages peuvent être beaucoup plus courtes.

Par défaut : **90 jours recherchés, 100 pages maximum par compte**. Ce plafond peut être atteint avant 90 jours, particulièrement pour un compte très actif. Le manifeste indique si la limite temporelle, la fin des résultats ou le plafond de pages a été atteint. L’interface précise les comptes dont la collecte reste partielle. Aucune exhaustivité n’est promise. Les publications déjà archivées restent conservées même lorsqu’elles quittent la fenêtre de collecte.

```powershell
$env:LOOKBACK_DAYS = '180'
$env:MAX_PAGES = '100'
npm.cmd run collect
```

Les valeurs autorisées vont de 1 à 3650 jours et de 1 à 200 pages. Augmenter le plafond entraîne davantage de requêtes et de volume d’archives. Une collecte ne rafraîchit que les tweets renvoyés dans sa fenêtre : les compteurs de tweets plus anciens restent à leur dernier relevé. Les baisses de compteurs sont conservées telles que renvoyées par FxTwitter.

La collecte peut être partielle. Un profil inaccessible n’empêche pas l’essai de sa timeline ; un compte défaillant n’empêche pas les autres comptes. Les données réussies sont sauvegardées, les précédentes conservées, et le script finit avec le code 2 en présence d’erreurs ou d’entrées non classifiables. Il ne marque jamais un tweet comme supprimé sur le seul fondement de son absence d’une timeline.

Documentation primaire : [API FxTwitter](https://docs.fxembed.com/api/introduction/), [schéma OpenAPI](https://api.fxtwitter.com/2/openapi.json).

## Architecture et conservation pour les analyses futures

### Passages dans les médias

`public/data/media-appearances.json` est un recensement documentaire distinct des données statistiques FxTwitter. Il couvre du 19 juillet au 17 octobre 2026 dans les dix médias audiovisuels approuvés : TF1, France 2, France 3, M6, BFMTV, CNEWS, LCI, franceinfo, France Inter et RTL. Cette sélection ne prétend pas constituer un classement d’audience commun à la télévision et à la radio.

Seules les participations effectives documentées sont retenues : entretien, débat, intervention. Une mention dans un article ou une invitation annoncée ne suffit pas. Les extraits publiés par les médias et les déclarations du compte relatant un passage déjà effectué sont distingués dans chaque note (`sourceType`). Les dates ambiguës sont écartées. Le jour civil de diffusion est conservé sans inventer d’horaire ; le repère utilise cette date sur l’axe UTC.

Les repères utilisent un axe temporel numérique : en vue hebdomadaire ou mensuelle, un passage reste à sa date réelle et n’est pas déplacé au début du groupe. Plusieurs passages le même jour partagent une ligne avec leurs numéros de note. Ils ne créent aucune mesure statistique ni interpolation. Une corrélation temporelle ne démontre pas que le passage provoque une variation.

Les recherches, exclusions et limites d’accès sont conservées dans `research_notes/Passages dans les médias/`, avec une synthèse dans `reports/Passages dans les médias.md`. Aucun résultat documenté ne signifie pas absence de passage. Le fichier canonique est validé avec Zod au démarrage de Vite et au build, puis intégré au JavaScript de l’application. Aucun chargement réseau supplémentaire n’est nécessaire pour afficher les notes ou les repères. Le JSON public reste consultable comme export documentaire. Après une modification de ce fichier, redémarrer Vite ou reconstruire le site. Cette recherche est datée, sans mise à jour automatique par les collectes FxTwitter.

```text
src/
  components/MetricChart.tsx   Courbes réutilisables
  domain/model.ts             Modèles et validation Zod
  domain/statistics.ts        Formules et regroupements purs
  App.tsx                     Tableau de bord
scripts/
  collect.ts                  Orchestration de collecte / projection publique
  lib/fxtwitter.ts            Accès à la seule API autorisée et filtrage
  lib/archive.ts              Archivage et historique des mesures
data/
  tweets/<compte>/<id>.json    Texte, versions et toutes les observations
  runs/<horodatage>/          Réponses brutes gzip et manifeste de collecte
public/data/dashboard.json    Projection légère pour le navigateur
tests/                        Tests des calculs, du filtrage et de la conservation
.github/workflows/            Collecte, sauvegarde et publication Pages
```

**Le dossier `data/` est une archive durable, à conserver et à versionner. Il n’est pas ignoré par Git.** Chaque tweet dispose d’un JSON lisible : texte complet, URL, date de publication, premier et dernier relevés, métriques, indicateur de citation, `versions[]` et `observations[]`. Chaque exécution possède ses réponses brutes datées compressées, dont les métadonnées auteur, médias, objets cités et éventuelles entrées exclues renvoyées par l’API. Ces entrées exclues sont uniquement conservées comme traces de collecte, jamais intégrées aux statistiques.

Les réponses brutes ne sont jamais écrasées. Les JSON normalisés sont mis à jour en conservant toutes leurs anciennes mesures et versions du texte. Les manifestes contiennent les compteurs d’abonnés, les paramètres et la couverture. Les changements non observés entre deux collectes ne peuvent pas être reconstruits. Les fichiers de médias ne sont pas téléchargés ; leurs métadonnées et URL restent dans les réponses brutes.

Seul `public/data/dashboard.json` est servi par le site. Les archives complètes sont conservées dans le dépôt ; leur visibilité suit celle du dépôt GitHub. Pour une analyse ultérieure, utiliser `data/tweets/` pour le contenu et les mesures par tweet, et `data/runs/*/manifest.json` pour les abonnés et la couverture. Pour contrôler un cas, décompresser les réponses brutes du relevé correspondant. Voir aussi [data/README.md](data/README.md).

## Publication sur GitHub Pages

Dépôt prévu : [isafreemind/souverains_candidats](https://github.com/isafreemind/souverains_candidats).

1. Publier les fichiers sur la branche `main` de ce dépôt.
2. Dans **Settings → Pages → Build and deployment → Source**, choisir **GitHub Actions**.
3. Le workflow **Collecte FxTwitter et GitHub Pages** construit et publie le site lors des push sur `main`.
4. La collecte automatique est prévue à **06 h 23 et 18 h 23 UTC**. Le workflow la sauvegarde dans un commit, puis publie les courbes mises à jour. Les planifications GitHub peuvent subir des retards et être désactivées après une période d’inactivité sur un dépôt public.
5. Pour lancer immédiatement une collecte : **Actions → Collecte FxTwitter et GitHub Pages → Run workflow**, case collecte activée.

URL prévue après un déploiement réussi : `https://isafreemind.github.io/souverains_candidats/`.

La base relative de Vite fonctionne aussi sous un sous-répertoire Pages et un domaine personnalisé. Le site ne nécessite ni serveur applicatif ni secret API. Les droits du workflow sont limités au dépôt pour conserver les archives et à Pages pour la publication. Un commit généré avec `GITHUB_TOKEN` ne redéclenche pas un nouveau workflow `push` ; le déploiement est donc réalisé dans la même exécution. La concurrence est sérialisée pour éviter deux écritures d’archives en parallèle. Une branche protégée doit autoriser la sauvegarde par le bot ou utiliser une politique adaptée. Les PR exécutent les tests et le build sans collecter ni publier.

En cas de collecte partielle, le workflow conserve les résultats réussis et les anciennes données, affiche un avertissement, puis publie le tableau de bord avec sa couverture visible. Vérifier périodiquement la taille du dépôt : les réponses brutes compressées et l’historique des mesures croissent avec chaque collecte.
