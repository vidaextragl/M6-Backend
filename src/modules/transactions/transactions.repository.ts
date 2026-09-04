import type { PoolClient } from 'pg';

import { pool } from '../../database';
import type {
  CreateTransactionInput,
  ListTransactionsFilters,
  TransactionRecord,
  TransactionType,
} from './transactions.types';

export async function createTransaction(
  client: PoolClient,
  input: CreateTransactionInput,
): Promise<TransactionRecord> {
  const result = await client.query<TransactionRecord>(
    `INSERT INTO transactions
      (wallet_id, transaction_type, from_currency, to_currency, amount_sent, amount_received, exchange_rate, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.walletId,
      input.transactionType,
      input.fromCurrency ?? null,
      input.toCurrency ?? null,
      input.amountSent ?? null,
      input.amountReceived ?? null,
      input.exchangeRate ?? null,
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

// Reconstruye "cuánto había de cada moneda" en un momento pasado sumando/restando los movimientos
// reales ocurridos desde entonces — no hay una tabla de snapshots históricos, así que se calcula
// a partir del ledger de transacciones (fuente de verdad) en vez de inventar el dato.
export async function getNetChangeByCurrencySince(
  walletId: string,
  since: Date,
): Promise<Record<string, number>> {
  const result = await pool.query<{ currency: string; net: string }>(
    `SELECT currency, SUM(delta) AS net FROM (
       SELECT to_currency AS currency, amount_received AS delta
         FROM transactions
        WHERE wallet_id = $1 AND created_at >= $2 AND status = 'COMPLETED' AND to_currency IS NOT NULL
       UNION ALL
       SELECT from_currency AS currency, -amount_sent AS delta
         FROM transactions
        WHERE wallet_id = $1 AND created_at >= $2 AND status = 'COMPLETED' AND from_currency IS NOT NULL
     ) net_changes
     GROUP BY currency`,
    [walletId, since],
  );

  return Object.fromEntries(result.rows.map((row) => [row.currency, Number(row.net)]));
}

export async function sumTransactionAmountsByCurrency(
  walletId: string,
  type: TransactionType,
  since?: Date,
): Promise<Record<string, number>> {
  const values: unknown[] = [walletId, type];
  let whereClause = "wallet_id = $1 AND transaction_type = $2 AND status = 'COMPLETED'";

  if (since) {
    values.push(since);
    whereClause += ` AND created_at >= $${values.length}`;
  }

  const result = await pool.query<{ to_currency: string; total: string }>(
    `SELECT to_currency, SUM(amount_received) AS total
     FROM transactions
     WHERE ${whereClause}
     GROUP BY to_currency`,
    values,
  );

  return Object.fromEntries(result.rows.map((row) => [row.to_currency, Number(row.total)]));
}
