import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { z } from 'zod';
import { postSchema, metricsSchema, type Post } from '../../src/domain/model';

export const archivedPostSchema = postSchema.extend({
  observations: z.array(z.object({ observedAt: z.iso.datetime(), metrics: metricsSchema })),
  versions: z.array(z.object({ observedAt: z.iso.datetime(), text: z.string() })),
});
export type ArchivedPost = z.infer<typeof archivedPostSchema>;

export async function readJson(path: string): Promise<unknown | undefined> {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}
export async function writeJson(path: string, data: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.tmp`, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await rename(`${path}.tmp`, path);
}
export async function archiveRaw(path: string, data: unknown) {
  await mkdir(dirname(path), { recursive: true });
  // Exclusive creation: a raw response is never overwritten.
  await writeFile(path, gzipSync(Buffer.from(JSON.stringify(data))), { flag: 'wx' });
}
export function mergeObservation(previous: ArchivedPost | undefined, next: Post): ArchivedPost {
  if (!previous) return { ...next, observations: [{ observedAt: next.observedAt, metrics: next.metrics }], versions: [{ observedAt: next.observedAt, text: next.text }] };
  if (previous.id !== next.id || previous.handle !== next.handle) throw new Error('Identité du tweet incohérente.');
  if (next.observedAt < previous.observedAt) throw new Error('Une observation ancienne ne peut pas remplacer la dernière mesure.');
  return {
    ...next, firstSeenAt: previous.firstSeenAt,
    observations: [...previous.observations.filter(o => o.observedAt !== next.observedAt), { observedAt: next.observedAt, metrics: next.metrics }],
    versions: previous.text === next.text ? previous.versions : [...previous.versions, { observedAt: next.observedAt, text: next.text }],
  };
}
