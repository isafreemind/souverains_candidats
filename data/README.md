# Archives FxTwitter

Ce dossier doit rester présent et être versionné pour permettre les analyses ultérieures. Il est distinct de la projection réduite `public/data/dashboard.json` chargée par le site.

## Tweets normalisés

`tweets/<compte>/<id>.json` conserve un tweet original identifié par son ID :

| Champ | Signification |
| --- | --- |
| `text`, `url`, `handle`, `id` | Dernier contenu observé et identité |
| `publishedAt` | Date de publication UTC |
| `firstSeenAt` | Première collecte ayant observé ce tweet |
| `observedAt`, `metrics` | Dernier relevé de compteurs |
| `isQuote` | Publication accompagnée d’une citation |
| `versions[]` | Texte initial et changements ultérieurement observés |
| `observations[]` | Tous les relevés datés de vues, J’aime, reposts, réponses, citations et signets |

`null` signifie indisponible, pas zéro. Un compteur peut baisser entre deux observations. Un tweet non renvoyé lors d’une collecte reste archivé. Une absence de retour API ne permet pas de conclure qu’il a été supprimé.

## Relevés bruts

`runs/<horodatage UTC>/manifest.json` : paramètres, source, abonnés observés et rapport de couverture pour chacun des trois comptes.

`runs/<horodatage UTC>/<compte>/profile.json.gz` et `timeline-001.json.gz`, etc. : enveloppe `{ source, observedAt, response }`. Le champ `response` contient la réponse JSON brute complète reçue de FxTwitter, y compris les entrées ensuite exclues des calculs. Les fichiers sont créés une seule fois et ne sont jamais écrasés.

Lecture avec Node.js :

```js
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const payload = JSON.parse(gunzipSync(readFileSync('chemin/timeline-001.json.gz')).toString('utf8'));
console.log(payload.source, payload.observedAt, payload.response.results.length);
```

Pour les analyses par date de publication, utiliser `publishedAt`. Pour étudier la progression des compteurs, utiliser `observations[].observedAt`. Pour les abonnés, utiliser les tableaux `followers` des manifestes. Ne pas attribuer le nombre d’abonnés actuel à la date d’un ancien tweet.
