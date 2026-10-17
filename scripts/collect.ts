import { readdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { gunzipSync } from 'node:zlib';
import { ACCOUNTS, coverageSchema, dashboardSchema, emptyDashboard, followerSchema, type Coverage, type FollowerSample, type Post } from '../src/domain/model';
import { archiveRaw, archivedPostSchema, mergeObservation, readJson, writeJson } from './lib/archive';
import { fetchFx, normalizePost, profileResponse, timelineResponse, API } from './lib/fxtwitter';

const root = fileURLToPath(new URL('../', import.meta.url));
function positiveSetting(name: string, fallback: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`${name} doit être un entier de 1 à ${max}.`);
  return value;
}
const maxPages = positiveSetting('MAX_PAGES', 100, 1000);
const lookbackDays = positiveSetting('LOOKBACK_DAYS', 90, 3650);
const pageSize = positiveSetting('PAGE_SIZE', 20, 100);
const resumedFromRun = process.env.RESUME_FROM_RUN;
if (resumedFromRun && !/^[0-9TZ-]+$/.test(resumedFromRun)) throw new Error('RESUME_FROM_RUN doit être un identifiant de collecte, sans chemin.');
const observedAt = new Date().toISOString();
const runId = observedAt.replace(/[:.]/g, '-');
const runDirectory = resolve(root, 'data/runs', runId);
const cutoff = Date.parse(observedAt) - lookbackDays * 86_400_000;
const manifestSchema = z.object({
  observedAt: z.iso.datetime(), source: z.literal(API), lookbackDays: z.number(), maxPages: z.number(), pageSize: z.number().optional(),
  resumedFromRun: z.string().optional(), recoveries: z.array(z.object({ handle: z.string(), reason: z.string() })).optional(),
  followers: z.array(followerSchema), coverage: z.array(coverageSchema),
});
const followers: FollowerSample[] = [];
const coverage: Coverage[] = [];
const recoveries: { handle: string; reason: string }[] = [];
const priorManifest = resumedFromRun ? manifestSchema.parse(await readJson(resolve(root, 'data/runs', resumedFromRun, 'manifest.json'))) : undefined;
async function saveManifest() {
  await writeJson(join(runDirectory, 'manifest.json'), { observedAt, source: API, lookbackDays, maxPages, pageSize, resumedFromRun, recoveries, followers, coverage });
}

