import { z } from 'zod';
import { handleSchema, type Handle } from './model';

export const MEDIA_OUTLETS = [
  { id: 'tf1', name: 'TF1' }, { id: 'france2', name: 'France 2' },
  { id: 'france3', name: 'France 3' }, { id: 'm6', name: 'M6' },
  { id: 'bfmtv', name: 'BFMTV' }, { id: 'cnews', name: 'CNEWS' },
  { id: 'lci', name: 'LCI' }, { id: 'franceinfo', name: 'franceinfo' },
  { id: 'franceinter', name: 'France Inter' }, { id: 'rtl', name: 'RTL' },
] as const;
export const outletIdSchema = z.enum(MEDIA_OUTLETS.map(o => o.id));
export const mediaEventSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), handle: handleSchema, date: z.iso.date(),
  outletId: outletIdSchema, title: z.string().min(1),
  sourceUrl: z.url().refine(url => new URL(url).protocol === 'https:', 'Une source HTTPS est requise.'),
  sourceType: z.enum(['official-replay', 'self-report']),
  confirmationStatus: z.enum(['confirmed', 'announced']).optional(),
  supportingUrls: z.array(z.url().refine(url => new URL(url).protocol === 'https:', 'Une source HTTPS est requise.')).optional(),
  dateEvidence: z.string().min(1), evidence: z.string().min(1), verifiedAt: z.iso.date(),
});
export type MediaEvent = z.infer<typeof mediaEventSchema>;
export const mediaDatasetSchema = z.object({
  schemaVersion: z.literal(1), researchedAt: z.iso.date(),
  period: z.object({ start: z.iso.date(), end: z.iso.date() }),
  selectionBasis: z.string().min(1),
  events: z.array(mediaEventSchema),
  coverage: z.array(z.object({ handle: handleSchema, outletId: outletIdSchema, status: z.enum(['checked', 'limited']), notes: z.string() })),
}).superRefine((data, ctx) => {
  const ids = new Set<string>();
  data.events.forEach((event, i) => {
    if (ids.has(event.id)) ctx.addIssue({ code: 'custom', path: ['events', i, 'id'], message: 'Identifiant de passage dupliqué.' });
    ids.add(event.id);
    if (event.date < data.period.start || event.date > data.period.end) ctx.addIssue({ code: 'custom', path: ['events', i, 'date'], message: 'Passage hors de la période recherchée.' });
  });
});
export type MediaDataset = z.infer<typeof mediaDatasetSchema>;
export type NumberedMediaEvent = MediaEvent & { number: number };
export function filterMediaEvents(events: MediaEvent[], selected: Handle[], startDate: string, endDate: string): NumberedMediaEvent[] {
  return events.filter(e => e.confirmationStatus !== 'announced' && selected.includes(e.handle) && e.date >= startDate && e.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map((event, index) => ({ ...event, number: index + 1 }));
}
export function filterMediaAnnouncements(events: MediaEvent[], selected: Handle[], startDate: string, endDate: string): MediaEvent[] {
  return events.filter(e => e.confirmationStatus === 'announced' && selected.includes(e.handle) && e.date >= startDate && e.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
export function groupMediaMarkers(events: NumberedMediaEvent[]) {
  const groups = new Map<string, NumberedMediaEvent[]>();
  for (const event of events) groups.set(event.date, [...(groups.get(event.date) ?? []), event]);
  return [...groups.entries()].map(([date, items]) => ({ date, timestamp: Date.parse(`${date}T00:00:00Z`), events: items }));
}
