import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ACCOUNTS, dashboardSchema } from '../src/domain/model';
import { mediaDatasetSchema } from '../src/domain/media';
import { mediaAudienceAnalysis, mediaCounts } from '../src/domain/media-audience';

const dashboard = dashboardSchema.parse(JSON.parse(await readFile(new URL('../public/data/dashboard.json', import.meta.url), 'utf8')));
const media = mediaDatasetSchema.parse(JSON.parse(await readFile(new URL('../public/data/media-appearances.json', import.meta.url), 'utf8')));
const selected = ACCOUNTS.map(a => a.handle);
const start = Date.parse(media.period.start), end = Date.parse(media.period.end) + 86_400_000;
const analysis = mediaAudienceAnalysis(dashboard, media, selected, start);
if (!dashboard.generatedAt || !analysis) throw new Error('Aucune période commune analysable.');
const snapshot = {
  schemaVersion: 1, observedAt: dashboard.generatedAt,
  sources: { dashboard: 'public/data/dashboard.json', media: 'public/data/media-appearances.json' },
  mediaResearchPeriod: media.period, annualMediaCounts: mediaCounts(media.events, selected, start, end),
  comparison: analysis,
  method: {
    period: 'Jours UTC complets communs aux trois archives et à la recherche médias ; jour de collecte en cours exclu.',
    views: 'Derniers compteurs connus, par date de publication ; personnes uniques et vues gagnées par jour inconnues.',
    events: 'Participations documentées uniquement ; annonces exclues. Le recensement est non exhaustif.',
    isolation: 'Aucun autre passage documenté du même compte dans les 14 jours avant ou après, même jour inclus.',
    windows: 'Sept jours avant et sept jours après, jour du passage exclu ; au moins cinq tweets avec vues dans chaque fenêtre.',
    interpretation: 'Comparaisons descriptives ; ni effet causal ni preuve d’absence d’effet. Âge des tweets, actualités et événements manquants non contrôlés.',
  },
};
const directory = new URL('../data/analyses/', import.meta.url);
await mkdir(directory, { recursive: true });
const output = new URL(`media-audience-${dashboard.generatedAt.replaceAll(/[:.]/g, '-')}.json`, directory);
await writeFile(output, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
console.log(fileURLToPath(output));
console.log(`Comparaison : ${analysis.start} au ${analysis.lastDay} (${analysis.days} jours).`);
