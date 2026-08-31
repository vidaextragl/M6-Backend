import type { PoolClient } from 'pg';

import { pool } from '../../database';
import type { WalletRecord } from './wallets.types';

export async function createWallet(client: PoolClient, userId: string): Promise<WalletRecord> {
  const result = await client.query<WalletRecord>(
    'INSERT INTO wallets (user_id) VALUES ($1) RETURNING *',
    [userId],
  );
  return result.rows[0];
}

export async function findWalletByUserId(userId: string): Promise<WalletRecord | null> {
  const result = await pool.query<WalletRecord>('SELECT * FROM wallets WHERE user_id = $1', [
    userId,
  ]);
  return result.rows[0] ?? null;
}
