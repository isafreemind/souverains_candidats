import { readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { ACCOUNTS, coverageSchema, dashboardSchema, emptyDashboard, followerSchema, type Coverage, type FollowerSample, type Post } from '../src/domain/model';
import { archiveRaw, archivedPostSchema, mergeObservation, readJson, writeJson } from './lib/archive';
import { fetchFx, normalizePost, profileResponse, timelineResponse, API } from './lib/fxtwitter';

const root = fileURLToPath(new URL('../', import.meta.url));
function positiveSetting(name: string, fallback: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`${name} doit être un entier de 1 à ${max}.`);
  return value;
}
const maxPages = positiveSetting('MAX_PAGES', 30, 200);
const lookbackDays = positiveSetting('LOOKBACK_DAYS', 90, 3650);
const observedAt = new Date().toISOString();
const runId = observedAt.replace(/[:.]/g, '-');
const runDirectory = resolve(root, 'data/runs', runId);
const cutoff = Date.parse(observedAt) - lookbackDays * 86_400_000;
const manifestSchema = z.object({
  observedAt: z.iso.datetime(), source: z.literal(API), lookbackDays: z.number(), maxPages: z.number(),
  followers: z.array(followerSchema), coverage: z.array(coverageSchema),
});
const followers: FollowerSample[] = [];
const coverage: Coverage[] = [];
async function saveManifest() {
  await writeJson(join(runDirectory, 'manifest.json'), { observedAt, source: API, lookbackDays, maxPages, followers, coverage });
}

for (const account of ACCOUNTS) {
  const { handle } = account;
  const report: Coverage = { handle, observedAt, pages: 0, accepted: 0, excluded: 0, invalid: 0, reachedCutoff: false, exhausted: false, error: null };
  coverage.push(report);
  const errors: string[] = [];
  try {
    const raw = await fetchFx(`/2/profile/${handle}`);
    await archiveRaw(join(runDirectory, handle, 'profile.json.gz'), { source: `${API}/2/profile/${handle}`, observedAt, response: raw });
    const profile = profileResponse.parse(raw);
    if (profile.user.screen_name.toLowerCase() !== handle) throw new Error('Le profil reçu ne correspond pas au compte demandé.');
    followers.push({ handle, followers: profile.user.followers, observedAt });
  } catch (error) { errors.push(`Profil : ${String(error)}`); }

  const seenPosts = new Set<string>();
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  try {
    for (let page = 1; page <= maxPages; page++) {
      const query = new URLSearchParams({ count: '100' });
      if (cursor) query.set('cursor', cursor);
      const path = `/2/profile/${handle}/statuses?${query}`;
      const raw = await fetchFx(path);
      await archiveRaw(join(runDirectory, handle, `timeline-${String(page).padStart(3, '0')}.json.gz`), { source: `${API}${path}`, observedAt, response: raw });
      const timeline = timelineResponse.parse(raw);
      report.pages++;
      const pageDates: number[] = [];
      for (const item of timeline.results) {
        const { post, invalid } = normalizePost(item, handle, observedAt);
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
      // Do not stop for one old pinned tweet among recent ones.
      if (pageDates.length > 0 && pageDates.every(date => date < cutoff)) { report.reachedCutoff = true; break; }
      const next = timeline.cursor.bottom;
      if (!next || timeline.results.length === 0) { report.exhausted = true; break; }
      if (seenCursors.has(next)) { errors.push('Pagination interrompue : curseur répété.'); break; }
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
dashboard.generatedAt = observedAt;
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
