import type { PoolClient } from 'pg';

import { pool } from '../../database';
import type { UserRecord } from './users.types';

export async function createUser(
  client: PoolClient,
  email: string,
  name: string,
  passwordHash: string,
): Promise<UserRecord> {
  const result = await client.query<UserRecord>(
    'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
    [email, name, passwordHash],
  );
  return result.rows[0];
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] ?? null;
}
