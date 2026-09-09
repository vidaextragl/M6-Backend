import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

// `.env.test` trae valores genéricos/dummy y se commitea; `.env.test.local` (ignorado por git) es
// para overridear el `DATABASE_URL` si el Postgres local usa otro usuario/password. Se cargan acá,
// antes de que Vitest levante los procesos de test, para que `src/config/env.config.ts` (que lee
// `process.env` al importarse) vea los valores correctos.
dotenv.config({ path: '.env.test' });
if (existsSync('.env.test.local')) {
  dotenv.config({ path: '.env.test.local', override: true });
}

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './tests/global-setup.ts',
    testTimeout: 15000,
    // Todos los tests de integración pegan contra la misma DB de test y la resetean en
    // `beforeEach`. Con archivos corriendo en paralelo (default de Vitest), un archivo trunca las
    // tablas mientras otro está en medio de una aserción — flakiness intermitente. Se serializa
    // corriendo todo en un solo fork.
    fileParallelism: false,
  },
});
