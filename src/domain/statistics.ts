import { ACCOUNTS, type FollowerSample, type Handle, type Metrics, type Post } from './model';

export type Granularity = 'day' | 'week' | 'month';
export type ChartPoint = { date: string; [handle: string]: string | number | null };
export function interactions(m: Metrics): number | null {
  const parts = [m.likes, m.reposts, m.replies, m.quotes];
  return parts.some(v => v === null) ? null : parts.reduce<number>((sum, v) => sum + (v ?? 0), 0);
}
export function engagement(m: Metrics): number | null {
  const total = interactions(m);
  return total === null || m.views === null || m.views <= 0 ? null : total / m.views * 100;
}
export function summarize(posts: Post[]) {
  const viewed = posts.filter(p => p.metrics.views !== null);
  const rated = posts.filter(p => engagement(p.metrics) !== null);
  const views = viewed.reduce((sum, p) => sum + p.metrics.views!, 0);
  const rateViews = rated.reduce((sum, p) => sum + p.metrics.views!, 0);
  return {
    count: posts.length, views, viewsCount: viewed.length, rateCount: rated.length,
    averageViews: viewed.length ? views / viewed.length : null,
    engagement: rateViews ? rated.reduce((sum, p) => sum + interactions(p.metrics)!, 0) / rateViews * 100 : null,
  };
}
// Publication buckets use UTC. Missing periods remain null, never zero.
export function bucketDate(iso: string, granularity: Granularity): string {
  const date = new Date(iso);
  date.setUTCHours(0, 0, 0, 0);
  if (granularity === 'week') date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  if (granularity === 'month') date.setUTCDate(1);
  return date.toISOString().slice(0, 10);
}
export function publicationSeries(posts: Post[], granularity: Granularity, metric: 'engagement' | 'averageViews'): ChartPoint[] {
  const groups = new Map<string, Post[]>();
  for (const post of posts) {
    const key = bucketDate(post.publishedAt, granularity);
    groups.set(key, [...(groups.get(key) ?? []), post]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({
    date, ...Object.fromEntries(ACCOUNTS.map(a => [a.handle, summarize(items.filter(p => p.handle === a.handle))[metric]])),
  }));
}
export function followerSeries(samples: FollowerSample[]): ChartPoint[] {
  // Last actual observation per UTC day; no interpolation of historical counts.
  const groups = new Map<string, Partial<Record<Handle, FollowerSample>>>();
  for (const sample of [...samples].sort((a,b) => a.observedAt.localeCompare(b.observedAt))) {
    const day = sample.observedAt.slice(0, 10);
    groups.set(day, { ...groups.get(day), [sample.handle]: sample });
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({
    date, ...Object.fromEntries(ACCOUNTS.map(a => [a.handle, items[a.handle]?.followers ?? null])),
  }));
}
