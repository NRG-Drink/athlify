import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['src/tests/setup.ts'],
      exclude: [...configDefaults.exclude, '**/.tsupgrader/**'],
    },
  }),
)
