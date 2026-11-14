import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// Aspire injects this via WithReference(api); it is not VITE_-prefixed, so it
// stays server-side here instead of leaking into client bundles.
// The fallback must be the API (5095, see launchSettings.json), never this dev server's
// own port: a proxy that targets itself never answers, so /auth/refresh spins forever.
const injectedApiOrigin = process.env['services__cs-api__http__0']
const apiOrigin = injectedApiOrigin ?? 'http://localhost:5095'
if (injectedApiOrigin === undefined) {
  console.warn(`[vite] services__cs-api__http__0 is not set; proxying /auth and /graphql to ${apiOrigin}. Start through the AppHost to use the injected API endpoint.`)
}

export default defineConfig({
  plugins: [react(), babel({ plugins: ['relay'] }), tailwindcss()],
  server: {
    proxy: {
      '/auth': {
        target: apiOrigin,
        changeOrigin: true,
      },
      '/graphql': {
        target: apiOrigin,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    coverage: {
      provider: 'v8', // Use 'v8' for built-in coverage
      reporter: ['text', 'json', 'html'], // Formats for the coverage report
      include: ['src/**/*'], // Include files for coverage
      exclude: ['node_modules'], // Exclude specific files
    },
  },
})
