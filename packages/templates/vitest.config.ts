import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Como en la web: los paquetes del monorepo se consumen desde su código fuente.
  resolve: { conditions: ['source'] },
  ssr: { resolve: { conditions: ['source'] } },
  test: { testTimeout: 30_000 },
});
