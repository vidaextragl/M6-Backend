import type { PoolClient } from 'pg';

import type { CreateTransactionInput, TransactionRecord } from './transactions.types';

export async function createTransaction(
  client: PoolClient,
  input: CreateTransactionInput,
): Promise<TransactionRecord> {
  const result = await client.query<TransactionRecord>(
    `INSERT INTO transactions
      (wallet_id, transaction_type, from_currency, to_currency, amount_sent, amount_received, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.walletId,
      input.transactionType,
      input.fromCurrency ?? null,
      input.toCurrency ?? null,
      input.amountSent ?? null,
      input.amountReceived ?? null,
      input.status,
    ],
  );
  return result.rows[0];
}
