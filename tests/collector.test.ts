import { describe, expect, it } from 'vitest';
import { fetchFx, normalizePost, retryAfterMilliseconds } from '../scripts/lib/fxtwitter';
import { mergeObservation } from '../scripts/lib/archive';

const observedAt = '2026-10-17T08:00:00.000Z';
const raw = { type: 'status', id: '2110866925698130204', text: 'Une publication.', author: { screen_name: 'f_asselineau' }, created_timestamp: 1792104867, replying_to: null, reposted_by: null, views: 100, likes: 10, reposts: 2, replies: 1, quotes: 1 };
describe('Collecte et archives', () => {
  it('respecte les deux formats Retry-After et ignore les indications invalides ou passées', () => {
    const now = Date.UTC(2026, 9, 17, 8, 0, 0);
    expect(retryAfterMilliseconds('30', now)).toBe(30_000);
    expect(retryAfterMilliseconds('Sat, 17 Oct 2026 08:01:00 GMT', now)).toBe(60_000);
    expect(retryAfterMilliseconds('Sat, 17 Oct 2026 07:59:00 GMT', now)).toBe(0);
    expect(retryAfterMilliseconds(null, now)).toBe(0);
    expect(retryAfterMilliseconds('invalide', now)).toBe(0);
  });
  it('accepte seulement un tweet de l’auteur attendu sans réponse ni repost', () => {
    expect(normalizePost(raw, 'f_asselineau', observedAt).post).not.toBeNull();
    expect(normalizePost({ ...raw, author: { screen_name: 'autre' } }, 'f_asselineau', observedAt).post).toBeNull();
    expect(normalizePost({ ...raw, replying_to: { status: '123' } }, 'f_asselineau', observedAt).post).toBeNull();
    expect(normalizePost({ ...raw, reposted_by: { screen_name: 'f_asselineau' } }, 'f_asselineau', observedAt).post).toBeNull();
  });
  it('rejette les entrées non classifiables et les dates futures', () => {
    expect(normalizePost({ ...raw, replying_to: undefined }, 'f_asselineau', observedAt).invalid).toBe(true);
    expect(normalizePost({ ...raw, created_timestamp: 9e12 }, 'f_asselineau', observedAt).invalid).toBe(true);
    expect(normalizePost({ type: 'tombstone' }, 'f_asselineau', observedAt).invalid).toBe(true);
  });
  it('garde la publication citante et ne prend pas les compteurs du tweet cité', () => {
    const result = normalizePost({ ...raw, quote: { views: 9999, author: { screen_name: 'autre' } } }, 'f_asselineau', observedAt);
    expect(result.post?.isQuote).toBe(true);
    expect(result.post?.metrics.views).toBe(100);
  });
  it('préserve les anciennes mesures et versions du texte même si un compteur baisse', () => {
    const first = normalizePost(raw, 'f_asselineau', observedAt).post!;
    const archive = mergeObservation(undefined, first);
    const next = { ...first, text: 'Texte corrigé.', observedAt: '2026-10-18T08:00:00.000Z', metrics: { ...first.metrics, views: 90 } };
    const updated = mergeObservation(archive, next);
    expect(updated.firstSeenAt).toBe(observedAt);
    expect(updated.observations.map(o => o.metrics.views)).toEqual([100, 90]);
    expect(updated.versions.map(v => v.text)).toEqual(['Une publication.', 'Texte corrigé.']);
    expect(mergeObservation(updated, next).observations).toHaveLength(2);
    expect(() => mergeObservation(updated, first)).toThrow();
  });
  it('ne contacte aucune autre source que FxTwitter', async () => {
    await expect(fetchFx('https://example.com')).rejects.toThrow('seul api.fxtwitter.com');
  });
  it('vérifie aussi le code API même avec HTTP 200', async () => {
    const fetcher = (async () => new Response(JSON.stringify({ code: 200, results: [] }))) as typeof fetch;
    expect(await fetchFx('/2/profile/f_asselineau/statuses', fetcher)).toEqual({ code: 200, results: [] });
  });
});
