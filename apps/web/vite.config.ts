import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Los paquetes del monorepo se consumen desde su código fuente (condición `source`).
    conditions: ['source', ...defaultClientConditions],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
