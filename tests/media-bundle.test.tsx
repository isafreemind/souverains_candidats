import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { MEDIA_DATASET } from '../src/data/media';
import { ACCOUNTS } from '../src/domain/model';
import { filterMediaAnnouncements, filterMediaEvents, mediaDatasetSchema, type MediaEvent } from '../src/domain/media';
import MediaAppearances from '../src/components/MediaAppearances';

afterEach(() => vi.unstubAllGlobals());
describe('Notes médias intégrées à l’application', () => {
  it('affiche une annonce dans la liste de vérification sans créer de repère numéroté', () => {
    const event: MediaEvent = { ...MEDIA_DATASET.events[0], id: 'announced-only', confirmationStatus: 'announced' };
    const selected = ACCOUNTS.map(a => a.handle);
    const dataset = { ...MEDIA_DATASET, events: [event] };
    const events = filterMediaEvents(dataset.events, selected, dataset.period.start, dataset.period.end);
    const announcements = filterMediaAnnouncements(dataset.events, selected, dataset.period.start, dataset.period.end);
    const html = renderToStaticMarkup(<MediaAppearances dataset={dataset} events={events} announcements={announcements} selected={selected} />);
    expect(events).toHaveLength(0);
    expect(html).toContain('annonce de passage sans confirmation retrouvée');
    expect(html).not.toContain('id="media-event-announced-only"');
    expect(html).toContain('Consulter l’annonce');
  });
  it('embarque le fichier canonique réellement archivé, validé au build', () => {
    const source = JSON.parse(readFileSync(new URL('../public/data/media-appearances.json', import.meta.url), 'utf8'));
    expect(MEDIA_DATASET).toEqual(mediaDatasetSchema.parse(source));
  });
  it('affiche les notes même si tout chargement réseau échoue', () => {
    const fetcher = vi.fn(() => Promise.reject(new Error('Réseau indisponible')));
    vi.stubGlobal('fetch', fetcher);
    const selected = ACCOUNTS.map(a => a.handle);
    const events = filterMediaEvents(MEDIA_DATASET.events, selected, MEDIA_DATASET.period.start, MEDIA_DATASET.period.end);
    const html = renderToStaticMarkup(<MediaAppearances dataset={MEDIA_DATASET} events={events} selected={selected} />);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) expect(html).toContain(`id="media-event-${event.id}"`);
    expect(html).not.toContain('ne peuvent pas être chargées');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
