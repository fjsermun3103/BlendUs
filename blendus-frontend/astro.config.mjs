// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

import vercel from '@astrojs/vercel';

export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: vercel(),
  vite: {
    server: {
      // Docker on Windows: bind-mounted files emit no change events inside the container,
      // so Vite never noticed edits. Polling is enabled only there (see docker-compose.yml).
      watch: process.env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
    },
  },
});