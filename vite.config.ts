import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { mediaDatasetSchema } from './src/domain/media';

// Validate the canonical JSON and include it in the app: media notes never
// depend on an additional network request or a separately cached JSON response.
const mediaDataset = mediaDatasetSchema.parse(JSON.parse(readFileSync(new URL('./public/data/media-appearances.json', import.meta.url), 'utf8')));

export default defineConfig({
  plugins: [react()],
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
