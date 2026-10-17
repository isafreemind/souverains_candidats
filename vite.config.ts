import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mediaDatasetSchema } from './src/domain/media';

// Validate the canonical JSON and include it in the app: media notes never
// depend on an additional network request or a separately cached JSON response.
const mediaDatasetPath = fileURLToPath(new URL('./public/data/media-appearances.json', import.meta.url));
const mediaDataset = mediaDatasetSchema.parse(JSON.parse(readFileSync(mediaDatasetPath, 'utf8')));

export default defineConfig({
  plugins: [react(), {
    name: 'reload-media-notes',
    configureServer(server) {
      // These notes are read by the config rather than imported by a module.
      // Re-evaluate the config when they change so define never stays stale.
      server.watcher.add(mediaDatasetPath);
      server.watcher.on('change', changedPath => {
        if (changedPath === mediaDatasetPath) void server.restart();
      });
    },
  }],
  // Assets and JSON work at /, /statsSouverain/ and on custom domains.
  base: './',
  define: { __MEDIA_DATASET__: JSON.stringify(mediaDataset) },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-vendor')) return 'charts';
          if (id.includes('node_modules/@mui') || id.includes('node_modules/@emotion')) return 'ui';
        },
      },
    },
  },
});
