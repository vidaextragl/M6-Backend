import type { PoolClient } from 'pg';

import { SUPPORTED_CURRENCIES } from '../../shared/constants';

export async function createInitialBalances(client: PoolClient, walletId: string): Promise<void> {
  for (const currency of SUPPORTED_CURRENCIES) {
    await client.query('INSERT INTO balances (wallet_id, currency, amount) VALUES ($1, $2, 0)', [
      walletId,
      currency,
    ]);
  }
}
