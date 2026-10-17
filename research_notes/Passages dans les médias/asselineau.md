# Passages de François Asselineau dans les dix médias retenus

## Quels passages sont vérifiés du 19 juillet au 17 octobre 2026 inclus ?

### Takeaway
Aucun événement suffisamment documenté pour un repère de graphique n'a été trouvé. Ce constat décrit le résultat de cette recherche, pas une preuve d'absence de passages.

### Cited Findings
- La page thématique RTL consultée présente essentiellement des archives de 2017 à 2022 ; elle ne fournit pas de passage vérifiable dans la période. [RTL](https://www.rtl.fr/sujet/francois-asselineau).
- Une interview France Inter retrouvée concerne la campagne présidentielle de 2017, pas 2026. Elle est exclue. [France Inter](https://www.radiofrance.fr/franceinter/podcasts/l-invite-de-7h50/francois-asselineau-l-euro-est-trop-faible-par-rapport-a-la-competitivite-allemande-3298397).
- Une page LCI remontée par recherche affiche une mise à jour du 24 septembre 2026 mais une publication datant de la présidentielle 2017. Elle ne prouve aucun passage en septembre 2026 ; lecture directe refusée (403). [LCI](https://www.tf1info.fr/politique/elections/presidentielle/humeur-de-campagne-4-francois-asselineau-candidat-a-l-election-presidentielle-je-n-etais-pas-fait-pour-faire-de-la-politique-upr-2029197.html).
- Le compte de l'intéressé affirme le 10 septembre être absent de BFMTV depuis deux ans et demi ; cette affirmation est une déclaration du candidat, pas un audit indépendant de la chaîne. [Publication archivée](https://x.com/f_asselineau/status/2097997159597547943), fichier local `data/tweets/f_asselineau/2097997159597547943.json`.

### Inferences
- Aucun repère ne doit être inventé pour Asselineau afin de rendre symétriques les trois courbes.
- Les déclarations de non-invitation ne permettent pas d'affirmer une absence exhaustive dans tous les médias et à toutes les dates.

### Gaps
- Les moteurs ne constituent pas des archives exhaustives de programmes. Aucun dépouillement intégral de chaque émission n'a été possible.
- Le fournisseur signale des restrictions robots pour bfmtv.com, france.tv, franceinfo.fr et radiofrance.fr. Les pages TF1 Info ciblées renvoient 403 lors de l'ouverture.

## Quels résultats ressemblants ont été exclus ?

### Takeaway
Plusieurs véritables interviews sont retrouvées mais appartiennent à des médias hors de la liste fixée. Elles ne deviennent pas des événements TF1, France 2 ou CNEWS par simple proximité éditoriale.

### Cited Findings
- TV Libertés : entretien avec Élise Blaise du 26 septembre, article UPR du 28 septembre. Hors liste ; date de l'entretien distinguée de la date de publication. [UPR](https://upr.fr/medias/francois-asselineau-invite-delise-blaise-sur-tvl-26-09-2026).
- GP-TV : entretien du 1er octobre, article UPR du 3 octobre. Hors liste. [UPR](https://upr.fr/medias/francois-asselineau-invite-de-nicolas-stoquer-sur-gp-tv-01-10-2026).
- Radio Courtoisie : entretien du 28 septembre, hors liste. [UPR](https://upr.fr/medias/francois-asselineau-invite-de-richard-de-seze-sur-radio-courtoisie-28-09-2026).
- TV Finance : entretien publié le 7 juillet 2026, hors liste et antérieur à la période. [TV Finance](https://www.tvfmedia.fr/je-suis-le-seul-candidat-a-lelection-presidentielle-en-france-itw-politique/).
- Une page UPR du 27 août discute d'un entretien de Henri Guaino sur BFMTV ; cela ne constitue pas un passage d'Asselineau. [UPR](https://upr.fr/actualites/direct-n123-francois-asselineau-repond-a-vos-questions).
- L'entretien du 8 octobre avec Xavier Moreau est diffusé par Divergence Politique, hors liste. [UPR](https://upr.fr/entretiens/entretien-entre-francois-asselineau-et-xavier-moreau-sur-divergence-politique-08-10-2026).

### Inferences
- Les republications récentes d'anciennes interviews, mentions du candidat et commentaires d'émissions d'autres invités doivent être exclus.

### Gaps
- Aucune lacune sur ces exclusions ne justifie l'ajout d'un événement dans les dix médias.

## Quelles recherches et archives ont été contrôlées ?

### Takeaway
Les dix médias ont été recherchés systématiquement, puis les 319 textes locaux du compte ont été contrôlés avec normalisation des caractères Unicode. Les 27 publications contenant des correspondances ont été relues : commentaires de tiers, liens d'actualité et déclarations d'absence ; aucune auto-déclaration de passage accompli dans la liste n'a été retenue.

### Cited Findings
- Exemple de faux positif local : le sondage du 25 septembre concerne l'intervention de Macron sur TF1 et France 2, pas celle d'Asselineau. [Tweet](https://x.com/f_asselineau/status/2103364422605402222).
- Exemple de faux positif local : la vidéo du 30 août commente l'entretien de Guaino sur BFMTV. [Tweet](https://x.com/f_asselineau/status/2094110541333901737).
- Exemple de faux positif local : le texte du 15 octobre concerne Philippe de Villiers sur CNEWS et les propres passages d'Asselineau sur d'autres chaînes. [Tweet](https://x.com/f_asselineau/status/2110762961207988379).

### Inferences
- Le fichier machine conserve donc `events: []`, avec un statut explicite `searched-no-verified-events` et une période de recherche bornée.

### Gaps
- Requêtes exécutées le 17 octobre 2026 (chaque ligne représente une requête distincte ; les filtres de date n'ont pas toujours été respectés par le moteur, d'où relecture des dates) :
  - `Asselineau TF1 France 2 France 3 M6 2026 juillet août septembre octobre interview`
  - `Asselineau BFMTV CNEWS LCI 2026 septembre octobre interview`
  - `Asselineau franceinfo France Inter RTL 2026 septembre octobre invité`
  - `site:tf1.fr Asselineau after:2026-07-18 before:2026-10-18`
  - `site:france.tv Asselineau after:2026-07-18 before:2026-10-18`
  - `site:m6.fr Asselineau 2026`
  - `site:bfmtv.com Asselineau after:2026-07-18 before:2026-10-18`
  - `site:cnews.fr Asselineau 2026`
  - `site:tf1info.fr Asselineau 2026 interview LCI`
  - `site:radiofrance.fr/franceinter Asselineau 2026`
  - `site:rtl.fr Asselineau 2026`
  - `Asselineau "France 3" "2026"`
  - `Asselineau "France 2" "2026" interview`
  - `Asselineau "franceinfo" "2026" invité`
  - `Asselineau "CNEWS" "2026" interview`
  - `site:upr.fr/medias Asselineau "2026" "BFM"`
  - `site:upr.fr/medias Asselineau "2026" "LCI"`
  - `Asselineau "M6" "juillet" "2026"`
  - `Asselineau "France 3" "septembre" "2026"`
  - `site:franceinfo.fr Asselineau invité 2026 septembre octobre`
  - `site:radiofrance.fr/franceinfo Asselineau 2026`
  - `Asselineau TF1 "2026" interview juillet août septembre octobre`
  - `Asselineau BFMTV "2026" interview juillet août septembre octobre`
  - `Asselineau LCI "août 2026"`
  - `Asselineau RTL "octobre 2026" interview`
- Couverture par média : TF1 (tf1.fr + tf1info.fr + requêtes nominales), France 2 et France 3 (france.tv + requêtes nominales séparées), M6 (m6.fr + requête nominale), BFMTV (site et requêtes nominales + UPR), CNEWS (site et requête nominale), LCI (TF1 Info + nominales + UPR), franceinfo (site TV et Radio France + nominale), France Inter (Radio France + nominale), RTL (site + requête nominale + page thématique ouverte).
- Méthode locale : lecture JSON de `data/tweets/f_asselineau/*.json`, normalisation NFKC du champ `text`, recherche insensible à la casse sur TF1, France 2, France 3, M6, BFM, CNEWS, LCI, franceinfo, France Inter et RTL ; vérification des passages entourant chaque correspondance.
