import { defineConfig } from 'vitest/config';

// Las pruebas e2e usan una base de datos propia (creada por docker/db-init) para no tocar los datos reales.
export default defineConfig({
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? 'postgres://docunex:docunex@localhost:5432/docunex_test',
      JWT_SECRET: 'e2e-secret-e2e-secret-e2e-secret-e2e',
      STORAGE_DIR: './data/test-storage',
    },
  },
});
