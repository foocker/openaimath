import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const catalogVersion = createHash('sha256')
  .update(readFileSync(new URL('./public/data/catalog.json', import.meta.url)))
  .digest('hex').slice(0, 12);

export default defineConfig({
  base: './',
  define: { __CATALOG_VERSION__: JSON.stringify(catalogVersion) },
  server: { port: 5178, strictPort: true },
  preview: { port: 4178, strictPort: true },
});
