import { ACCOUNTS, type Dashboard, type Handle } from './model';
import type { MediaDataset, MediaEvent } from './media';
import { summarize } from './statistics';
import { concentration, median } from './advanced-statistics';

const DAY = 86_400_000;
export const MIN_WINDOW_POSTS = 5;

export function mediaCounts(events: MediaEvent[], selected: Handle[], start: number, end: number) {
  return ACCOUNTS.filter(a => selected.includes(a.handle)).map(account => {
    const items = events.filter(e => e.handle === account.handle && Date.parse(e.date) >= start && Date.parse(e.date) < end);
    const confirmed = items.filter(e => e.confirmationStatus !== 'announced');
    return { ...account, count: confirmed.length,
      broadcaster: confirmed.filter(e => e.sourceType === 'official-replay').length,
      selfReported: confirmed.filter(e => e.sourceType === 'self-report').length,
      announced: items.length - confirmed.length };
  });
}

// Retain full UTC days shared by the requested interval, the media research
// and the oldest archived publication of every selected account.
export function mediaAudienceAnalysis(data: Dashboard, media: MediaDataset, selected: Handle[], since: number) {
  const accounts = ACCOUNTS.filter(a => selected.includes(a.handle));
  const firstDays = accounts.map(a => {
    const posts = data.posts.filter(p => p.handle === a.handle);
    return posts.length ? Math.ceil(Math.min(...posts.map(p => Date.parse(p.publishedAt))) / DAY) * DAY : Infinity;
  });
  const start = Math.max(Math.ceil(since / DAY) * DAY, Date.parse(media.period.start), ...firstDays);
  const end = Math.min(Math.floor(Date.parse(data.generatedAt ?? '') / DAY) * DAY, Date.parse(media.period.end) + DAY);
  if (!accounts.length || !Number.isFinite(start) || !Number.isFinite(end) || start >= end) return null;
  const days = (end - start) / DAY;
  const counts = mediaCounts(media.events, selected, start, end);
  const confirmed = media.events.filter(e => e.confirmationStatus !== 'announced');
  const rows = accounts.map(account => {
    const posts = data.posts.filter(p => p.handle === account.handle && Date.parse(p.publishedAt) >= start && Date.parse(p.publishedAt) < end);
    const summary = summarize(posts);
    const events = confirmed.filter(e => e.handle === account.handle);
    const completeWindows = events.filter(e => Date.parse(e.date) - 7 * DAY >= start && Date.parse(e.date) + 8 * DAY <= end);
    // An event within fourteen days shares the comparison period. Exclude
    // same-day interviews too; a multi-outlet sequence is not an isolated visit.
    const isolated = completeWindows.filter(e => !events.some(other => other.id !== e.id && Math.abs(Date.parse(other.date) - Date.parse(e.date)) <= 14 * DAY));
    const windows = isolated.flatMap(event => {
      const date = Date.parse(event.date);
      const before = posts.filter(p => Date.parse(p.publishedAt) >= date - 7 * DAY && Date.parse(p.publishedAt) < date);
      const after = posts.filter(p => Date.parse(p.publishedAt) >= date + DAY && Date.parse(p.publishedAt) < date + 8 * DAY);
      const beforeSummary = summarize(before), afterSummary = summarize(after);
      const beforeMedian = median(before.flatMap(p => p.metrics.views === null ? [] : [p.metrics.views]));
      const afterMedian = median(after.flatMap(p => p.metrics.views === null ? [] : [p.metrics.views]));
      if (beforeSummary.viewsCount < MIN_WINDOW_POSTS || afterSummary.viewsCount < MIN_WINDOW_POSTS || beforeMedian === null || beforeMedian <= 0 || afterMedian === null) return [];
      return [{ id: event.id, date: event.date, beforePosts: before.length, afterPosts: after.length,
        beforeMeasured: beforeSummary.viewsCount, afterMeasured: afterSummary.viewsCount,
        beforeMedian, afterMedian, medianViewsChange: (afterMedian / beforeMedian - 1) * 100,
        engagementChangePoints: beforeSummary.engagement === null || afterSummary.engagement === null ? null : afterSummary.engagement - beforeSummary.engagement }];
    });
    return { handle: account.handle, name: account.short, ...summary,
      media: counts.find(c => c.handle === account.handle)!,
      medianViews: median(posts.flatMap(p => p.metrics.views === null ? [] : [p.metrics.views])),
      postsPerWeek: posts.length / days * 7, concentration: concentration(posts).share,
      eventStudy: { fullWindows: completeWindows.length, isolatedCandidates: isolated.length, measuredWindows: windows.length,
        increases: windows.filter(w => w.medianViewsChange > 0).length,
        medianViewsChange: median(windows.map(w => w.medianViewsChange)),
        medianEngagementChangePoints: median(windows.flatMap(w => w.engagementChangePoints === null ? [] : [w.engagementChangePoints])), windows } };
  });
  return { start: new Date(start).toISOString().slice(0, 10), endExclusive: new Date(end).toISOString().slice(0, 10),
    lastDay: new Date(end - DAY).toISOString().slice(0, 10), days, minWindowPosts: MIN_WINDOW_POSTS, rows };
}

export type MediaAudienceAnalysis = NonNullable<ReturnType<typeof mediaAudienceAnalysis>>;
