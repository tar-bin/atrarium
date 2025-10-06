// Vitest configuration for PDS integration tests (Node.js environment)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // No setupFiles - PDS tests don't need D1/KV setup
    include: ['tests/integration/pds-posting.test.ts'],
    testTimeout: 30000,
  },
});
