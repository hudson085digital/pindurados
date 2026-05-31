import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

// Resolvemos o alias "@" manualmente (sem o plugin ESM, que não carrega num
// projeto CommonJS).
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    dir: 'src',
  },
})
