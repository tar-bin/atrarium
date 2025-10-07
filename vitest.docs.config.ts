import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/docs/**/*.test.ts'],
    globals: true,
    environment: 'node',
  },
});
