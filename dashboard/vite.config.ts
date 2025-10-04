import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    watch: {
      usePolling: true, // Enable polling for file changes in Docker/DevContainer
      interval: 1000,   // Check for changes every second
    },
    host: true, // Listen on all addresses (0.0.0.0) for DevContainer
  },
})
