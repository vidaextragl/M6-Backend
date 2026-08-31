import type { PoolClient } from 'pg';

import type { WalletRecord } from './wallets.types';

export async function createWallet(client: PoolClient, userId: string): Promise<WalletRecord> {
  const result = await client.query<WalletRecord>(
    'INSERT INTO wallets (user_id) VALUES ($1) RETURNING *',
    [userId],
  );
  return result.rows[0];
}
