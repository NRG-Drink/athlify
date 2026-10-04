import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// Aspire injects this via WithReference(api); it is not VITE_-prefixed, so it
// stays server-side here instead of leaking into client bundles.
const apiOrigin = process.env['services__cs-api__http__0'] ?? 'http://localhost:5095'

export default defineConfig({
  plugins: [react(), babel({ plugins: ['relay'] }), tailwindcss()],
  server: {
    proxy: {
      '/graphql': {
        target: apiOrigin,
        changeOrigin: true,
      },
    },
  },
})
