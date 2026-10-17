import { z } from 'zod';

export const ACCOUNTS = [
  { handle: 'f_asselineau', name: 'François Asselineau', short: 'Asselineau', initials: 'FA', color: '#5068de' },
  { handle: 'f_philippot', name: 'Florian Philippot', short: 'Philippot', initials: 'FP', color: '#159581' },
  { handle: 'dupontaignan', name: 'Nicolas Dupont-Aignan', short: 'Dupont-Aignan', initials: 'NDA', color: '#d88a36' },
] as const;
export type Handle = (typeof ACCOUNTS)[number]['handle'];
export const handleSchema = z.enum(['f_asselineau', 'f_philippot', 'dupontaignan']);
const counter = z.number().int().nonnegative().nullable();
export const metricsSchema = z.object({
  views: counter, likes: counter, reposts: counter, replies: counter, quotes: counter, bookmarks: counter,
});
export type Metrics = z.infer<typeof metricsSchema>;
export const postSchema = z.object({
  id: z.string().regex(/^\d+$/), handle: handleSchema,
  text: z.string(), url: z.string().url(), publishedAt: z.iso.datetime(),
  observedAt: z.iso.datetime(), firstSeenAt: z.iso.datetime(),
  isQuote: z.boolean(), metrics: metricsSchema,
});
export type Post = z.infer<typeof postSchema>;
export const followerSchema = z.object({ handle: handleSchema, observedAt: z.iso.datetime(), followers: z.number().int().nonnegative() });
export type FollowerSample = z.infer<typeof followerSchema>;
export const coverageSchema = z.object({
  handle: handleSchema, observedAt: z.iso.datetime(), pages: z.number(), accepted: z.number(),
  excluded: z.number(), invalid: z.number(), reachedCutoff: z.boolean(), exhausted: z.boolean(),
  error: z.string().nullable(),
});
export type Coverage = z.infer<typeof coverageSchema>;
export const dashboardSchema = z.object({
  schemaVersion: z.literal(1), generatedAt: z.iso.datetime().nullable(),
  posts: z.array(postSchema), followers: z.array(followerSchema), coverage: z.array(coverageSchema),
});
export type Dashboard = z.infer<typeof dashboardSchema>;
export const emptyDashboard = (): Dashboard => ({ schemaVersion: 1, generatedAt: null, posts: [], followers: [], coverage: [] });
