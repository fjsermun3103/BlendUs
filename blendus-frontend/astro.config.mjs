// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

import vercel from '@astrojs/vercel';
import node from '@astrojs/node';

export default defineConfig({
  integrations: [react()],
  output: 'server',
  // Vercel by default; ASTRO_ADAPTER=node builds a standalone Node server (self-hosted demo, Dockerfile.prod)
  adapter: process.env.ASTRO_ADAPTER === 'node' ? node({ mode: 'standalone' }) : vercel(),
  vite: {
    server: {
      // Docker on Windows: bind-mounted files emit no change events inside the container,
      // so Vite never noticed edits. Polling is enabled only there (see docker-compose.yml).
      watch: process.env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
    },
  },
});