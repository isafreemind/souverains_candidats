import { describe, expect, it } from 'vitest';
import { filterMediaEvents, groupMediaMarkers, mediaDatasetSchema, mediaEventSchema, type MediaEvent } from '../src/domain/media';

const event: MediaEvent = { id: 'test-event', handle: 'dupontaignan', date: '2026-10-15', outletId: 'bfmtv', title: 'Entretien', sourceUrl: 'https://www.bfmtv.com/test', sourceType: 'official-replay', dateEvidence: 'Date indiquée par le média.', evidence: 'Participation à un entretien.', verifiedAt: '2026-10-17' };
describe('Repères des passages médias', () => {
  it('respecte les comptes, les bornes inclusives et la numérotation chronologique', () => {
    const result = filterMediaEvents([
      event,
      { ...event, id: 'other-account', handle: 'f_philippot' },
      { ...event, id: 'earlier', date: '2026-10-09' },
      { ...event, id: 'outside', date: '2026-10-01' },
    ], ['dupontaignan'], '2026-10-09', '2026-10-15');
    expect(result.map(e => [e.id, e.number])).toEqual([['earlier', 1], ['test-event', 2]]);
    expect(filterMediaEvents([event], [], '2026-10-01', '2026-10-17')).toEqual([]);
  });
  it('place le repère sur la date exacte et regroupe les passages du même jour sans les perdre', () => {
    const rows = filterMediaEvents([event, { ...event, id: 'same-day', handle: 'f_philippot' }], ['dupontaignan', 'f_philippot'], '2026-10-01', '2026-10-17');
    const markers = groupMediaMarkers(rows);
    expect(markers).toHaveLength(1);
    expect(markers[0].timestamp).toBe(Date.UTC(2026, 9, 15));
    expect(markers[0].events).toHaveLength(2);
  });
  it('refuse les sources non HTTPS, les dates invalides et les médias hors sélection', () => {
    expect(mediaEventSchema.safeParse({ ...event, sourceUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(mediaEventSchema.safeParse({ ...event, date: '2026-02-30' }).success).toBe(false);
    expect(mediaEventSchema.safeParse({ ...event, outletId: 'sudradio' }).success).toBe(false);
  });
  it('refuse les identifiants dupliqués et les passages hors période recherchée', () => {
    const dataset = { schemaVersion: 1, researchedAt: '2026-10-17', period: { start: '2026-07-19', end: '2026-10-17' }, selectionBasis: 'Dix médias audiovisuels choisis.', events: [event], coverage: [] };
    expect(mediaDatasetSchema.safeParse(dataset).success).toBe(true);
    expect(mediaDatasetSchema.safeParse({ ...dataset, events: [event, event] }).success).toBe(false);
    expect(mediaDatasetSchema.safeParse({ ...dataset, events: [{ ...event, date: '2026-10-18' }] }).success).toBe(false);
  });
});
