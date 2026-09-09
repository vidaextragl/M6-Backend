import { pool } from '../../src/database';

// `reward_catalog_items` no se resetea: se siembra desde la migración 0009, no desde los tests, y
// los tests de canje de recompensas dependen de que esos ítems existan.
const TABLES_TO_RESET = ['rewards', 'transactions', 'balances', 'wallets', 'users'];

export async function resetDb(): Promise<void> {
  await pool.query(`TRUNCATE TABLE ${TABLES_TO_RESET.join(', ')} RESTART IDENTITY CASCADE`);
}
