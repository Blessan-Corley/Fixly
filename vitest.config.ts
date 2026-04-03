// Phase 2: Added a test-only alias for Next.js server-only modules.
import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 15000,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'tests/e2e/**', 'tests/integration/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', '.next', 'tests/**', '**/*.config.*', '**/*.types.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve('.'),
      'server-only': path.resolve('./tests/mocks/server-only.ts'),
    },
  },
});
