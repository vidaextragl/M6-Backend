import type { PoolClient } from 'pg';

import { pool } from '../../database';
import type { CreateRewardInput, RewardCatalogItemRecord, RewardRecord } from './rewards.types';

export async function createRewardEntry(
  client: PoolClient,
  input: CreateRewardInput,
): Promise<RewardRecord> {
  const result = await client.query<RewardRecord>(
    `INSERT INTO rewards (user_id, transaction_id, catalog_item_id, points, source, description)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.userId,
      input.transactionId ?? null,
      input.catalogItemId ?? null,
      input.points,
      input.source,
      input.description ?? null,
    ],
  );
  return result.rows[0];
}

export async function getUserPointsBalance(userId: string): Promise<number> {
  const result = await pool.query<{ total: string }>(
    'SELECT COALESCE(SUM(points), 0) AS total FROM rewards WHERE user_id = $1',
    [userId],
  );
  return Number(result.rows[0].total);
}

// Postgres no permite `FOR UPDATE` sobre una query con función de agregación (SUM), así que para
// serializar dos canjes concurrentes del mismo usuario se lockea la fila de `users` en su lugar —
// cualquier segunda transacción que intente lo mismo espera a que la primera termine antes de
// volver a calcular el balance de puntos, evitando un doble gasto por condición de carrera.
export async function lockUserForUpdate(client: PoolClient, userId: string): Promise<void> {
  await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
}

export async function getUserPointsBalanceInTransaction(
  client: PoolClient,
  userId: string,
): Promise<number> {
  const result = await client.query<{ total: string }>(
    'SELECT COALESCE(SUM(points), 0) AS total FROM rewards WHERE user_id = $1',
    [userId],
  );
  return Number(result.rows[0].total);
}

export async function findCatalogItems(): Promise<RewardCatalogItemRecord[]> {
  const result = await pool.query<RewardCatalogItemRecord>(
    'SELECT * FROM reward_catalog_items ORDER BY cost_points',
  );
  return result.rows;
}

export async function findCatalogItemById(id: string): Promise<RewardCatalogItemRecord | null> {
  const result = await pool.query<RewardCatalogItemRecord>(
    'SELECT * FROM reward_catalog_items WHERE id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}
