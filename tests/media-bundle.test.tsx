import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { MEDIA_DATASET } from '../src/data/media';
import { ACCOUNTS } from '../src/domain/model';
import { filterMediaEvents, mediaDatasetSchema } from '../src/domain/media';
import MediaAppearances from '../src/components/MediaAppearances';

afterEach(() => vi.unstubAllGlobals());
describe('Notes médias intégrées à l’application', () => {
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
