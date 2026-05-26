import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
      // Remove manualChunks to let Vite/rollup handle vendor splitting automatically.
      // Custom manualChunks previously caused module initialization ordering issues
      // that led to runtime ReferenceError and hook import failures in production.
  },
});