for (const account of ACCOUNTS) {
  const { handle } = account;
  const priorCoverage = priorManifest?.coverage.find(c => c.handle === handle);
  if (priorCoverage?.reachedCutoff && priorManifest!.lookbackDays >= lookbackDays) {
    coverage.push({ ...priorCoverage, lookbackDays });
    console.log(`${handle}: date cible déjà atteinte dans la collecte d’origine ; rapport et archives conservés.`);
    await saveManifest();
    continue;
  }
  const report: Coverage = { handle, observedAt, lookbackDays, pages: 0, accepted: 0, excluded: 0, invalid: 0, reachedCutoff: false, exhausted: false, error: null };
  coverage.push(report);
  const errors: string[] = [];
  console.log(`${handle}: recherche sur ${lookbackDays} jours, plafond ${maxPages} pages, taille demandée ${pageSize}.`);
  try {
    const raw = await fetchFx(`/2/profile/${handle}`);
    const receivedAt = new Date().toISOString();
    await archiveRaw(join(runDirectory, handle, 'profile.json.gz'), { source: `${API}/2/profile/${handle}`, observedAt: receivedAt, response: raw });
    const profile = profileResponse.parse(raw);
    if (profile.user.screen_name.toLowerCase() !== handle) throw new Error('Le profil reçu ne correspond pas au compte demandé.');
    followers.push({ handle, followers: profile.user.followers, observedAt: receivedAt });
  } catch (error) { errors.push(`Profil : ${String(error)}`); }

  const seenPosts = new Set<string>();
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  let withReplies = false;
  let requestedPageSize = pageSize;
  try {
    if (resumedFromRun) {
      const priorDirectory = resolve(root, 'data/runs', resumedFromRun, handle);
      const files = (await readdir(priorDirectory)).filter(f => /^timeline-\d+\.json.gz$/.test(f)).sort().reverse();
      for (const file of files) {
        const saved = JSON.parse(gunzipSync(await readFile(join(priorDirectory, file))).toString('utf8'));
        const prior = timelineResponse.parse(saved.response);
        if (prior.results.length > 0 && prior.cursor.bottom) { cursor = prior.cursor.bottom; break; }
      }
      if (!cursor) throw new Error('Aucun curseur de reprise trouvé pour ce compte.');
      withReplies = true;
      console.log(`${handle}: reprise du curseur archivé via la timeline alternative ; les réponses restent exclues des statistiques.`);
    }
    for (let page = 1; page <= maxPages; page++) {
      const query = new URLSearchParams({ count: String(requestedPageSize) });
      if (cursor) query.set('cursor', cursor);
      if (withReplies) query.set('with_replies', '1');
      const path = `/2/profile/${handle}/statuses?${query}`;
      let raw: unknown;
      try { raw = await fetchFx(path); }
      catch (error) {
        if (!withReplies && String(error).includes('HTTP 404')) {
          withReplies = true;
          seenCursors.clear();
          recoveries.push({ handle, reason: `Timeline standard interrompue : ${String(error)}. Reprise alternative au même curseur.` });
          await saveManifest();
          console.log(`${handle}: reprise via la timeline alternative après HTTP 404.`);
          continue;
        }
        if (String(error).includes('HTTP 404') && requestedPageSize > 1) {
          requestedPageSize = Math.max(1, Math.floor(requestedPageSize / 2));
          seenCursors.clear();
          recoveries.push({ handle, reason: `Erreur 404 : nouvel essai au même curseur avec count=${requestedPageSize}.` });
          await saveManifest();
          console.log(`${handle}: erreur 404 ; réduction de la taille demandée à ${requestedPageSize}.`);
          continue;
        }
        throw error;
      }
      // A tweet can be published while a long collection is running.
      // Compare its date with this response's receipt, not the run's start.
      const receivedAt = new Date().toISOString();
      await archiveRaw(join(runDirectory, handle, `timeline-${String(page).padStart(3, '0')}.json.gz`), { source: `${API}${path}`, observedAt: receivedAt, response: raw });
      const timeline = timelineResponse.parse(raw);
      report.pages++;
      const pageDates: number[] = [];
      for (const item of timeline.results) {
        const { post, invalid } = normalizePost(item, handle, receivedAt);
        if (invalid) { report.invalid++; continue; }
        if (!post) { report.excluded++; continue; }
        pageDates.push(Date.parse(post.publishedAt));
        if (Date.parse(post.publishedAt) < cutoff) continue;
        if (seenPosts.has(post.id)) continue;
        seenPosts.add(post.id);
        const file = resolve(root, 'data/tweets', handle, `${post.id}.json`);
        const previous = await readJson(file);
        await writeJson(file, mergeObservation(previous === undefined ? undefined : archivedPostSchema.parse(previous), post));
        report.accepted++;
      }
      if (page % 10 === 0) {
        const oldest = pageDates.length ? new Date(Math.min(...pageDates)).toISOString().slice(0, 10) : 'aucune date classifiable';
        console.log(`${handle}: ${page} pages, ${report.accepted} publications, dernière page jusqu’au ${oldest}.`);
        await saveManifest();
      }
      // Do not stop for one old pinned tweet among recent ones.
      if (pageDates.length > 0 && pageDates.every(date => date < cutoff)) { report.reachedCutoff = true; break; }
      if (timeline.results.length === 0 && !withReplies) {
        withReplies = true;
        seenCursors.clear();
        recoveries.push({ handle, reason: 'Timeline standard vide avant la limite temporelle ; reprise alternative au dernier curseur.' });
        await saveManifest();
        console.log(`${handle}: timeline standard vide ; essai du parcours alternatif.`);
        continue;
      }
      if (timeline.results.length === 0 && requestedPageSize > 1) {
        requestedPageSize = Math.max(1, Math.floor(requestedPageSize / 2));
        seenCursors.clear();
        recoveries.push({ handle, reason: `Page alternative vide : nouvel essai au même curseur avec count=${requestedPageSize}.` });
        await saveManifest();
        console.log(`${handle}: page vide ; réduction de la taille demandée à ${requestedPageSize}.`);
        continue;
      }
      const next = timeline.cursor.bottom;
      if (!next || timeline.results.length === 0) { report.exhausted = true; break; }
      if (seenCursors.has(next)) {
        if (requestedPageSize > 1) {
          requestedPageSize = Math.max(1, Math.floor(requestedPageSize / 2));
          seenCursors.clear();
          recoveries.push({ handle, reason: `Curseur répété : nouvel essai avec count=${requestedPageSize}.` });
          await saveManifest();
          continue;
        }
        errors.push('Pagination interrompue : curseur répété.'); break;
      }
      seenCursors.add(next);
      cursor = next;
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  } catch (error) { errors.push(`Publications : ${String(error)}`); }
  report.error = errors.length ? errors.join(' ') : null;
  await saveManifest();
  console.log(`${handle}: ${report.accepted} publications, ${report.pages} pages, ${report.excluded} exclusions, ${report.invalid} non classifiables${report.error ? `; ${report.error}` : ''}`);
}

// Rebuild the public projection from the local archive, including previous runs.
// No old post or follower measurement disappears after a failed collection.
const dashboard = emptyDashboard();
dashboard.generatedAt = new Date().toISOString();
dashboard.coverage = coverage;
for (const { handle } of ACCOUNTS) {
  const directory = resolve(root, 'data/tweets', handle);
  let files: string[] = [];
  try { files = await readdir(directory); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  for (const filename of files.filter(f => /^\d+\.json$/.test(f))) {
    const archived = archivedPostSchema.parse(await readJson(join(directory, filename)));
    const { observations: _observations, versions: _versions, ...post } = archived;
    dashboard.posts.push(post satisfies Post);
  }
}
const runs = await readdir(resolve(root, 'data/runs'));
for (const run of runs.sort()) {
  const raw = await readJson(resolve(root, 'data/runs', run, 'manifest.json'));
  if (raw !== undefined) dashboard.followers.push(...manifestSchema.parse(raw).followers);
}
dashboard.posts.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
dashboard.followers.sort((a,b) => a.observedAt.localeCompare(b.observedAt));
await writeJson(resolve(root, 'public/data/dashboard.json'), dashboardSchema.parse(dashboard));
console.log(`Archive : data/ · ${dashboard.posts.length} tweets conservés · ${dashboard.followers.length} relevés d’abonnés.`);
if (coverage.some(c => c.error !== null || c.invalid > 0)) {
  console.error('Collecte partielle : consulter les manifestes. Les archives existantes sont conservées.');
  process.exitCode = 2;
}
