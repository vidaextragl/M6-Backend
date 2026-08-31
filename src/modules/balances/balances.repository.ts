import type { PoolClient } from 'pg';

import { pool } from '../../database';
import { SUPPORTED_CURRENCIES } from '../../shared/constants';
import type { BalanceRecord } from './balances.types';

export async function createInitialBalances(client: PoolClient, walletId: string): Promise<void> {
  for (const currency of SUPPORTED_CURRENCIES) {
    await client.query('INSERT INTO balances (wallet_id, currency, amount) VALUES ($1, $2, 0)', [
      walletId,
      currency,
    ]);
  }
}

export async function findBalancesByWallet(walletId: string): Promise<BalanceRecord[]> {
  const result = await pool.query<BalanceRecord>(
    'SELECT * FROM balances WHERE wallet_id = $1 ORDER BY currency',
    [walletId],
  );
  return result.rows;
}

export async function depositBalance(
  client: PoolClient,
  walletId: string,
  currency: string,
  amount: string,
): Promise<BalanceRecord> {
  const result = await client.query<BalanceRecord>(
    `UPDATE balances SET amount = amount + $1, updated_at = now()
     WHERE wallet_id = $2 AND currency = $3
     RETURNING *`,
    [amount, walletId, currency],
  );
  return result.rows[0];
}

export async function withdrawBalance(
  client: PoolClient,
  walletId: string,
  currency: string,
  amount: string,
): Promise<BalanceRecord | null> {
  const result = await client.query<BalanceRecord>(
    `UPDATE balances SET amount = amount - $1, updated_at = now()
     WHERE wallet_id = $2 AND currency = $3 AND amount >= $1
     RETURNING *`,
    [amount, walletId, currency],
  );
  return result.rows[0] ?? null;
}
