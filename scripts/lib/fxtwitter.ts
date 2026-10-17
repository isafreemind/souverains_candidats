import { z } from 'zod';
import { metricsSchema, type Handle, type Post } from '../../src/domain/model';

export const API = 'https://api.fxtwitter.com';
const optionalCounter = z.number().int().nonnegative().nullish().transform(v => v ?? null);
const rawPostSchema = z.object({
  type: z.literal('status'), id: z.string().regex(/^\d+$/), text: z.string(),
  created_timestamp: z.number().nonnegative(), author: z.object({ screen_name: z.string() }),
  // These two explicit fields are mandatory: unknown classification is excluded.
  replying_to: z.union([z.null(), z.object({}).passthrough()]),
  reposted_by: z.union([z.null(), z.object({}).passthrough()]),
  views: optionalCounter, likes: optionalCounter, reposts: optionalCounter,
  replies: optionalCounter, quotes: optionalCounter, bookmarks: optionalCounter,
  quote: z.unknown().optional(),
}).passthrough();

export function normalizePost(input: unknown, handle: Handle, observedAt: string): { post: Post | null; invalid: boolean } {
  const result = rawPostSchema.safeParse(input);
  if (!result.success) return { post: null, invalid: true };
  const raw = result.data;
  if (raw.author.screen_name.toLowerCase() !== handle || raw.replying_to !== null || raw.reposted_by !== null) {
    return { post: null, invalid: false };
  }
  const timestamp = raw.created_timestamp * 1000;
  if (!Number.isFinite(timestamp) || timestamp > Date.parse(observedAt) || timestamp < Date.UTC(2006, 0)) return { post: null, invalid: true };
  return { invalid: false, post: {
    id: raw.id, handle, text: raw.text, url: `https://x.com/${handle}/status/${raw.id}`,
    publishedAt: new Date(timestamp).toISOString(), observedAt, firstSeenAt: observedAt,
    isQuote: raw.quote != null,
    metrics: metricsSchema.parse({ views: raw.views, likes: raw.likes, reposts: raw.reposts, replies: raw.replies, quotes: raw.quotes, bookmarks: raw.bookmarks }),
  } };
}

export const profileResponse = z.object({ code: z.literal(200), user: z.object({ screen_name: z.string(), followers: z.number().int().nonnegative() }).passthrough() });
export const timelineResponse = z.object({
  code: z.literal(200), results: z.array(z.unknown()),
  cursor: z.object({ bottom: z.string().nullable(), top: z.string().nullable().optional() }),
});

export async function fetchFx(path: string, fetcher: typeof fetch = fetch): Promise<unknown> {
  const url = new URL(path, API);
  if (url.origin !== API) throw new Error('Source refusée : seul api.fxtwitter.com est autorisé.');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(25_000), headers: { Accept: 'application/json', 'User-Agent': 'StatsSouverain/1.0' } });
      if (!response.ok) throw new Error(`FxTwitter HTTP ${response.status}`);
      const body: unknown = await response.json();
      if (typeof body !== 'object' || body === null || !('code' in body) || body.code !== 200) throw new Error('Réponse FxTwitter indisponible (code API différent de 200).');
      return body;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
  throw new Error('FxTwitter indisponible.');
}
