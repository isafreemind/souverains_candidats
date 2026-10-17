import { ACCOUNTS, type FollowerSample, type Handle, type Post } from './model';
import { bucketDate, interactions, summarize, type ChartPoint, type Granularity } from './statistics';
import type { NumberedMediaEvent } from './media';

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function concentration(posts: Post[]) {
  const views = posts.flatMap(p => p.metrics.views === null ? [] : [p.metrics.views]).sort((a, b) => b - a);
  const topCount = Math.ceil(views.length / 10);
  const total = views.reduce((sum, value) => sum + value, 0);
  return { measured: views.length, topCount, share: total > 0 ? views.slice(0, topCount).reduce((sum, v) => sum + v, 0) / total * 100 : null };
}

// Match the time of the counters, not the publication date. Never reconstruct
// historical followers, or use a follower observation from the future.
export function viewsPerFollower(post: Post, samples: FollowerSample[]): number | null {
  if (post.metrics.views === null) return null;
  const observed = Date.parse(post.observedAt);
  const sample = samples.filter(s => s.handle === post.handle && Date.parse(s.observedAt) <= observed && observed - Date.parse(s.observedAt) <= 86_400_000)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
  return sample?.followers ? post.metrics.views / sample.followers * 100 : null;
}

export type AdvancedMetric = 'median' | 'count' | 'concentration' | 'reach';
export function advancedSeries(posts: Post[], granularity: Granularity, metric: AdvancedMetric, samples: FollowerSample[] = []): ChartPoint[] {
  const groups = new Map<string, Post[]>();
  for (const post of posts) {
    const date = bucketDate(post.publishedAt, granularity);
    groups.set(date, [...(groups.get(date) ?? []), post]);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({ date,
    ...Object.fromEntries(ACCOUNTS.map(a => {
      const accountPosts = items.filter(p => p.handle === a.handle);
      const values = accountPosts.flatMap(p => p.metrics.views === null ? [] : [p.metrics.views]);
      const ratios = accountPosts.flatMap(p => { const value = viewsPerFollower(p, samples); return value === null ? [] : [value]; });
      const value = metric === 'count' ? accountPosts.length || null
        : metric === 'median' ? median(values)
        : metric === 'concentration' ? concentration(accountPosts).share
        : ratios.length ? ratios.reduce((sum, r) => sum + r, 0) / ratios.length : null;
      return [a.handle, value];
    })),
  }));
}

export function interactionBreakdown(posts: Post[]) {
  const measured = posts.filter(p => interactions(p.metrics) !== null);
  const keys = ['likes', 'reposts', 'replies', 'quotes'] as const;
  const total = measured.reduce((sum, p) => sum + interactions(p.metrics)!, 0);
  return { measured: measured.length, total, parts: keys.map(key => {
    const count = measured.reduce((sum, p) => sum + p.metrics[key]!, 0);
    return { key, count, share: total ? count / total * 100 : null };
  }) };
}

export function weeklyFollowerGrowth(samples: FollowerSample[], metric: 'gain' | 'percent'): ChartPoint[] {
  const weeks = new Map<string, Partial<Record<Handle, FollowerSample>>>();
  for (const sample of [...samples].sort((a, b) => a.observedAt.localeCompare(b.observedAt))) {
    const date = bucketDate(sample.observedAt, 'week');
    weeks.set(date, { ...weeks.get(date), [sample.handle]: sample });
  }
  return [...weeks].sort(([a], [b]) => a.localeCompare(b)).map(([date, accounts]) => {
    const previousDate = new Date(Date.parse(date) - 7 * 86_400_000).toISOString().slice(0, 10);
    return { date, ...Object.fromEntries(ACCOUNTS.map(a => {
      const current = accounts[a.handle];
      const previous = weeks.get(previousDate)?.[a.handle];
      const gain = current && previous ? current.followers - previous.followers : null;
      return [a.handle, metric === 'gain' ? gain : gain !== null && previous?.followers ? gain / previous.followers * 100 : null];
    })) };
  });
}

export function compareMediaWindows(event: NumberedMediaEvent, posts: Post[], availableUntil: string) {
  const day = 86_400_000;
  const start = Date.parse(event.date);
  const accountPosts = posts.filter(p => p.handle === event.handle);
  // Seven full UTC days on each side; the day of the appearance is excluded.
  const before = accountPosts.filter(p => Date.parse(p.publishedAt) >= start - 7 * day && Date.parse(p.publishedAt) < start);
  const after = accountPosts.filter(p => Date.parse(p.publishedAt) >= start + day && Date.parse(p.publishedAt) < start + 8 * day);
  const earliest = Math.min(...accountPosts.map(p => Date.parse(p.publishedAt)));
  const latest = Math.max(...accountPosts.map(p => Date.parse(p.publishedAt)));
  const result = (items: Post[]) => ({ ...summarize(items), medianViews: median(items.flatMap(p => p.metrics.views === null ? [] : [p.metrics.views])) });
  return {
    before: result(before), after: result(after),
    completeWindow: earliest <= start - 7 * day && latest >= start + 7 * day && Date.parse(availableUntil) >= start + 8 * day,
  };
}
