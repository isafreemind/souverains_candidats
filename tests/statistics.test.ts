import { describe, expect, it } from 'vitest';
import { bucketDate, engagement, followerSeries, publicationSeries, summarize } from '../src/domain/statistics';
import type { Metrics, Post } from '../src/domain/model';

const metrics: Metrics = { views: 100, likes: 10, reposts: 2, replies: 1, quotes: 1, bookmarks: 5 };
const post = (id: string, values: Partial<Metrics> = {}): Post => ({ id, handle: 'f_asselineau', text: 'Texte', url: `https://x.com/f_asselineau/status/${id}`, publishedAt: '2026-10-14T12:00:00.000Z', observedAt: '2026-10-17T08:00:00.000Z', firstSeenAt: '2026-10-17T08:00:00.000Z', isQuote: false, metrics: { ...metrics, ...values } });
describe('Statistiques', () => {
  it('calcule un taux pondéré par les vues et exclut les signets', () => {
    expect(engagement(metrics)).toBeCloseTo(14);
    const summary = summarize([post('1'), post('2', { views: 1000, likes: 100 })]);
    expect(summary.engagement).toBeCloseTo(118 / 1100 * 100);
    expect(summary.averageViews).toBe(550);
  });
  it('ne transforme pas une mesure absente ou un dénominateur nul en zéro', () => {
    expect(engagement({ ...metrics, views: 0 })).toBeNull();
    expect(engagement({ ...metrics, likes: null })).toBeNull();
    const summary = summarize([post('1'), post('2', { views: null }), post('3', { likes: null, views: 200 })]);
    expect(summary.viewsCount).toBe(2);
    expect(summary.rateCount).toBe(1);
    expect(summary.engagement).toBeCloseTo(14);
    expect(summary.averageViews).toBe(150);
    expect(summarize([]).engagement).toBeNull();
  });
  it('regroupe les semaines à partir du lundi en UTC, y compris à cheval sur une année', () => {
    expect(bucketDate('2026-01-01T23:00:00.000Z', 'week')).toBe('2025-12-29');
    expect(bucketDate('2026-10-14T23:30:00.000Z', 'month')).toBe('2026-10-01');
  });
  it('conserve un trou pour un compte sans publication, sans inventer de point', () => {
    const rows = publicationSeries([post('1')], 'day', 'averageViews');
    expect(rows[0].f_asselineau).toBe(100);
    expect(rows[0].f_philippot).toBeNull();
    expect(rows).toHaveLength(1);
  });
  it('retient le dernier relevé quotidien réel des abonnés, sans remplir les autres comptes', () => {
    const result = followerSeries([
      { handle: 'f_asselineau', observedAt: '2026-10-17T18:00:00.000Z', followers: 102 },
      { handle: 'f_asselineau', observedAt: '2026-10-17T06:00:00.000Z', followers: 100 },
    ]);
    expect(result).toEqual([{ date: '2026-10-17', f_asselineau: 102, f_philippot: null, dupontaignan: null }]);
  });
});
