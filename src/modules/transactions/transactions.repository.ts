import type { PoolClient } from 'pg';

import { pool } from '../../database';
import type { CreateTransactionInput, ListTransactionsFilters, TransactionRecord } from './transactions.types';

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

export async function findTransactionsByWallet(
  walletId: string,
  filters: ListTransactionsFilters,
): Promise<{ transactions: TransactionRecord[]; total: number }> {
  const conditions: string[] = ['wallet_id = $1'];
  const values: unknown[] = [walletId];
  let index = 2;

  if (filters.type) {
    conditions.push(`transaction_type = $${index++}`);
    values.push(filters.type);
  }

  if (filters.currency) {
    conditions.push(`(from_currency = $${index} OR to_currency = $${index})`);
    values.push(filters.currency);
    index++;
  }

  if (filters.status) {
    conditions.push(`status = $${index++}`);
    values.push(filters.status);
  }

  if (filters.from) {
    conditions.push(`created_at >= $${index++}`);
    values.push(filters.from);
  }

  if (filters.to) {
    conditions.push(`created_at <= $${index++}`);
    values.push(filters.to);
  }

  const whereClause = conditions.join(' AND ');
  const limitIndex = index;
  const offsetIndex = index + 1;
  values.push(filters.limit, filters.offset);

  const result = await pool.query<TransactionRecord & { total_count: string }>(
    `SELECT *, COUNT(*) OVER() AS total_count
     FROM transactions
     WHERE ${whereClause}
     ORDER BY created_at DESC, id DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values,
  );

  const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
  const transactions = result.rows.map(({ total_count: _totalCount, ...rest }) => rest);

  return { transactions, total };
}
