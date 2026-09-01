import { pool } from '../../database';
import type { ExchangeRateDbRecord } from './exchange-rates.types';

export async function upsertRate(
  from: string,
  to: string,
  rate: number,
  provider: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO exchange_rates (from_currency, to_currency, rate, provider, fetched_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (from_currency, to_currency)
     DO UPDATE SET rate = EXCLUDED.rate, provider = EXCLUDED.provider, fetched_at = now()`,
    [from, to, rate, provider],
  );
}

export async function findLatestRate(
  from: string,
  to: string,
): Promise<ExchangeRateDbRecord | null> {
  const result = await pool.query<ExchangeRateDbRecord>(
    'SELECT * FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2',
    [from, to],
  );
  return result.rows[0] ?? null;
}
