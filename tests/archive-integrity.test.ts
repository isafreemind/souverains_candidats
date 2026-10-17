import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { dashboardSchema } from '../src/domain/model';
import { archivedPostSchema } from '../scripts/lib/archive';
import { API } from '../scripts/lib/fxtwitter';

const root = resolve(import.meta.dirname, '..');
describe('Intégrité des données réellement archivées', () => {
  it('chaque tweet public possède son texte et ses relevés dans l’archive locale', () => {
    const data = dashboardSchema.parse(JSON.parse(readFileSync(resolve(root, 'public/data/dashboard.json'), 'utf8')));
    const ids = new Set<string>();
    for (const post of data.posts) {
      expect(ids.has(post.id)).toBe(false);
      ids.add(post.id);
      const archive = archivedPostSchema.parse(JSON.parse(readFileSync(resolve(root, 'data/tweets', post.handle, `${post.id}.json`), 'utf8')));
      expect(archive.text).toBe(post.text);
      expect(archive.observations.at(-1)).toEqual({ observedAt: post.observedAt, metrics: post.metrics });
      expect(archive.versions.at(-1)?.text).toBe(post.text);
      expect(archive.observations[0]?.observedAt).toBe(archive.firstSeenAt);
    }
  });
  it('les réponses brutes sont décompressables et leur provenance est exclusivement FxTwitter', () => {
    const directory = resolve(root, 'data/runs');
    for (const filename of readdirSync(directory, { recursive: true })) {
      if (typeof filename !== 'string' || !filename.endsWith('.json.gz')) continue;
      const raw = JSON.parse(gunzipSync(readFileSync(resolve(directory, filename))).toString('utf8'));
      expect(new URL(raw.source).origin).toBe(API);
      // A failed API response is also a useful immutable collection trace.
      expect(raw.response.code).toBeGreaterThanOrEqual(100);
      expect(raw.response.code).toBeLessThanOrEqual(599);
      expect(Number.isFinite(Date.parse(raw.observedAt))).toBe(true);
    }
  });
});
