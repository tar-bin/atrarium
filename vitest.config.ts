// Vitest configuration for Cloudflare Workers
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/helpers/setup.ts'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          // D1 bindings
          d1Databases: ['DB'],
          // KV bindings
          kvNamespaces: ['POST_CACHE'],
        },
      },
    },
  },
});
