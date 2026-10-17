import { describe, expect, it } from 'vitest';
import { mediaAudienceAnalysis, mediaCounts } from '../src/domain/media-audience';
import { emptyDashboard, type Dashboard, type Handle, type Post } from '../src/domain/model';
import type { MediaDataset, MediaEvent } from '../src/domain/media';

const media: MediaDataset = { schemaVersion: 1, researchedAt: '2026-11-01', period: { start: '2026-10-01', end: '2026-10-31' }, selectionBasis: 'Dix médias', events: [], coverage: [] };
const post = (id: string, handle: Handle, publishedAt: string, views: number | null = 100): Post => ({ id, handle, publishedAt, observedAt: '2026-11-01T08:00:00.000Z', firstSeenAt: '2026-11-01T08:00:00.000Z', text: '', url: `https://x.com/${handle}/status/${id}`, isQuote: false, metrics: { views, likes: 10, reposts: 2, replies: 1, quotes: 1, bookmarks: null } });
const event = (id: string, date: string, status: 'confirmed' | 'announced' = 'confirmed'): MediaEvent => ({ id, handle: 'f_asselineau', date, confirmationStatus: status, outletId: 'cnews', title: 'Entretien', sourceUrl: 'https://www.cnews.fr/', sourceType: 'official-replay', dateEvidence: 'Date indiquée', evidence: 'Entretien direct', verifiedAt: '2026-11-01' });
const dailyData = (): Dashboard => ({ ...emptyDashboard(), generatedAt: '2026-11-01T08:00:00.000Z', posts: Array.from({ length: 31 }, (_, i) => post(String(i + 1), 'f_asselineau', `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`, i + 1 === 15 ? 999 : i + 1 < 15 ? 100 : 200)) });

describe('Médias et audience', () => {
  it('compte les passages par compte et conserve le zéro, sans compter les annonces ou les dates hors filtre', () => {
    const counts = mediaCounts([event('ok', '2026-10-15'), event('ann', '2026-10-16', 'announced'), event('outside', '2026-10-01')], ['f_asselineau', 'f_philippot'], Date.parse('2026-10-10'), Date.parse('2026-10-17'));
    expect(counts.map(c => [c.handle, c.count, c.announced])).toEqual([['f_asselineau', 1, 1], ['f_philippot', 0, 0]]);
    expect(counts[0].broadcaster).toBe(1);
  });
  it('utilise les jours complets communs aux archives et exclut le jour du relevé', () => {
    const data = { ...emptyDashboard(), generatedAt: '2026-10-20T08:00:00.000Z', posts: [post('1', 'f_asselineau', '2026-10-01T12:00:00.000Z'), post('2', 'f_philippot', '2026-10-03T12:00:00.000Z'), post('3', 'dupontaignan', '2026-10-02T12:00:00.000Z'), post('4', 'f_philippot', '2026-10-20T01:00:00.000Z')] };
    const result = mediaAudienceAnalysis(data, media, ['f_asselineau', 'f_philippot', 'dupontaignan'], 0)!;
    expect([result.start, result.endExclusive, result.days]).toEqual(['2026-10-04', '2026-10-20', 16]);
    expect(result.rows.find(r => r.handle === 'f_philippot')!.count).toBe(0);
    expect(mediaAudienceAnalysis(data, media, ['f_asselineau'], Date.parse('2026-10-05T12:00:00Z'))!.start).toBe('2026-10-06');
  });
  it('ne crée aucune période commune sans données, sans compte ou avant le premier jour complet', () => {
    expect(mediaAudienceAnalysis(emptyDashboard(), media, ['f_asselineau'], 0)).toBeNull();
    expect(mediaAudienceAnalysis(dailyData(), media, [], 0)).toBeNull();
    expect(mediaAudienceAnalysis(dailyData(), media, ['f_philippot'], 0)).toBeNull();
    expect(mediaAudienceAnalysis(dailyData(), media, ['f_asselineau'], Date.parse('2026-11-02'))).toBeNull();
  });
  it('écarte les fenêtres proches à quatorze jours, y compris celles hors de la période analysable', () => {
    const result = mediaAudienceAnalysis(dailyData(), { ...media, events: [event('one', '2026-10-10'), event('two', '2026-10-24')] }, ['f_asselineau'], 0)!;
    expect(result.rows[0].eventStudy.fullWindows).toBe(2);
    expect(result.rows[0].eventStudy.measuredWindows).toBe(0);
    const boundary = mediaAudienceAnalysis(dailyData(), { ...media, events: [event('one', '2026-10-15'), event('late', '2026-10-29')] }, ['f_asselineau'], 0)!;
    expect(boundary.rows[0].eventStudy.fullWindows).toBe(1);
    expect(boundary.rows[0].eventStudy.measuredWindows).toBe(0);
    const simultaneous = mediaAudienceAnalysis(dailyData(), { ...media, events: [event('one', '2026-10-15'), { ...event('two', '2026-10-15'), outletId: 'bfmtv' }] }, ['f_asselineau'], 0)!;
    expect(simultaneous.rows[0].eventStudy.measuredWindows).toBe(0);
  });
  it('mesure les médianes avant/après sans le jour du passage, et ignore les annonces voisines', () => {
    const result = mediaAudienceAnalysis(dailyData(), { ...media, events: [event('one', '2026-10-15'), event('ann', '2026-10-17', 'announced')] }, ['f_asselineau'], 0)!;
    const study = result.rows[0].eventStudy;
    expect(study.measuredWindows).toBe(1);
    expect(study.increases).toBe(1);
    expect(study.medianViewsChange).toBe(100);
    expect(study.medianEngagementChangePoints).toBeCloseTo(-7);
    expect(study.windows[0]).toMatchObject({ beforeMedian: 100, afterMedian: 200, beforeMeasured: 7, afterMeasured: 7 });
  });
  it('exclut les fenêtres peu mesurées et les médianes initiales nulles ou égales à zéro', () => {
    const data = dailyData();
    data.posts = data.posts.map(p => ({ ...p, metrics: { ...p.metrics, views: 0 } }));
    const result = mediaAudienceAnalysis(data, { ...media, events: [event('one', '2026-10-15')] }, ['f_asselineau'], 0)!;
    expect(result.rows[0].eventStudy.measuredWindows).toBe(0);
    data.posts = dailyData().posts.filter((_, i) => i < 2 || i > 28);
    expect(mediaAudienceAnalysis(data, { ...media, events: [event('one', '2026-10-15')] }, ['f_asselineau'], 0)!.rows[0].eventStudy.measuredWindows).toBe(0);
  });
});
