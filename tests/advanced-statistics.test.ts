import { describe, expect, it } from 'vitest';
import { advancedSeries, compareMediaWindows, concentration, interactionBreakdown, median, viewsPerFollower, weeklyFollowerGrowth } from '../src/domain/advanced-statistics';
import type { FollowerSample, Post } from '../src/domain/model';
import type { NumberedMediaEvent } from '../src/domain/media';

const post = (id: string, views: number | null, date = '2026-10-14T12:00:00.000Z'): Post => ({ id, handle: 'f_asselineau', text: '', url: `https://x.com/f_asselineau/status/${id}`, publishedAt: date, observedAt: '2026-10-17T08:00:00.000Z', firstSeenAt: '2026-10-17T08:00:00.000Z', isQuote: false, metrics: { views, likes: 10, reposts: 2, replies: 1, quotes: 1, bookmarks: null } });
const sample = (observedAt: string, followers: number): FollowerSample => ({ handle: 'f_asselineau', observedAt, followers });

describe('Analyses complémentaires', () => {
  it('calcule les médianes paires et impaires sans modifier les données', () => {
    const values = [1000, 0, 10];
    expect(median(values)).toBe(10);
    expect(median([10, 20])).toBe(15);
    expect(median([])).toBeNull();
    expect(values).toEqual([1000, 0, 10]);
  });
  it('mesure le poids du décile supérieur avec arrondi supérieur et sans valeurs inconnues', () => {
    const items = [post('1', 90), ...Array.from({ length: 10 }, (_, i) => post(String(i + 2), 1)), post('20', null)];
    expect(concentration(items)).toEqual({ measured: 11, topCount: 2, share: 91 });
    expect(concentration([post('1', 0)]).share).toBeNull();
  });
  it('sépare les comptes et conserve les valeurs inconnues dans les courbes', () => {
    const rows = advancedSeries([post('1', null), post('2', 0)], 'week', 'median');
    expect(rows[0]).toEqual({ date: '2026-10-12', f_asselineau: 0, f_philippot: null, dupontaignan: null });
    expect(advancedSeries([post('1', null)], 'week', 'count')[0].f_asselineau).toBe(1);
  });
  it('associe le compteur de vues au dernier relevé antérieur de moins de 24 heures', () => {
    const samples = [sample('2026-10-17T06:00:00.000Z', 200), sample('2026-10-17T09:00:00.000Z', 100)];
    expect(viewsPerFollower(post('1', 100), samples)).toBe(50);
    expect(viewsPerFollower(post('1', 100), [samples[1]])).toBeNull();
    expect(viewsPerFollower(post('1', 100), [sample('2026-10-15T06:00:00.000Z', 200)])).toBeNull();
    expect(viewsPerFollower(post('1', 100), [sample('2026-10-17T06:00:00.000Z', 0)])).toBeNull();
  });
  it('exclut les interactions incomplètes et conserve les zéros', () => {
    const incomplete = post('2', 100);
    incomplete.metrics.likes = null;
    const result = interactionBreakdown([post('1', 100), incomplete]);
    expect(result.measured).toBe(1);
    expect(result.total).toBe(14);
    expect(result.parts[0].share).toBeCloseTo(10 / 14 * 100);
    expect(interactionBreakdown([]).parts[0].share).toBeNull();
  });
  it('mesure les variations négatives sans franchir de semaine manquante', () => {
    const samples = [sample('2026-10-05T12:00:00.000Z', 100), sample('2026-10-11T12:00:00.000Z', 120), sample('2026-10-12T12:00:00.000Z', 108), sample('2026-10-26T12:00:00.000Z', 130)];
    expect(weeklyFollowerGrowth(samples, 'gain').map(r => r.f_asselineau)).toEqual([null, -12, null]);
    expect(weeklyFollowerGrowth(samples, 'percent')[1].f_asselineau).toBe(-10);
  });
  it('compare sept jours de chaque côté en excluant le jour du passage et les autres comptes', () => {
    const event: NumberedMediaEvent = { number: 1, id: 'test', handle: 'f_asselineau', date: '2026-10-09', outletId: 'lci', title: 'Entretien', sourceUrl: 'https://www.lci.fr/', sourceType: 'self-report', dateEvidence: 'Date déclarée', evidence: 'Entretien', verifiedAt: '2026-10-17' };
    const result = compareMediaWindows(event, [
      post('1', 10, '2026-10-02T00:00:00.000Z'),
      post('2', 20, '2026-10-08T23:59:59.000Z'),
      post('3', 999, '2026-10-09T12:00:00.000Z'),
      post('4', 100, '2026-10-10T00:00:00.000Z'),
      post('5', 200, '2026-10-16T23:59:59.000Z'),
      post('6', 999, '2026-10-17T00:00:00.000Z'),
      { ...post('7', 999, '2026-10-11T00:00:00.000Z'), handle: 'f_philippot' },
    ], '2026-10-17T08:00:00.000Z');
    expect(result.before.count).toBe(2);
    expect(result.before.medianViews).toBe(15);
    expect(result.after.count).toBe(2);
    expect(result.after.medianViews).toBe(150);
    expect(result.completeWindow).toBe(true);
    expect(compareMediaWindows({ ...event, date: '2026-10-16' }, [], '2026-10-17T08:00:00.000Z').completeWindow).toBe(false);
  });
});
