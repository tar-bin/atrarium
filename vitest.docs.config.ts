import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/docs-site/**/*.test.ts'],
    globals: true,
    environment: 'node',
  },
})
