import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import { runner } from 'node-pg-migrate';
import { Client } from 'pg';

// `globalSetup` corre en su propio contexto, separado de los archivos de test — se recarga el
// dotenv acá por las dudas, en vez de asumir que hereda el `process.env` que ya seteó
// `vitest.config.ts`.
dotenv.config({ path: '.env.test' });
if (existsSync('.env.test.local')) {
  dotenv.config({ path: '.env.test.local', override: true });
}

async function ensureDatabaseExists(databaseUrl: string): Promise<void> {
  const url = new URL(databaseUrl);
  const dbName = url.pathname.replace(/^\//, '');

  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();

  try {
    const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (result.rowCount === 0) {
      // No se puede parametrizar el nombre de la base en CREATE DATABASE (no es una query normal);
      // sale siempre del DATABASE_URL de .env.test/.env.test.local, nunca de un input externo.
      await client.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await client.end();
  }
}

export default async function globalSetup(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set — check .env.test / .env.test.local');
  }

  await ensureDatabaseExists(databaseUrl);

  await runner({
    databaseUrl,
    dir: 'src/database/migrations',
    direction: 'up',
    ignorePattern: '^(\\..*|index\\.ts)$',
    migrationsTable: 'pgmigrations',
  });
}
